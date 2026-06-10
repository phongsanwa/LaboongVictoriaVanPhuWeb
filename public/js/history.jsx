/* global React, ReactDOM, Icon, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const PER_POINT = 10000;
const NOW = new Date("2026-06-10");

/* helper: build a bill */
function bill(daysAgo, store, items, discount = 0) {
  const sub = items.reduce((s, it) => s + it.price * it.qty, 0);
  const total = sub - discount;
  const d = new Date(NOW); d.setDate(d.getDate() - daysAgo);
  return { date: d, store, items, sub, discount, total, points: Math.floor(total / PER_POINT) };
}

const RAW = [
  bill(0,  "Victoria Văn Phú", [{ n: "Trà sữa trân châu đường đen", o: "Size L · 70% đường", price: 45000, qty: 1 }, { n: "Macchiato kem phô mai", o: "Size M", price: 42000, qty: 1 }]),
  bill(1,  "Royal City",       [{ n: "Trà đào cam sả", o: "Size L · ít đá", price: 39000, qty: 2 }], 30000),
  bill(3,  "Victoria Văn Phú", [{ n: "Hồng trà sữa", o: "Size L", price: 40000, qty: 1 }, { n: "Topping trân châu", o: "", price: 8000, qty: 2 }]),
  bill(8,  "Times City",       [{ n: "Combo 3 ly trà sữa", o: "Tặng kèm bánh", price: 120000, qty: 1 }]),
  bill(14, "Aeon Hà Đông",     [{ n: "Cà phê sữa đá", o: "", price: 29000, qty: 1 }, { n: "Trà vải hạt sen", o: "Size M", price: 35000, qty: 1 }]),
  bill(22, "Victoria Văn Phú", [{ n: "Sữa tươi trân châu đường đen", o: "Size L", price: 50000, qty: 2 }]),
  bill(45, "Royal City",       [{ n: "Trà sữa khoai môn", o: "Size L · 50% đường", price: 42000, qty: 1 }, { n: "Macchiato kem phô mai", o: "Size L", price: 48000, qty: 1 }], 20000),
  bill(67, "Times City",       [{ n: "Trà đào cam sả", o: "Size L", price: 39000, qty: 3 }]),
  bill(95, "Victoria Văn Phú", [{ n: "Combo sinh nhật 4 ly", o: "Kèm nến + bánh", price: 180000, qty: 1 }]),
  bill(140,"Aeon Hà Đông",     [{ n: "Cà phê muối", o: "Size M", price: 35000, qty: 2 }]),
];

const FILTERS = [
  { key: "1m", label: "Tháng này", days: 31 },
  { key: "3m", label: "3 tháng", days: 92 },
  { key: "6m", label: "6 tháng", days: 183 },
  { key: "all", label: "Tất cả", days: Infinity },
];

const PAY_METHODS = ["Tiền mặt", "Chuyển khoản", "VNPAY QR", "Thẻ"];

function fmtDate(d) {
  const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function dayKey(d) {
  const diff = Math.round((NOW - d) / 86400000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  if (diff < 7) return `${diff} ngày trước`;
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}
function shortDate(d) { return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`; }

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [filter, setFilter] = useState("3m");
  const [sel, setSel] = useState(null);

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

  const days = FILTERS.find(f => f.key === filter).days;
  const list = useMemo(() => RAW.filter(b => Math.round((NOW - b.date) / 86400000) < days), [days]);

  const stats = useMemo(() => {
    const spent = list.reduce((s, b) => s + b.total, 0);
    const pts = list.reduce((s, b) => s + b.points, 0);
    return { count: list.length, spent, pts };
  }, [list]);

  // group by dayKey
  const groups = useMemo(() => {
    const m = new Map();
    list.forEach(b => { const k = dayKey(b.date); if (!m.has(k)) m.set(k, []); m.get(k).push(b); });
    return [...m.entries()];
  }, [list]);

  const payOf = (b) => PAY_METHODS[(b.date.getDate()) % PAY_METHODS.length];

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <a className="back" href={NAV_URLS.home} title="Quay lại"><Icon name="arrowleft" size={20} /></a>
          <div>
            <div className="hdr-title">Lịch sử giao dịch</div>
            <div className="hdr-sub">Hoá đơn mua hàng của bạn</div>
          </div>
        </div>
      </header>

      <main className="app">
        <div className="summary">
          <div className="sum"><div className="l"><Icon name="receipt" size={13} color="var(--ink-3)" /> Giao dịch</div><div className="v tnum">{stats.count}</div></div>
          <div className="sum"><div className="l"><Icon name="coin" size={13} color="var(--ink-3)" /> Đã chi</div><div className="v tnum">{fmt(Math.round(stats.spent / 1000))}<small>k</small></div></div>
          <div className="sum"><div className="l"><Icon name="spark" size={13} color="var(--ink-3)" /> Điểm nhận</div><div className="v brand tnum">+{fmt(stats.pts)}</div></div>
        </div>

        <div className="filters">
          {FILTERS.map(f => (
            <button key={f.key} className={"filt" + (filter === f.key ? " on" : "")} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>

        {groups.length === 0 && (
          <div className="empty"><div className="ei"><Icon name="receipt" size={26} /></div>Không có giao dịch nào trong khoảng thời gian này.</div>
        )}

        {groups.map(([k, items]) => (
          <div className="daygroup" key={k}>
            <div className="dayhead">{k}</div>
            <div className="txlist">
              {items.map((b, i) => (
                <button className="txc" key={i} onClick={() => setSel(b)}>
                  <span className="ic"><Icon name="cup" size={22} color="currentColor" /></span>
                  <div className="mid">
                    <div className="store">{b.store}</div>
                    <div className="meta">{shortDate(b.date)} <span className="dotsep">·</span> {b.items.reduce((s, it) => s + it.qty, 0)} món <span className="dotsep">·</span> {payOf(b)}</div>
                  </div>
                  <div className="right">
                    <div className="amt tnum">{fmt(b.total)}đ</div>
                    <div className="pts"><Icon name="spark" size={11} color="var(--brand)" /> +{fmt(b.points)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* bill detail */}
      {sel && (
        <div className="scrim" onClick={() => setSel(null)}>
          <div className="bill" onClick={e => e.stopPropagation()}>
            <div className="bill-h">
              <button className="bill-x" onClick={() => setSel(null)}><Icon name="close" size={18} color="#fff" /></button>
              <div className="bill-store">Laboong {sel.store}</div>
              <div className="bill-date">{fmtDate(sel.date)}</div>
              <div className="bill-code">HĐ #{sel.date.getFullYear()}{String(sel.date.getMonth() + 1).padStart(2, "0")}{String(sel.date.getDate()).padStart(2, "0")}-{1000 + sel.total % 1000}</div>
            </div>
            <div className="bill-b">
              <div className="bill-sec">Chi tiết đơn hàng</div>
              {sel.items.map((it, i) => (
                <div className="litem" key={i}>
                  <span className="q">{it.qty}×</span>
                  <div style={{ minWidth: 0 }}><div className="ln">{it.n}</div>{it.o && <div className="lo">{it.o}</div>}</div>
                  <span className="lp">{fmt(it.price * it.qty)}đ</span>
                </div>
              ))}
              <div className="bill-totals">
                <div className="trow"><span>Tạm tính</span><span className="tv">{fmt(sel.sub)}đ</span></div>
                {sel.discount > 0 && <div className="trow discount"><span>Giảm giá / voucher</span><span className="tv">−{fmt(sel.discount)}đ</span></div>}
                <div className="trow grand"><span>Tổng cộng</span><span className="tv">{fmt(sel.total)}đ</span></div>
              </div>
              <div className="bill-earned">
                <span className="bi"><Icon name="coin" size={20} color="#fff" /></span>
                <span className="bt">Điểm tích được từ hoá đơn này</span>
                <span className="bv">+{fmt(sel.points)}</span>
              </div>
            </div>
            <div className="bill-f">
              <div className="bill-pay"><Icon name="check" size={15} color="var(--brand)" /> Đã thanh toán · {payOf(sel)}</div>
              <button className="bill-btn"><Icon name="receipt" size={17} /> Xuất lại hoá đơn</button>
            </div>
          </div>
        </div>
      )}

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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
