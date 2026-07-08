/* global React, ReactDOM, Icon, fmt, NAV_URLS, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const PER_POINT = 10000;
const STORE_ADDR = "S2.03 KĐT Văn Phú, P. Phú La, Hà Đông, Hà Nội";

/* LIVE mode: dữ liệu thật từ server; fallback dữ liệu demo khi mở tĩnh */
const LIVE_OH = !!window.ORDER_HISTORY_DATA;
const REORDER_KEY = "laboong_reorder";

const FLOW = ["new", "making", "ready", "done"];
const STEP_META = [
  { key: "new", label: "Xác nhận", ic: "check" },
  { key: "making", label: "Đang pha", ic: "flame" },
  { key: "ready", label: "Sẵn sàng", ic: "bag" },
  { key: "done", label: "Hoàn tất", ic: "truck" },
];
const STATUS = {
  new:    { label: "Chờ xác nhận", cls: "making" },
  making: { label: "Đang pha", cls: "making" },
  ready:  { label: "Sẵn sàng", cls: "ready" },
  done:   { label: "Hoàn tất", cls: "done" },
  cancel: { label: "Đã huỷ", cls: "cancel" },
};
const ACTIVE_STATUSES = ["new", "making", "ready"];
const GRADS = ["linear-gradient(150deg,#6B4A2B,#9B7150)", "linear-gradient(150deg,#0F623F,#1AA86A)", "linear-gradient(150deg,#FF8A3D,#FFB85C)", "linear-gradient(150deg,#F2598A,#FF8FB3)", "linear-gradient(150deg,#1E8FA8,#4FC3D9)"];

function mk(code, daysAgo, status, store, type, items, discount) {
  const sub = items.reduce((s, it) => s + it.unit * it.qty, 0);
  const total = sub - (discount || 0);
  return { code, daysAgo, status, store, type, items, discount: discount || 0, sub, total, points: Math.floor(total / PER_POINT), grad: GRADS[code.charCodeAt(4) % GRADS.length] };
}

const DEMO_ORDERS = [
  mk("LB-2418", 0, "making", "Victoria Văn Phú", "ship",
    [{ name: "Trà sữa trân châu đường đen", opt: "Size L · Đường 70% · Đá 70% · Trân châu", unit: 53000, qty: 2 }, { name: "Macchiato kem phô mai", opt: "Size M · Đường 50%", unit: 48000, qty: 1 }], 0),
  mk("LB-2402", 0, "done", "Victoria Văn Phú", "pickup",
    [{ name: "Trà đào cam sả", opt: "Size L · ít đá", unit: 39000, qty: 2 }], 30000),
  mk("LB-2371", 2, "done", "Royal City", "ship",
    [{ name: "Combo 3 ly trà sữa", opt: "Mix vị", unit: 120000, qty: 1 }], 0),
  mk("LB-2355", 4, "done", "Victoria Văn Phú", "pickup",
    [{ name: "Cà phê muối", opt: "Size M", unit: 35000, qty: 1 }, { name: "Hồng trà sữa", opt: "Size L · Đường 30%", unit: 46000, qty: 1 }], 0),
  mk("LB-2310", 9, "done", "Times City", "ship",
    [{ name: "Sữa tươi trân châu đường đen", opt: "Size L", unit: 56000, qty: 2 }], 50000),
  mk("LB-2287", 16, "cancel", "Aeon Hà Đông", "pickup",
    [{ name: "Đá xay socola", opt: "Size L", unit: 52000, qty: 1 }], 0),
  mk("LB-2240", 33, "done", "Victoria Văn Phú", "ship",
    [{ name: "Trà sữa khoai môn", opt: "Size M · Đường 50%", unit: 42000, qty: 3 }], 0),
];

const ORDERS = LIVE_OH
  ? (window.ORDER_HISTORY_DATA.orders || []).map(o => ({
      ...o,
      grad: GRADS[o.code.charCodeAt(4) % GRADS.length],
    }))
  : DEMO_ORDERS;

const FILTERS = [{ key: "all", label: "Tất cả" }, { key: "active", label: "Đang xử lý" }, { key: "done", label: "Hoàn tất" }, { key: "cancel", label: "Đã huỷ" }];

function dayKey(d) { if (d === 0) return "Hôm nay"; if (d === 1) return "Hôm qua"; if (d < 7) return `${d} ngày trước`; if (d < 30) return `${Math.floor(d / 7)} tuần trước`; return "Trước đó"; }
function itemSummary(o) { const first = o.items[0]; const more = o.items.length - 1; return { first: `${first.qty}× ${first.name}`, more }; }

/* Đếm ngược theo 2 giai đoạn TÁCH RIÊNG (kiểu ShopeeFood):
   - Đang pha  → đếm ngược đến prepEtaAt (thời gian pha chế)
   - Đang giao → đếm ngược đến etaAt (pha chế + giao hàng)
   Đồng hồ chỉ bắt đầu khi quán bấm Xác nhận (mốc tính từ confirmed_at). */
function fmtCountdown(remainMs) {
  const m = Math.floor(remainMs / 60000);
  const s = Math.floor((remainMs % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function etaInfo(o, now) {
  if (o.status === "new") {
    return { e: "Chờ nhận đơn", el: "quán sắp xác nhận", small: true };
  }

  if (o.status === "ready") {
    if (o.type !== "ship") return { e: "Sẵn sàng", el: "đến quầy nhận ngay", small: true };
    // Đang giao: đếm ngược riêng phần giao hàng
    if (o.etaAt) {
      const remain = new Date(o.etaAt).getTime() - now;
      if (remain > 0) return { e: fmtCountdown(remain), el: "đang giao — dự kiến đến" };
    }
    return { e: "Sắp đến nơi", el: "đơn đang trên đường", small: true };
  }

  // Đang pha: đếm ngược riêng phần pha chế
  if (!o.prepEtaAt && !o.etaAt) {
    return LIVE_OH
      ? { e: "Đang pha", el: "quán đang chuẩn bị", small: true } // đơn cũ chưa có mốc xác nhận
      : { e: "~12'", el: "dự kiến xong" }; // demo fallback
  }
  const target = o.prepEtaAt || o.etaAt;
  const remain = new Date(target).getTime() - now;
  if (remain <= 0) return { e: "Sắp xong", el: "pha chế sắp hoàn tất", small: true };
  return { e: fmtCountdown(remain), el: "pha chế xong sau" };
}

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") setSel(null); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  const live = ORDERS.find(o => ACTIVE_STATUSES.includes(o.status));

  /* tick mỗi giây để đồng hồ đếm ngược chạy mượt (cả pha chế lẫn giao hàng) */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live || !(live.prepEtaAt || live.etaAt)) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);

  const counts = useMemo(() => {
    const c = { all: ORDERS.length, active: 0, done: 0, cancel: 0 };
    ORDERS.forEach(o => { if (o.status === "done") c.done++; else if (o.status === "cancel") c.cancel++; else c.active++; });
    return c;
  }, []);

  const list = useMemo(() => ORDERS.filter(o =>
    filter === "all" ? true : filter === "active" ? ACTIVE_STATUSES.includes(o.status) : o.status === filter
  ), [filter]);

  const groups = useMemo(() => {
    const m = new Map();
    list.forEach(o => { const k = dayKey(o.daysAgo); if (!m.has(k)) m.set(k, []); m.get(k).push(o); });
    return [...m.entries()];
  }, [list]);

  const reorder = (o, e) => {
    if (e) e.stopPropagation();
    if (LIVE_OH) {
      // Gửi danh sách món sang trang thực đơn — giá được tính lại theo giá hiện tại
      try {
        localStorage.setItem(REORDER_KEY, JSON.stringify({
          code: o.code,
          items: o.items.map(it => ({ id: it.id, qty: it.qty, selections: it.selections || null })),
        }));
      } catch (err) { /* ignore */ }
      location.href = NAV_URLS.menu;
      return;
    }
    setToast(`Đã thêm ${o.items.reduce((s, it) => s + it.qty, 0)} món từ ${o.code} vào giỏ`);
    setTimeout(() => setToast(null), 3000);
  };

  const liveIdx = live ? FLOW.indexOf(live.status) : -1;

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <a className="back" href={NAV_URLS.home} title="Quay lại"><Icon name="arrowleft" size={20} /></a>
          <div>
            <div className="hdr-title">Đơn hàng của tôi</div>
            <div className="hdr-sub">Lịch sử đặt món tại Laboong</div>
          </div>
        </div>
      </header>

      <main className="app">
        {/* live order */}
        {live && (
          <button className="live" onClick={() => setSel(live)} style={{ display: "block", border: "1px solid var(--line-2)" }}>
            <div className="live-top">
              <span className="live-ic"><Icon name="flame" size={22} color="#fff" /></span>
              <div style={{ minWidth: 0, textAlign: "left" }}>
                <div className="lt">Đơn đang xử lý</div>
                <div className="lc">{live.code}</div>
              </div>
              {(() => { const eta = etaInfo(live, now); return (
                <div className="live-eta">
                  <div className="e" style={eta.small ? { fontSize: 15, lineHeight: "26px" } : {}}>{eta.e}</div>
                  <div className="el">{eta.el}</div>
                </div>
              ); })()}
            </div>
            <div className="live-prog">
              <div className="lp-bar">
                {STEP_META.map((s, i) => (
                  <React.Fragment key={s.key}>
                    <div className={"lp-step" + (i < liveIdx ? " done" : i === liveIdx ? " cur" : "")}>
                      <span className="lp-dot">{i < liveIdx ? <Icon name="check" size={15} color="currentColor" /> : <Icon name={s.ic} size={15} color="currentColor" />}</span>
                      <span className="lp-l">{s.label}</span>
                    </div>
                    {i < STEP_META.length - 1 && <span className={"lp-line" + (i < liveIdx ? " done" : "")} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </button>
        )}

        {/* filters */}
        <div className="filters">
          {FILTERS.map(f => (
            <button key={f.key} className={"filt" + (filter === f.key ? " on" : "")} onClick={() => setFilter(f.key)}>
              {f.label} <span className="fn">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        {groups.length === 0 && (
          <div className="empty">
            <div className="ei"><Icon name="bag" size={26} /></div>
            Chưa có đơn hàng nào ở mục này.
            <div><a className="eb" href={NAV_URLS.menu}><Icon name="cup" size={16} color="#fff" /> Đặt món ngay</a></div>
          </div>
        )}

        {groups.map(([k, items]) => (
          <div className="daygroup" key={k}>
            <div className="dayhead">{k}</div>
            <div className="olist">
              {items.map(o => {
                const st = STATUS[o.status];
                const sum = itemSummary(o);
                return (
                  <button className="ocard" key={o.code} onClick={() => setSel(o)}>
                    <div className="oc-top">
                      <span className="oc-thumb" style={{ background: o.grad }}><Icon name="cup" size={22} color="#fff" /></span>
                      <div style={{ minWidth: 0 }}>
                        <div className="oc-code">{o.code}</div>
                        <div className="oc-meta">{o.store} <span className="dotsep">·</span> {o.type === "ship" ? "Giao đi" : "Tại quầy"}</div>
                      </div>
                      <span className={"ost " + st.cls}>{st.label}</span>
                    </div>
                    <div className="oc-items"><b>{sum.first}</b>{sum.more > 0 ? ` và ${sum.more} món khác` : ""}</div>
                    <div className="oc-foot">
                      <div className="oc-total tnum">{fmt(o.total)}đ
                        {o.points > 0 && o.status === "done" && <span className="pts">+{fmt(o.points)} điểm</span>}
                        {o.points > 0 && o.status !== "done" && o.status !== "cancel" && <span className="pts" style={{ color: "var(--ink-3)" }}>+{fmt(o.points)} điểm khi xong</span>}
                      </div>
                      {o.status !== "cancel" && <span className="oc-reorder" onClick={(e) => reorder(o, e)}><Icon name="refresh" size={14} color="currentColor" /> Đặt lại</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {sel && <OrderDetail o={sel} onClose={() => setSel(null)} onReorder={reorder} />}
      {toast && <div className="toast" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 120, background: "var(--ink)", color: "var(--bg)", padding: "13px 20px", borderRadius: 999, fontSize: 14, fontWeight: 600, boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: 10 }}><Icon name="check" size={16} color="var(--brand)" /> {toast}</div>}

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F", "#07432A"], ["#005A36", "#003D24"], ["#7A4A28", "#56331A"], ["#6B4FA0", "#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </>
  );
}

function OrderDetail({ o, onClose, onReorder }) {
  const st = STATUS[o.status];
  return (
    <div className="scrim" onClick={onClose}>
      <div className="od" onClick={e => e.stopPropagation()}>
        <div className="od-h">
          <button className="od-x" onClick={onClose}><Icon name="close" size={18} color="#fff" /></button>
          <div className="od-code">{o.code}</div>
          <div className="od-when">{o.time || dayKey(o.daysAgo)} · {o.type === "ship" ? "Giao đi" : "Nhận tại quầy"}</div>
          <span className="od-chip"><Icon name="bag" size={14} color="#fff" /> {st.label}</span>
        </div>
        <div className="od-b">
          <div className="od-sec">{o.type === "ship" ? "Giao đến" : "Nhận tại"}</div>
          <div className="od-store">
            <span className="si"><Icon name={o.type === "ship" ? "truck" : "pin"} size={18} color="currentColor" /></span>
            <div style={{ minWidth: 0 }}>
              <div className="sn">{o.type === "ship" ? (o.addr || "Địa chỉ giao hàng") : o.store}</div>
              <div className="sa">{o.type === "ship" ? `Giao từ ${o.store}` : (o.storeAddr || STORE_ADDR)}</div>
            </div>
          </div>

          <div className="od-sec">Món ({o.items.reduce((s, it) => s + it.qty, 0)})</div>
          <div className="od-items">
            {o.items.map((it, i) => (
              <div className="od-item" key={i}>
                <span className="q">{it.qty}×</span>
                <div style={{ minWidth: 0, flex: 1 }}><div className="nm">{it.name}</div>{it.opt && <div className="opt">{it.opt}</div>}</div>
                <span className="p">{fmt(it.unit * it.qty)}đ</span>
              </div>
            ))}
          </div>

          <div className="od-sec">Thanh toán</div>
          <div className="od-tot">
            <div className="tr"><span>Tạm tính</span><span className="v">{fmt(o.sub)}đ</span></div>
            {(o.discounts && o.discounts.length > 0) ? (
              o.discounts.filter(d => !d.ship).map((d, i) => (
                <div className="tr discount" key={i}><span>{d.label}</span><span className="v">{d.amount > 0 ? `−${fmt(d.amount)}đ` : "Kèm đơn"}</span></div>
              ))
            ) : (o.discount > 0 && (
              <div className="tr discount"><span>Giảm giá</span><span className="v">−{fmt(o.discount)}đ</span></div>
            ))}
            {(o.ship || 0) > 0 && <div className="tr"><span>Phí giao hàng</span><span className="v">{fmt(o.ship)}đ</span></div>}
            {(o.discounts || []).filter(d => d.ship).map((d, i) => (
              <div className="tr discount" key={"s" + i}><span>{d.label}</span><span className="v">−{fmt(d.amount)}đ</span></div>
            ))}
            <div className="tr grand"><span>Tổng cộng</span><span className="v">{fmt(o.total)}đ</span></div>
          </div>
          {o.points > 0 && o.status === "done" && (
            <div className="od-earn"><span className="bi"><Icon name="coin" size={19} color="#fff" /></span><span className="bt">Điểm đã tích từ đơn này</span><span className="bv">+{fmt(o.points)}</span></div>
          )}
          {o.points > 0 && o.status !== "done" && o.status !== "cancel" && (
            <div className="od-earn" style={{ background: "var(--bg-2)" }}><span className="bi" style={{ background: "var(--ink-3)" }}><Icon name="coin" size={19} color="#fff" /></span><span className="bt">Sẽ cộng khi đơn hoàn tất</span><span className="bv" style={{ color: "var(--ink-2)" }}>+{fmt(o.points)}</span></div>
          )}
        </div>
        <div className="od-f">
          {o.status !== "cancel" && <button className="b primary" onClick={(e) => { onReorder(o, e); onClose(); }}><Icon name="refresh" size={17} color="#fff" /> Đặt lại đơn này</button>}
          {o.status === "cancel" && <button className="b primary" onClick={onClose}>Đóng</button>}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
