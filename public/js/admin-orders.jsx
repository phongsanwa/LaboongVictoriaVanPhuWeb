/* global React, ReactDOM, Icon, fmt, adminHref, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo, useCallback, useRef } = React;

/* ─── Chỉ đường Google Maps: điểm đến = toạ độ khách đã chọn (chính xác,
   không dò lại từ chuỗi địa chỉ); điểm đi = vị trí hiện tại của người mở. ─── */
function openDirections(o) {
  const dest = (o.lat != null && o.lng != null)
    ? `${o.lat},${o.lng}`
    : (o.addr ? encodeURIComponent(o.addr) : '');
  if (!dest) { alert('Đơn này chưa lưu địa chỉ giao.'); return; }

  const base = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + dest;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => window.open(`${base}&origin=${pos.coords.latitude},${pos.coords.longitude}`, '_blank', 'noopener'),
      ()  => window.open(base, '_blank', 'noopener'), // không lấy được vị trí → Google tự dùng "vị trí của bạn"
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  } else {
    window.open(base, '_blank', 'noopener');
  }
}

/* ─── Âm thanh báo đơn mới (kiểu ShopeeFood) ──────────────────────── */
let _audioCtx = null;
function ensureAudioCtx() {
  try {
    if (!_audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _audioCtx = new AC();
    }
    if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
  } catch { /* ignore */ }
  return _audioCtx;
}
/* Chuông "ding-dong" bằng Web Audio (không cần file âm thanh) */
function playChime() {
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [[880, 0], [1174.66, 0.20]].forEach(([freq, t]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.6, now + t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.4);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now + t); osc.stop(now + t + 0.45);
  });
}
/* Đọc thành tiếng (giọng đọc như ShopeeFood) */
function speakNewOrder(count) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = count > 1
      ? `Bạn có ${count} đơn hàng mới từ La-boong`
      : `Bạn đã có đơn hàng từ La-boong`;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'vi-VN'; u.rate = 1; u.pitch = 1; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}
function alertNewOrder(count) {
  playChime();
  setTimeout(() => speakNewOrder(count), 500);
}

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

/* Đổi tổng số phút thành "ngày giờ phút trước" cho dễ đọc (đơn cũ không còn hiện số phút khổng lồ). */
function timeAgo(mins) {
  mins = Math.max(0, Math.floor(mins || 0));
  if (mins < 1) return "Vừa xong";
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const parts = [];
  if (d > 0) parts.push(d + " ngày");
  if (h > 0) parts.push(h + " giờ");
  if (m > 0 || parts.length === 0) parts.push(m + " phút");
  return parts.join(" ") + " trước";
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

  /* Âm thanh báo đơn mới — bật/tắt lưu trong localStorage */
  const [soundOn, setSoundOn] = useState(() => {
    try { return localStorage.getItem('laboong_admin_sound') !== '0'; } catch { return true; }
  });
  const soundOnRef = useRef(soundOn);
  useEffect(() => {
    soundOnRef.current = soundOn;
    try { localStorage.setItem('laboong_admin_sound', soundOn ? '1' : '0'); } catch { /* ignore */ }
  }, [soundOn]);
  // Ghi nhận sẵn các đơn đang hiển thị lúc mở trang để không báo nhầm khi tải lại
  const seenIdsRef = useRef(LIVE && LIVE_D.orders ? new Set(LIVE_D.orders.map(o => o.dbId)) : null);

  /* Mở khoá âm thanh sau lần tương tác đầu tiên (chính sách autoplay của trình duyệt) */
  useEffect(() => {
    const unlock = () => { ensureAudioCtx(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

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
      // Giữ bộ lọc cửa hàng khi tự tải lại (nhân viên đã bị khoá phía server)
      const refreshUrl = LIVE_D.urls?.refresh + (LIVE_D.storeFilter ? '?store_id=' + LIVE_D.storeFilter : '');
      const res = await fetch(refreshUrl, { headers: { 'Accept': 'application/json' } });
      const json = await res.json();
      if (json.orders) {
        // Phát hiện đơn mới → chuông + đọc "Bạn đã có đơn hàng từ Laboong"
        if (seenIdsRef.current === null) {
          seenIdsRef.current = new Set(json.orders.map(o => o.dbId)); // lần đầu: chỉ ghi nhận, không báo
        } else {
          const fresh = json.orders.filter(o => o.dbId && !seenIdsRef.current.has(o.dbId));
          fresh.forEach(o => seenIdsRef.current.add(o.dbId));
          if (fresh.length > 0) {
            if (soundOnRef.current) alertNewOrder(fresh.length);
            flash(`🔔 ${fresh.length} đơn hàng mới!`);
          }
        }
        setOrders(json.orders.map(o => ({ ...o, mins: minsAgo(o.createdAt) })));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!LIVE) return;
    const id = setInterval(refreshOrders, 12000);
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
        // Hoàn tất đơn có cộng điểm → hiện rõ số điểm đã cộng cho khách
        flash(json.points_awarded > 0 ? `${o.id} hoàn tất · +${json.points_awarded} điểm cho khách` : `${o.id} → ${STATUS[nx].label}`);
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

  const markPaid = async (o, paid) => {
    if (!LIVE || !o.dbId) {
      setOrders(list => list.map(x => x.id === o.id ? { ...x, paymentStatus: paid ? 'paid' : 'unpaid' } : x));
      setSel(s => s && s.id === o.id ? { ...s, paymentStatus: paid ? 'paid' : 'unpaid' } : s);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const url = LIVE_D.urls.payment.replace('__ID__', o.dbId);
      const json = await apiPost(url, { paid });
      updateOrder(json.order);
      flash(paid ? `${o.id} · đã thanh toán` : `${o.id} · chưa thanh toán`);
    } catch (e) { flash('Lỗi: ' + e.message); }
    finally { setSaving(false); }
  };

  const adminInfo = LIVE ? LIVE_D.admin : { name: "Quản trị viên", email: "admin@laboong.vn", initials: "QT" };

  return (
    <div className={"shell" + (LIVE_D.hideMenuToggle ? " no-side" : "")}>
      {!LIVE_D.hideMenuToggle && (
        <AdminSidebar activeLabel="Đơn hàng" badges={{ "Đơn hàng": String(counts.active || 0) }} admin={adminInfo} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      )}

      <div className="main">
        <header className="topbar">
          {!LIVE_D.hideMenuToggle && (
            <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          )}
          {LIVE_D.hideMenuToggle && (
            <a className="btn ghost" href={LIVE_D.posUrl || "/pos/points"} style={{ display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
              <Icon name="arrowleft" size={16} /> Về màn tích điểm
            </a>
          )}
          <div>
            <div className="crumb">Quản lý · Đơn hàng</div>
            <h1>Quản lý đơn hàng</h1>
          </div>
          <div className="topbar-spacer" />
          {LIVE && (
            <button className="icon-btn" title={soundOn ? "Âm báo đơn mới: BẬT (bấm để tắt)" : "Âm báo đơn mới: TẮT (bấm để bật)"}
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                if (next) { ensureAudioCtx(); alertNewOrder(1); } // bật + phát thử (đồng thời mở khoá âm thanh)
                else if (window.speechSynthesis) window.speechSynthesis.cancel();
              }}
              style={{ marginRight: 8, position: "relative", color: soundOn ? "var(--brand)" : "var(--ink-3)" }}>
              <Icon name="bell" size={18} />
              {!soundOn && <span style={{ position: "absolute", top: "50%", left: "15%", right: "15%", height: 2, background: "var(--ink-3)", transform: "rotate(-45deg)" }} />}
            </button>
          )}
          {LIVE && (
            <button className="icon-btn" title="Tải lại" onClick={refreshOrders} style={{ marginRight: 8 }}>
              <Icon name="refresh" size={18} />
            </button>
          )}
          {LIVE && !LIVE_D.storeLocked && (LIVE_D.stores || []).length > 1 ? (
            <select
              className="inp"
              style={{ width: "auto", padding: "8px 12px", fontSize: 13, fontWeight: 600 }}
              value={LIVE_D.storeFilter ?? ""}
              title="Lọc đơn theo cửa hàng"
              onChange={e => { location.href = location.pathname + (e.target.value ? "?store_id=" + e.target.value : ""); }}
            >
              <option value="">Tất cả cửa hàng</option>
              {(LIVE_D.stores || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <span className="otype ship" style={{ fontSize: 12.5, padding: "7px 13px" }}>
              <Icon name="pin" size={14} color="currentColor" /> {LIVE ? (LIVE_D.storeName || "Tất cả cửa hàng") : "Victoria Văn Phú"}
            </span>
          )}
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
                        <Icon name="clock" size={12} color="currentColor" /> {timeAgo(o.mins)}
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

      {sel && <OrderDrawer o={sel} saving={saving} onClose={() => setSel(null)} onAdvance={advance} onCancel={cancel} onMarkPaid={markPaid} />}
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

function OrderDrawer({ o, saving, onClose, onAdvance, onCancel, onMarkPaid }) {
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
          <div className="od-meta"><span>{timeAgo(o.mins)}</span><span>·</span><span>{o.pay}</span></div>
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
                <div>
                  <div className="odk">Số điện thoại{o.accountPhone && o.phone !== o.accountPhone ? " (nhận hàng)" : ""}</div>
                  <div className="odv">{o.phone}</div>
                  {o.accountPhone && o.phone !== o.accountPhone && (
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>SĐT tài khoản: {o.accountPhone}</div>
                  )}
                </div>
              </div>
            )}
            <div className="od-ir"><span className="odi"><Icon name={o.type === "ship" ? "truck" : "bag"} size={16} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="odk">{o.type === "ship" ? "Giao đến" : "Hình thức"}</div>
                <div className="odv">{o.type === "ship" ? (o.addr || "Giao hàng (chưa lưu địa chỉ)") : `Nhận tại quầy${o.store ? " · " + o.store : ""}`}</div>
                {o.type === "ship" && (o.addr || (o.lat != null && o.lng != null)) && (
                  <button
                    onClick={() => openDirections(o)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8,
                      padding: "8px 13px", borderRadius: 999, border: "none", cursor: "pointer",
                      background: "#1A73E8", color: "#fff", fontWeight: 700, fontSize: 13,
                    }}>
                    <Icon name="pin" size={14} color="#fff" /> Chỉ đường (Google Maps)
                    {o.lat == null && <span style={{ fontWeight: 500, opacity: .85 }}> · theo địa chỉ</span>}
                  </button>
                )}
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
            {(o.discounts && o.discounts.length > 0) ? (
              o.discounts.filter(d => !d.ship).map((d, i) => (
                <div className="od-trow discount" key={i}><span>{d.label}</span><span className="v">{d.amount > 0 ? `−${fmt(d.amount)}đ` : "Kèm đơn"}</span></div>
              ))
            ) : (o.discount > 0 && (
              <div className="od-trow discount"><span>Giảm giá</span><span className="v">−{fmt(o.discount)}đ</span></div>
            ))}
            {o.ship > 0 && <div className="od-trow"><span>Phí giao hàng</span><span className="v">{fmt(o.ship)}đ</span></div>}
            {(o.discounts || []).filter(d => d.ship).map((d, i) => (
              <div className="od-trow discount" key={"s" + i}><span>{d.label}</span><span className="v">−{fmt(d.amount)}đ</span></div>
            ))}
            {o.weatherSurcharge > 0 && <div className="od-trow"><span>Phụ thu thời tiết xấu</span><span className="v">+{fmt(o.weatherSurcharge)}đ</span></div>}
            <div className="od-trow grand"><span>Tổng cộng</span><span className="v">{fmt(o.total)}đ</span></div>
          </div>

          {/* Thanh toán */}
          <div className="od-pay">
            <div className="od-pay-row">
              <span>Cách thanh toán</span>
              <b>{o.pay || (o.paymentMethod === "bank" ? "Chuyển khoản ngân hàng" : "Thanh toán khi nhận hàng")}</b>
            </div>
            <div className="od-pay-row">
              <span>Trạng thái</span>
              <span className={"od-pay-badge " + (o.paymentStatus === "paid" ? "paid" : "unpaid")}>
                {o.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
              </span>
            </div>
            {o.paymentMethod === "bank" && (
              o.paymentStatus === "paid"
                ? <button className="btn ghost tiny" disabled={saving} onClick={() => onMarkPaid(o, false)} style={{ marginTop: 8 }}>Bỏ đánh dấu đã thanh toán</button>
                : <button className="btn primary" disabled={saving} onClick={() => onMarkPaid(o, true)} style={{ marginTop: 8, width: "100%" }}><Icon name="check" size={16} color="#fff" /> Đã nhận chuyển khoản</button>
            )}
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
