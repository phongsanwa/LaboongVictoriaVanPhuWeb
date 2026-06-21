/* global React, ReactDOM, Icon, fmt, adminHref, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo, useCallback } = React;

const OM_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

/* ─── LIVE / demo mode ───────────────────────────────────────────── */
const LIVE   = !!window.ADMIN_ORDERS_DATA;
const LIVE_D = window.ADMIN_ORDERS_DATA || {};

/* status config */
const STATUS = {
  new:    { label: "Đơn mới",   cls: "os-new",    ic: "receipt" },
  making: { label: "Đang pha",  cls: "os-making", ic: "flame"   },
  ready:  { label: "Sẵn sàng", cls: "os-ready",  ic: "check"   },
  done:   { label: "Hoàn tất", cls: "os-done",   ic: "bag"     },
  cancel: { label: "Đã huỷ",   cls: "os-cancel", ic: "close"   },
};
const FLOW       = ["new", "making", "ready", "done"];
const NEXT       = { new: "making", making: "ready", ready: "done" };
const NEXT_LABEL = { new: "Nhận pha chế", making: "Đã pha xong", ready: "Hoàn tất đơn" };

const AV = [
  "linear-gradient(140deg,#0F623F,#1AA86A)",
  "linear-gradient(140deg,#FF8A5B,#FF6FA5)",
  "linear-gradient(140deg,#1E8FA8,#4FC3D9)",
  "linear-gradient(140deg,#C99A2E,#E0B84A)",
  "linear-gradient(140deg,#6B4FA0,#9B7FD4)",
];
function avc(n) { let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return AV[h % AV.length]; }
function initials(n) { const p = n.trim().split(/\s+/); return ((p[0]?.[0] || "") + (p[p.length - 1]?.[0] || "")).toUpperCase(); }

function minsAgo(iso) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function csrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Có lỗi xảy ra');
  return json;
}

/* ─── Demo seed data ─────────────────────────────────────────────── */
function mk(id, mins, status, cust, phone, type, addr, items, discount) {
  const sub = items.reduce((s, it) => s + it.unit * it.qty, 0);
  return { id, dbId: null, mins, status, cust, phone, type, addr, items, discount: discount || 0, sub, total: sub - (discount || 0), pay: ["Tiền mặt", "VNPAY QR", "Chuyển khoản"][id.charCodeAt(4) % 3], note: "" };
}
const ORDERS_SEED = [
  mk("LB-2418", 2, "new", "Nguyễn Minh Anh", "0912 845 207", "ship", "S2.03 KĐT Văn Phú, Hà Đông, Hà Nội",
    [{ name: "Trà sữa trân châu đường đen", opt: "Size L · Đường 70% · Đá 70%", unit: 53000, qty: 2 }, { name: "Macchiato kem phô mai", opt: "Size M · Đường 50%", unit: 48000, qty: 1 }], 0),
  mk("LB-2417", 5, "new", "Trần Quốc Bảo", "0987 213 668", "pickup", null,
    [{ name: "Trà đào cam sả", opt: "Size L · ít đá", unit: 39000, qty: 1 }], 0),
  mk("LB-2416", 9, "making", "Đỗ Khánh Linh", "0978 332 905", "ship", "Tầng 12 Keangnam, Phạm Hùng, Hà Nội",
    [{ name: "Combo 3 ly trà sữa", opt: "Mix vị", unit: 120000, qty: 1 }, { name: "Trân châu đường đen", opt: "Topping thêm", unit: 8000, qty: 2 }], 30000),
  mk("LB-2415", 14, "making", "Phạm Gia Huy", "0905 558 410", "pickup", null,
    [{ name: "Cà phê muối", opt: "Size M", unit: 35000, qty: 2 }], 0),
  mk("LB-2414", 21, "ready", "Hoàng Thu Trang", "0962 884 117", "ship", "Royal City, Nguyễn Trãi, Thanh Xuân, Hà Nội",
    [{ name: "Hồng trà sữa", opt: "Size L · Đường 30%", unit: 46000, qty: 1 }, { name: "Trà vải hạt sen", opt: "Size M", unit: 42000, qty: 1 }], 0),
  mk("LB-2413", 28, "ready", "Vũ Đức Thành", "0911 047 583", "pickup", null,
    [{ name: "Sữa tươi trân châu đường đen", opt: "Size L", unit: 56000, qty: 3 }], 50000),
  mk("LB-2412", 42, "done", "Bùi Tuấn Kiệt", "0938 612 740", "ship", "458 Minh Khai, Hai Bà Trưng, Hà Nội",
    [{ name: "Đá xay socola", opt: "Size L", unit: 52000, qty: 1 }], 0),
  mk("LB-2411", 55, "done", "Đặng Mỹ Duyên", "0909 451 836", "pickup", null,
    [{ name: "Trà sữa khoai môn", opt: "Size M · Đường 50%", unit: 42000, qty: 2 }], 0),
  mk("LB-2410", 68, "cancel", "Lý Thanh Phong", "0975 145 822", "ship", "72 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    [{ name: "Cà phê sữa đá", opt: "", unit: 29000, qty: 1 }], 0),
];

/* ─── App ────────────────────────────────────────────────────────── */
function App() {
  const [tw, setTweak] = useTweaks(OM_DEFAULTS);

  const [orders, setOrders] = useState(() => {
    if (LIVE) {
      return (LIVE_D.orders || []).map(o => ({ ...o, mins: minsAgo(o.createdAt) }));
    }
    return ORDERS_SEED.map(o => ({ ...o }));
  });

  const [tab,      setTab]     = useState("active");
  const [sel,      setSel]     = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [toast,    setToast]   = useState(null);
  const [saving,   setSaving]  = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  /* update mins every 30s */
  useEffect(() => {
    if (!LIVE) return;
    const id = setInterval(() => {
      setOrders(list => list.map(o => ({ ...o, mins: minsAgo(o.createdAt) })));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  /* auto-refresh orders from server every 20s in LIVE mode */
  const refreshOrders = useCallback(async () => {
    if (!LIVE) return;
    try {
      const res = await fetch(LIVE_D.urls?.refresh, { headers: { 'Accept': 'application/json' } });
      const json = await res.json();
      if (json.orders) {
        setOrders(json.orders.map(o => ({ ...o, mins: minsAgo(o.createdAt) })));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!LIVE) return;
    const id = setInterval(refreshOrders, 20000);
    return () => clearInterval(id);
  }, [refreshOrders]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const counts = useMemo(() => {
    const c = { active: 0 };
    orders.forEach(o => {
      c[o.status] = (c[o.status] || 0) + 1;
      if (o.status !== "done" && o.status !== "cancel") c.active++;
    });
    return c;
  }, [orders]);

  const TABS = [
    { key: "active", label: "Đang xử lý", n: counts.active || 0 },
    { key: "new",    label: "Đơn mới",    n: counts.new    || 0 },
    { key: "making", label: "Đang pha",   n: counts.making || 0 },
    { key: "ready",  label: "Sẵn sàng",  n: counts.ready  || 0 },
    { key: "done",   label: "Hoàn tất",  n: counts.done   || 0 },
    { key: "cancel", label: "Đã huỷ",    n: counts.cancel || 0 },
  ];

  const filtered = useMemo(() => orders.filter(o =>
    tab === "active" ? (o.status !== "done" && o.status !== "cancel") : o.status === tab
  ), [orders, tab]);

  const updateOrder = (updated) => {
    setOrders(list => list.map(x => x.dbId === updated.dbId ? { ...updated, mins: minsAgo(updated.createdAt) } : x));
    setSel(s => s && s.dbId === updated.dbId ? { ...updated, mins: minsAgo(updated.createdAt) } : s);
  };

  const advance = async (o) => {
    const nx = NEXT[o.status];
    if (!nx) return;

    if (LIVE && o.dbId) {
      if (saving) return;
      setSaving(true);
      try {
        const url = LIVE_D.urls.advance.replace('__ID__', o.dbId);
        const json = await apiPost(url, {});
        updateOrder(json.order);
        flash(`${o.id} → ${STATUS[nx].label}`);
      } catch (e) { flash('Lỗi: ' + e.message); }
      finally { setSaving(false); }
    } else {
      setOrders(list => list.map(x => x.id === o.id ? { ...x, status: nx } : x));
      setSel(s => s && s.id === o.id ? { ...s, status: nx } : s);
      flash(`${o.id} → ${STATUS[nx].label}`);
    }
  };

  const cancel = async (o) => {
    if (!confirm(`Huỷ đơn ${o.id}?`)) return;

    if (LIVE && o.dbId) {
      if (saving) return;
      setSaving(true);
      try {
        const url = LIVE_D.urls.cancel.replace('__ID__', o.dbId);
        const json = await apiPost(url, {});
        updateOrder(json.order);
        setSel(null);
        flash(`Đã huỷ ${o.id}`);
      } catch (e) { flash('Lỗi: ' + e.message); }
      finally { setSaving(false); }
    } else {
      setOrders(list => list.map(x => x.id === o.id ? { ...x, status: "cancel" } : x));
      setSel(null);
      flash(`Đã huỷ ${o.id}`);
    }
  };

  const adminInfo = LIVE ? LIVE_D.admin : { name: "Quản trị viên", email: "admin@laboong.vn", initials: "QT" };

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Đơn hàng" badges={{ "Đơn hàng": String(counts.active || 0) }} admin={adminInfo} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Đơn hàng</div>
            <h1>Quản lý đơn hàng</h1>
          </div>
          <div className="topbar-spacer" />
          {LIVE && (
            <button className="icon-btn" title="Tải lại" onClick={refreshOrders} style={{ marginRight: 8 }}>
              <Icon name="refresh" size={18} />
            </button>
          )}
          <span className="otype ship" style={{ fontSize: 12.5, padding: "7px 13px" }}>
            <Icon name="pin" size={14} color="currentColor" /> Victoria Văn Phú
          </span>
        </header>

        <div className="content">
          <div className="stats" style={{ marginBottom: 18 }}>
            <div className="stat"><div className="stat-ic b"><Icon name="receipt" size={20} /></div>
              <div><div className="lbl">Đơn mới</div><div className="val tnum">{counts.new || 0}</div></div></div>
            <div className="stat"><div className="stat-ic y"><Icon name="flame" size={20} /></div>
              <div><div className="lbl">Đang pha</div><div className="val tnum">{counts.making || 0}</div></div></div>
            <div className="stat"><div className="stat-ic g"><Icon name="check" size={20} /></div>
              <div><div className="lbl">Sẵn sàng</div><div className="val tnum">{counts.ready || 0}</div></div></div>
            <div className="stat"><div className="stat-ic a"><Icon name="bag" size={20} /></div>
              <div><div className="lbl">Hoàn tất hôm nay</div><div className="val tnum">{counts.done || 0}</div></div></div>
          </div>

          <div className="ord-tabs">
            {TABS.map(t => (
              <button key={t.key} className={"otab" + (tab === t.key ? " on" : "")} onClick={() => setTab(t.key)}>
                {t.label} <span className="on-n">{t.n}</span>
              </button>
            ))}
          </div>

          <div className="ord-grid">
            {filtered.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 48, color: "var(--ink-3)", fontWeight: 500 }}>
                {LIVE ? "Không có đơn nào." : "Không có đơn nào."}
              </div>
            )}
            {filtered.map(o => {
              const st       = STATUS[o.status];
              const late     = o.status !== "done" && o.status !== "cancel" && o.mins >= 20;
              const totalQty = o.items.reduce((s, it) => s + it.qty, 0);
              return (
                <div className={"ocard" + (late ? " urgent" : "")} key={o.id || o.dbId} onClick={() => setSel(o)}>
                  <div className="ocard-top">
                    <div style={{ minWidth: 0 }}>
                      <div className="ocard-code">{o.id}</div>
                      <div className={"ocard-time" + (late ? " late" : "")}>
                        <Icon name="clock" size={12} color="currentColor" /> {o.mins} phút trước
                      </div>
                    </div>
                    <span className={"ostatus " + st.cls}>{st.label}</span>
                  </div>
                  <div className="ocard-items">
                    {o.items.slice(0, 2).map((it, i) => (
                      <div className="oi-line" key={i}><span className="oq">{it.qty}×</span><span className="onm">{it.name}</span></div>
                    ))}
                    {o.items.length > 2 && <div className="oi-more">+{o.items.length - 2} món khác</div>}
                  </div>
                  <div className="ocard-foot">
                    <div className="ocard-cust">
                      <div className="ocn">{o.cust}</div>
                      <div className="ocm">
                        <span className={"otype " + (o.type === "ship" ? "ship" : "pickup")}>
                          <Icon name={o.type === "ship" ? "truck" : "bag"} size={11} color="currentColor" />
                          {o.type === "ship" ? " Giao đi" : " Tại quầy"}
                        </span>
                        {totalQty} món
                      </div>
                    </div>
                    <div className="ocard-total tnum">{fmt(o.total)}đ</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {sel && <OrderDrawer o={sel} saving={saving} onClose={() => setSel(null)} onAdvance={advance} onCancel={cancel} />}
      {toast && <div className="toast"><span className="tc"><Icon name="check" size={15} color="#fff" /></span>{toast}</div>}

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F", "#07432A"], ["#005A36", "#003D24"], ["#3E5C8A", "#2A4063"], ["#6B4FA0", "#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </div>
  );
}

function OrderDrawer({ o, saving, onClose, onAdvance, onCancel }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const st     = STATUS[o.status];
  const ended  = o.status === "done" || o.status === "cancel";
  const curIdx = FLOW.indexOf(o.status);

  return (
    <>
      <div className="scrim" style={{ zIndex: 80 }} onClick={onClose} />
      <aside className="drawer" role="dialog">
        <div className="od-head">
          <button className="od-close" onClick={onClose}><Icon name="close" size={18} color="#fff" /></button>
          <div className="od-code">{o.id}</div>
          <div className="od-meta"><span>{o.mins} phút trước</span><span>·</span><span>{o.pay}</span></div>
          <span className="od-statuschip"><Icon name={st.ic} size={14} color="#fff" /> {st.label}</span>
        </div>
        <div className="od-body">
          {o.status !== "cancel" && (
            <div className="od-steps">
              {FLOW.map((s, i) => (
                <React.Fragment key={s}>
                  <div className={"od-step" + (i < curIdx ? " done" : i === curIdx ? " cur" : "")}>
                    <span className="sc">{i < curIdx ? <Icon name="check" size={15} color="currentColor" /> : <Icon name={STATUS[s].ic} size={15} color="currentColor" />}</span>
                    <span className="sl">{STATUS[s].label}</span>
                  </div>
                  {i < FLOW.length - 1 && <span className={"od-step-bar" + (i < curIdx ? " done" : "")} />}
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="od-sec">Khách hàng</div>
          <div className="od-info">
            <div className="od-ir"><span className="odi"><Icon name="user" size={16} /></span>
              <div><div className="odk">Tên khách</div><div className="odv">{o.cust}</div></div>
            </div>
            {o.phone && (
              <div className="od-ir"><span className="odi"><Icon name="phone" size={16} /></span>
                <div><div className="odk">Số điện thoại</div><div className="odv">{o.phone}</div></div>
              </div>
            )}
            <div className="od-ir"><span className="odi"><Icon name={o.type === "ship" ? "truck" : "bag"} size={16} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="odk">{o.type === "ship" ? "Giao đến" : "Hình thức"}</div>
                <div className="odv">{o.type === "ship" ? o.addr : "Nhận tại quầy · Victoria Văn Phú"}</div>
              </div>
            </div>
          </div>

          {o.note && (
            <>
              <div className="od-sec">Ghi chú</div>
              <div className="od-note">{o.note}</div>
            </>
          )}

          <div className="od-sec">Món ({o.items.reduce((s, it) => s + it.qty, 0)})</div>
          <div className="od-items">
            {o.items.map((it, i) => (
              <div className="od-item" key={i}>
                <span className="oq">{it.qty}×</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="onm">{it.name}</div>
                  {it.opt && <div className="oopt">{it.opt}</div>}
                </div>
                <span className="op">{fmt(it.unit * it.qty)}đ</span>
              </div>
            ))}
          </div>

          <div className="od-totals">
            <div className="od-trow"><span>Tạm tính</span><span className="v">{fmt(o.sub)}đ</span></div>
            {o.discount > 0 && <div className="od-trow discount"><span>Giảm giá</span><span className="v">−{fmt(o.discount)}đ</span></div>}
            <div className="od-trow grand"><span>Tổng cộng</span><span className="v">{fmt(o.total)}đ</span></div>
          </div>
        </div>
        {!ended && (
          <div className="od-foot">
            <button className="btn ghost" style={{ flex: ".5" }} disabled={saving} onClick={() => onCancel(o)}>Huỷ đơn</button>
            {NEXT[o.status] && (
              <button className="btn primary" disabled={saving} onClick={() => onAdvance(o)}>
                {saving ? <span>Đang lưu…</span> : <><Icon name="check" size={17} color="#fff" /> {NEXT_LABEL[o.status]}</>}
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
