/* global React, Icon, QRCanvas, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, TweakSlider, TweakRadio, NAV_URLS */
const { useState, useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false,
  "accent": "peach"
}/*EDITMODE-END*/;

/* ---- data from server ---- */
const HOME = window.HOME_DATA || {};
const MEMBER = HOME.member || { name: "", id: "", tier: "" };
const ADMIN_ACCESS = !!HOME.adminAccess; // admin hoặc quản lý (staff active) mới thấy nút Quản trị
const GOAL = HOME.goal || 0;
const REWARD = HOME.reward || "";
const PROMOS = HOME.promos || [];
const TX = HOME.transactions || [];
const STORE = HOME.store || null;
const NEWS = HOME.news || [];

/* ---- Google Maps (loaded async in welcome.blade.php) ---- */
function onGmapsReady(fn) {
  if (window.__gmapsReady || window.google?.maps) { fn(); return; }
  if (window.__gmapsCallbacks) { window.__gmapsCallbacks.push(fn); }
}

function storeCoords(s) {
  const lat = parseFloat(s?.latitude), lng = parseFloat(s?.longitude);
  return (isFinite(lat) && isFinite(lng)) ? { lat, lng } : null;
}

function directionsUrl(s) {
  const c = storeCoords(s);
  return c
    ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s?.address || s?.name || '')}`;
}

/* Bản đồ vị trí cửa hàng — fallback về placeholder khi chưa có toạ độ / chưa có API key */
function StoreMap({ store }) {
  const divRef = useRef(null);
  const [ready, setReady] = useState(false);
  const coords = storeCoords(store);

  useEffect(() => {
    if (!coords) return;
    let destroyed = false;
    onGmapsReady(() => {
      if (destroyed || !divRef.current) return;
      const maps = window.google?.maps;
      if (!maps) return;
      const map = new maps.Map(divRef.current, {
        center: coords, zoom: 16,
        disableDefaultUI: true, gestureHandling: "none",
        clickableIcons: false, keyboardShortcuts: false,
      });
      new maps.Marker({ position: coords, map, title: store.name });
      setReady(true);
    });
    return () => { destroyed = true; };
  }, []); // eslint-disable-line

  return (
    <div className="store-map" onClick={() => window.open(directionsUrl(store), "_blank")}
      style={{ cursor: "pointer" }} title="Mở bản đồ chỉ đường">
      <div ref={divRef} style={{ position: "absolute", inset: 0, zIndex: 1, display: ready ? "block" : "none" }} />
      {!ready && (<>
        <div className="pin" />
        <span className="maplabel">{coords ? "Đang tải bản đồ…" : store.address}</span>
      </>)}
    </div>
  );
}
const POINTS_THIS_WEEK = HOME.pointsThisWeek || 0;
const CHECKIN_CONFIG = HOME.checkinConfig || [
  { d: "Ngày 1", pts: 5 }, { d: "Ngày 2", pts: 5 }, { d: "Ngày 3", pts: 10 },
  { d: "Ngày 4", pts: 10 }, { d: "Ngày 5", pts: 15 }, { d: "Ngày 6", pts: 15 },
  { d: "Ngày 7", pts: 50, bonus: true },
];

function storeStatus(store) {
  if (!store || !store.opening_time || !store.closing_time) return "";
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMins = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const open = toMins(store.opening_time);
  const close = toMins(store.closing_time);
  const isOpen = mins >= open && mins < close;
  return isOpen ? `Đang mở · đến ${store.closing_time.slice(0, 5)}` : `Đã đóng cửa · mở lại ${store.opening_time.slice(0, 5)}`;
}

function csrfToken() {
  const m = document.querySelector('meta[name="csrf-token"]');
  return m ? m.content : "";
}

/* ================= App ================= */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [qrOpen, setQrOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [promoDetail, setPromoDetail] = useState(null);
  const [newsDetail, setNewsDetail] = useState(null);
  const [tab, setTab] = useState("home");

  const serverCi = HOME.checkin || { streak: 0, last: null, today: false };
  const [checkedToday, setCheckedToday] = useState(serverCi.today);
  const [streak, setStreak] = useState(serverCi.streak);
  const [points, setPoints] = useState(HOME.points || 0);
  const [ciToast, setCiToast] = useState(null);
  const [ciLoading, setCiLoading] = useState(false);

  /* ── Thêm vào màn hình chính (PWA) ── */
  const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
  // Trình duyệt trong app khác (Zalo/Facebook/Messenger/Instagram/TikTok…) — không cài được, phải mở Safari
  const inAppBrowser = () => /FBAN|FBAV|FB_IAB|Instagram|Line|Zalo|MicroMessenger|TikTok|GSA/i.test(window.navigator.userAgent);
  // Chrome/Firefox/Edge trên iOS cũng KHÔNG có "Thêm màn hình chính" — chỉ Safari
  const iosNonSafari = () => isIOS() && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(window.navigator.userAgent);
  const [installEvt, setInstallEvt] = useState(null);
  const [iosGuide, setIosGuide] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const [installDismissed, setInstallDismissed] = useState(() => {
    try { return localStorage.getItem("lb_a2hs_dismiss") === "1"; } catch (e) { return false; }
  });

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvt(e); };
    const onInstalled = () => { setInstalled(true); setInstallEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  const addToHomeScreen = async () => {
    if (installEvt) {                         // Android / Chrome: bật hộp cài đặt hệ thống
      installEvt.prompt();
      try { await installEvt.userChoice; } catch (e) { /* ignore */ }
      setInstallEvt(null);
    } else if (isIOS()) {                      // iPhone: hướng dẫn thủ công qua nút Chia sẻ
      setIosGuide(true);
    } else {
      setIosGuide(true);                       // trình duyệt khác: hiện hướng dẫn chung
    }
  };

  const dismissInstall = () => {
    setInstallDismissed(true);
    try { localStorage.setItem("lb_a2hs_dismiss", "1"); } catch (e) { /* ignore */ }
  };

  // Hiện nút khi: chưa cài, chưa ẩn, và (có sự kiện cài được HOẶC là iOS)
  const showInstall = !installed && !installDismissed && (installEvt || isIOS());

  const dayIdx = checkedToday ? (streak - 1) % 7 : streak % 7;

  const doCheckin = async () => {
    if (checkedToday || ciLoading) return;
    setCiLoading(true);
    try {
      const res = await fetch("/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-TOKEN": csrfToken() },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCheckedToday(true);
        setStreak(data.streak);
        setPoints(data.total_points);
        setCiToast(`Điểm danh thành công! +${data.points_awarded} điểm`);
        setTimeout(() => setCiToast(null), 3000);
      }
    } catch (e) { /* network error — silent */ }
    setCiLoading(false);
  };

  const remain = Math.max(0, GOAL - points);
  const pct = GOAL > 0 ? Math.min(100, Math.round((points / GOAL) * 100)) : 100;

  // theme vars
  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(t.brand) ? t.brand : [t.brand, t.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", t.dark ? "dark" : "light");
  }, [t.brand, t.dark]);

  // auto-rotate promo
  useEffect(() => {
    if (PROMOS.length < 2) return;
    const id = setInterval(() => setSlide(s => (s + 1) % PROMOS.length), 4200);
    return () => clearInterval(id);
  }, []);

  const initials = (MEMBER.name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map(w => w[0])
    .join("")
    .toUpperCase();

  // esc closes modal
  useEffect(() => {
    const h = e => { if (e.key === "Escape") { setQrOpen(false); setPromoDetail(null); setNewsDetail(null); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  const openQR = () => setQrOpen(true);

  return (
    <>
      {/* ---------- Header ---------- */}
      <header className="hdr">
        <div className="hdr-in">
          <div className="brand">
            <div className="brand-mark"><span>L</span></div>
            <div className="brand-txt">
              <div className="brand-name">Laboong</div>
              <div className="brand-sub">Victoria Văn Phú</div>
            </div>
          </div>
          <nav className="nav">
            <a className="on" href={NAV_URLS.home}>Trang chủ</a>
            <a href={NAV_URLS.menu}>Đặt món</a>
            <a href={NAV_URLS.catalog}>Đổi quà</a>
            <a href={NAV_URLS.store}>Cửa hàng</a>
            <a href={NAV_URLS.history}>Lịch sử</a>
          </nav>
          <div className="hdr-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {ADMIN_ACCESS && (
              <a
                className="admin-enter"
                href={NAV_URLS.adminHome}
                title="Vào trang quản trị"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 999, textDecoration: "none",
                  fontSize: 13.5, fontWeight: 700, color: "#fff",
                  background: "linear-gradient(150deg,#0F623F,#1AA86A)",
                  boxShadow: "0 2px 8px rgba(15,98,63,.25)", whiteSpace: "nowrap",
                }}
              >
                <Icon name="gear" size={16} color="#fff" />
                <span className="admin-enter-txt">Quản trị</span>
              </a>
            )}
            <a className="avatar" href={NAV_URLS.profile} title={MEMBER.name}>{initials}</a>
          </div>
        </div>
      </header>

      <main className="app">
        <div className="greet">
          <h1>Chào <b>{MEMBER.name}</b> 👋</h1>
          <p>Tích điểm mỗi ly, đổi quà mỗi ngày tại Laboong.</p>
        </div>

        {showInstall && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
            background: "linear-gradient(150deg,#0F623F,#1AA86A)", color: "#fff",
            borderRadius: 16, padding: "13px 14px", boxShadow: "0 6px 18px rgba(15,98,63,.25)",
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontWeight: 800, fontFamily: "'Baloo 2',cursive", fontSize: 22 }}>L</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>Cài Laboong lên màn hình chính</div>
              <div style={{ fontSize: 12, opacity: .85 }}>Mở nhanh như một app, khỏi gõ địa chỉ web.</div>
            </div>
            <button onClick={addToHomeScreen} style={{ flex: "none", background: "#fff", color: "#0F623F", border: "none", borderRadius: 10, padding: "9px 15px", fontWeight: 800, fontSize: 13.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="plus2" size={15} color="#0F623F" /> Thêm
            </button>
            <button onClick={dismissInstall} title="Ẩn" style={{ flex: "none", background: "transparent", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer", padding: 4 }}>
              <Icon name="close" size={16} color="#fff" />
            </button>
          </div>
        )}

        {iosGuide && (() => {
          // Trình duyệt trong app khác / iOS không phải Safari: KHÔNG cài được — cần cảnh báo, không phải bottom-sheet.
          const blocked = inAppBrowser() || iosNonSafari();
          // iPhone/iPad Safari: chỉ 2 thao tác — hiện bottom-sheet gọn + mũi tên động chỉ xuống nút Chia sẻ.
          const iosSafari = isIOS() && !blocked;

          if (iosSafari) {
            return (
              <div className="scrim" onClick={() => setIosGuide(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,30,20,.5)" }}>
                <style>{"@keyframes lbArrow{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,10px)}}"}</style>
                {/* Card gọn nổi phía trên thanh công cụ */}
                <div onClick={e => e.stopPropagation()} style={{ position: "absolute", left: 16, right: 16, bottom: 108, background: "var(--card,#fff)", borderRadius: 18, padding: "18px 18px 16px", maxWidth: 380, margin: "0 auto", boxShadow: "0 20px 50px rgba(0,0,0,.28)", textAlign: "center" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, margin: "0 auto 10px", background: "linear-gradient(150deg,#0F623F,#1AA86A)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontFamily: "'Baloo 2',cursive", fontSize: 23 }}>L</div>
                  <h3 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800 }}>Chỉ 2 bước là xong 👇</h3>
                  <div style={{ textAlign: "left", fontSize: 14, color: "var(--ink-2,#555)", lineHeight: 1.55 }}>
                    <div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 9 }}>
                      <span style={{ flex: "none", width: 24, height: 24, borderRadius: "50%", background: "var(--brand,#0F623F)", color: "#fff", fontSize: 13, fontWeight: 800, display: "grid", placeItems: "center" }}>1</span>
                      <span>Bấm nút <b>Chia sẻ</b> <span style={{ display: "inline-flex", verticalAlign: "middle", width: 20, height: 20, borderRadius: 5, border: "1.6px solid #0F623F", color: "#0F623F", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900 }}>↑</span> ở thanh dưới (mũi tên đang nhảy 👇).</span>
                    </div>
                    <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                      <span style={{ flex: "none", width: 24, height: 24, borderRadius: "50%", background: "var(--brand,#0F623F)", color: "#fff", fontSize: 13, fontWeight: 800, display: "grid", placeItems: "center" }}>2</span>
                      <span>Chọn <b>“Thêm vào MH chính”</b> → <b>Thêm</b>.</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 11, fontSize: 11.5, color: "var(--ink-3,#999)" }}>Không thấy thanh dưới? Chạm nhẹ hoặc vuốt xuống để hiện lại.</div>
                  <button onClick={() => setIosGuide(false)} style={{ marginTop: 12, width: "100%", background: "transparent", border: "1.5px solid var(--line,#e5e7eb)", borderRadius: 11, padding: "9px", fontWeight: 700, fontSize: 13.5, color: "var(--ink-2,#555)", cursor: "pointer" }}>Đóng</button>
                </div>
                {/* Mũi tên động chỉ xuống nút Chia sẻ ở thanh công cụ Safari */}
                <div style={{ position: "absolute", left: "50%", bottom: 28, transform: "translateX(-50%)", animation: "lbArrow 1s ease-in-out infinite", pointerEvents: "none", filter: "drop-shadow(0 4px 10px rgba(0,0,0,.35))" }}>
                  <div style={{ background: "#0F623F", color: "#fff", borderRadius: 999, padding: "6px 13px", fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap" }}>Nút Chia sẻ ở đây</div>
                  <div style={{ width: 0, height: 0, margin: "0 auto", borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "10px solid #0F623F" }} />
                </div>
              </div>
            );
          }

          // Trình duyệt bị chặn (in-app / iOS không Safari) hoặc trình duyệt khác: modal cảnh báo giữa màn hình.
          return (
            <div className="scrim" onClick={() => setIosGuide(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,30,20,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: "var(--card,#fff)", borderRadius: 18, padding: 24, maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, margin: "0 auto 12px", background: "linear-gradient(150deg,#0F623F,#1AA86A)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontFamily: "'Baloo 2',cursive", fontSize: 26 }}>L</div>
                <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>Thêm Laboong vào màn hình chính</h3>

                {inAppBrowser() ? (
                  <div style={{ textAlign: "left", fontSize: 13.5, color: "var(--ink-2,#555)", lineHeight: 1.65, margin: "0 0 14px" }}>
                    <div style={{ background: "#FFF4E5", color: "#8a5300", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontWeight: 600 }}>
                      ⚠️ Bạn đang mở trong trình duyệt của ứng dụng khác (Zalo, Facebook…). Chỗ này <b>không cài được</b>.
                    </div>
                    <b>Hãy mở bằng trình duyệt chính:</b>
                    <div style={{ marginTop: 6 }}>1. Bấm nút <b>⋯</b> (hoặc <b>⋮</b>) ở góc phía trên.</div>
                    <div>2. Chọn <b>“Mở trong trình duyệt”</b> / <b>“Mở bằng Safari / Chrome”</b>.</div>
                    <div>3. Quay lại đây bấm <b>Thêm</b> một lần nữa.</div>
                  </div>
                ) : iosNonSafari() ? (
                  <div style={{ textAlign: "left", fontSize: 13.5, color: "var(--ink-2,#555)", lineHeight: 1.65, margin: "0 0 14px" }}>
                    <div style={{ background: "#FFF4E5", color: "#8a5300", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontWeight: 600 }}>
                      ⚠️ Trên iPhone, chỉ <b>Safari</b> mới thêm được vào màn hình chính (Chrome/Firefox thì không).
                    </div>
                    Hãy mở lại trang này bằng <b>Safari</b>, rồi bấm <b>Thêm</b> lần nữa.
                  </div>
                ) : (
                  <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--ink-2,#555)", lineHeight: 1.6 }}>
                    Mở menu trình duyệt (<b>⋮</b>) và chọn <b>“Thêm vào màn hình chính”</b> / <b>“Cài đặt ứng dụng”</b>.
                  </p>
                )}

                <button className="btn primary" style={{ width: "100%" }} onClick={() => setIosGuide(false)}>Đã hiểu</button>
              </div>
            </div>
          );
        })()}

        <div className="grid">
          {/* ============ LEFT COLUMN ============ */}
          <div className="col">

            {/* ---- Points hero ---- */}
            <section className="hero">
              <div className="hero-top">
                <span className="tier"><span className="dot"><Icon name="star" size={11} color="#fff"/></span>{MEMBER.tier}</span>
                <span className="hero-id">ID {MEMBER.id}</span>
              </div>

              <div className="points-label">Điểm tích lũy hiện có</div>
              <div className="points-row">
                <span className="points-num">{fmt(points)}</span>
                <span className="points-unit">điểm</span>
                {POINTS_THIS_WEEK > 0 && (
                  <span className="points-delta"><Icon name="spark" size={13} color="#fff"/> +{fmt(POINTS_THIS_WEEK)} tuần này</span>
                )}
              </div>

              {/* progress to next reward */}
              {GOAL > 0 && (
                <div className="prog">
                  <div className="prog-top">
                    <div className="prog-goal">Mốc đổi quà gần nhất · <b>{REWARD}</b></div>
                    <div className="prog-need">Còn <b>{fmt(remain)}</b> điểm</div>
                  </div>
                  <div className="prog-bar"><div className="prog-fill" style={{ width: pct + "%" }} /></div>
                  <div className="prog-scale"><span>{fmt(points)} điểm</span><span>{fmt(GOAL)} điểm</span></div>
                </div>
              )}

              {/* main CTA */}
              <button className="qr-cta" onClick={openQR}>
                <span className="ic"><Icon name="qr" size={20} color="#fff"/></span>
                Quét mã QR để tích điểm
              </button>
              <div className="hero-actions">
                <a className="hero-act" href={NAV_URLS.catalog}><Icon name="gift" size={17} color="#fff"/> Đổi quà</a>
                <a className="hero-act" href={NAV_URLS.points}><Icon name="coin" size={17} color="#fff"/> Chi tiết điểm</a>
                <a className="hero-act" href={NAV_URLS.orderHistory} style={{ gridColumn: "1 / -1" }}><Icon name="bag" size={17} color="#fff"/> Theo dõi đơn hàng</a>
                <a className="hero-act" href={NAV_URLS.wallet} style={{ gridColumn: "1 / -1" }}><Icon name="ticket" size={17} color="#fff"/> Voucher của tôi</a>
              </div>
            </section>

            {/* ---- Promo carousel ---- */}
            {PROMOS.length > 0 && (
              <section className="promo">
                <div className="promo-track">
                  {PROMOS.map((p, i) => (
                    <div className="promo-slide" key={i}
                      style={{ background: p.bg, transform: `translateX(-${slide * 100}%)`, cursor: "pointer" }}
                      onClick={() => setPromoDetail(p)}>
                      <div className="pico"><Icon name={p.icon} size={30} color="#fff"/></div>
                      <div style={{ minWidth: 0 }}>
                        <span className="promo-tag">{p.tag}</span>
                        <h4>{p.title}</h4>
                        <p>{p.sub}</p>
                      </div>
                      <button className="promo-go" onClick={e => { e.stopPropagation(); setPromoDetail(p); }}>Xem <Icon name="arrow" size={15}/></button>
                    </div>
                  ))}
                </div>
                {PROMOS.length > 1 && (
                  <div className="promo-dots">
                    {PROMOS.map((_, i) => (
                      <button key={i} className={i === slide ? "on" : ""} onClick={() => setSlide(i)} aria-label={"Promo " + (i+1)} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* ============ RIGHT COLUMN ============ */}
          <div className="col">

            {/* ---- Daily check-in ---- */}
            <section className="card checkin">
              <div className="checkin-head">
                <span className="ci-ic"><Icon name="spark" size={19} color="#fff" /></span>
                <div>
                  <h3>Điểm danh hàng ngày</h3>
                  <div className="ci-streak">Chuỗi <b>{streak} ngày</b> · điểm danh nhận điểm thưởng</div>
                </div>
              </div>
              <div className="ci-days">
                {CHECKIN_CONFIG.map((c, i) => {
                  const done = i < dayIdx || (checkedToday && i === dayIdx);
                  const isToday = !checkedToday && i === dayIdx;
                  return (
                    <div key={i} className={"ci-day" + (done ? " done" : "") + (isToday ? " today" : "") + (c.bonus ? " bonus" : "")}>
                      <div className="cd-lbl">{c.d}</div>
                      <div className="cd-pts">+{c.pts}</div>
                      <div className="cd-ic"><Icon name={done ? "check" : c.bonus ? "gift" : "coin"} size={14} color="currentColor" /></div>
                    </div>
                  );
                })}
              </div>
              <div className="ci-cta">
                <button className={"ci-btn " + (checkedToday ? "claimed" : "ready")} onClick={doCheckin} disabled={checkedToday || ciLoading}>
                  {checkedToday
                    ? <><Icon name="check" size={18} color="currentColor" /> <span>Đã điểm danh hôm nay</span></>
                    : ciLoading
                      ? <span>Đang xử lý…</span>
                      : <><Icon name="spark" size={18} color="#fff" /> <span>Điểm danh nhận +{CHECKIN_CONFIG[dayIdx]?.pts || 5} điểm</span></>}
                </button>
              </div>
            </section>

            {/* ---- Nearest store ---- */}
            {STORE && (
              <section className="card">
                <div className="card-h">
                  <h3>Cửa hàng của bạn</h3>
                  <a className="link" href={NAV_URLS.store}>Tất cả <Icon name="chev" size={15}/></a>
                </div>
                <StoreMap store={STORE} />
                <div className="store-body">
                  <div className="store-row">
                    <div style={{ minWidth: 0 }}>
                      <div className="store-name">{STORE.name}</div>
                      <div className="store-addr">{STORE.address}</div>
                    </div>
                    <div className="store-dist">
                      <div className="open">{storeStatus(STORE)}</div>
                    </div>
                  </div>
                </div>
                <div className="store-btns">
                  <button className="sbtn primary" onClick={() => window.open(directionsUrl(STORE), "_blank")}><Icon name="nav" size={17} color="#fff"/> Chỉ đường</button>
                  <button className="sbtn ghost" onClick={() => STORE.phone && (location.href = "tel:" + STORE.phone.replace(/[\s.]/g, ""))} disabled={!STORE.phone}><Icon name="phone" size={17}/> Gọi cửa hàng</button>
                </div>
              </section>
            )}

            {/* ---- Tin tức ---- */}
            {NEWS.length > 0 && (
              <section className="card">
                <div className="card-h"><h3>Tin tức Laboong</h3></div>
                <div className="news-list">
                  {NEWS.map(n => {
                    const cover = n.image_url || (n.youtube_id ? `https://img.youtube.com/vi/${n.youtube_id}/hqdefault.jpg` : null);
                    return (
                      <button className="news-card" key={n.id} onClick={() => setNewsDetail(n)}>
                        <div className="news-thumb">
                          {cover ? <img src={cover} alt="" /> : <span className="news-ph"><Icon name="star" size={26} color="#fff" /></span>}
                          {n.media_type !== "image" && <span className="news-play"><Icon name="play" size={18} color="#fff" /></span>}
                        </div>
                        <div className="news-body">
                          <div className="news-title">{n.title}</div>
                          {n.excerpt && <div className="news-ex">{n.excerpt}</div>}
                          {n.date && <div className="news-date">{n.date}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ---- Recent transactions ---- */}
            <section className="card">
              <div className="card-h">
                <h3>Giao dịch gần đây</h3>
                <a className="link" href={NAV_URLS.history}>Xem tất cả <Icon name="chev" size={15}/></a>
              </div>
              <div className="tx-list">
                {TX.length === 0 && <div className="tx-meta">Chưa có giao dịch nào.</div>}
                {TX.map((x, i) => (
                  <div className="tx" key={i}>
                    <div className={"tx-ic " + (x.type === "earn" ? "earn" : "redeem")}>
                      <Icon name={x.icon} size={21} color={x.type === "earn" ? "var(--brand)" : "var(--pink)"} />
                    </div>
                    <div className="tx-body">
                      <div className="tx-title">{x.title}</div>
                      <div className="tx-meta">{x.meta}</div>
                    </div>
                    <div className={"tx-amt " + (x.amt > 0 ? "plus" : "minus")}>
                      {x.amt > 0 ? "+" : "−"}{fmt(Math.abs(x.amt))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ---------- Mobile bottom nav ---------- */}
      <nav className="tabbar">
        <button className={"tab " + (tab==="home"?"on":"")} onClick={()=>setTab("home")}><span className="ti"><Icon name="home" size={22}/></span>Trang chủ</button>
        <a className="tab" href={NAV_URLS.menu}><span className="ti"><Icon name="cup" size={22}/></span>Đặt món</a>
        <button className="tab tab-qr" onClick={openQR}><span className="ti"><Icon name="qr" size={26} color="#fff"/></span><span className="text-qr">Quét QR</span></button>
        <a className="tab" href={NAV_URLS.catalog}><span className="ti"><Icon name="gift" size={22}/></span>Đổi quà</a>
        <a className="tab" href={NAV_URLS.profile}><span className="ti"><Icon name="user" size={22}/></span>Tài khoản</a>
      </nav>

      {/* ---------- QR Modal ---------- */}
      {qrOpen && (
        <div className="scrim" onClick={() => setQrOpen(false)}>
          <div className="qr-modal" onClick={e => e.stopPropagation()}>
            <div className="qr-modal-h">
              <button className="qr-close" onClick={() => setQrOpen(false)}>×</button>
              <h3>Mã tích điểm của bạn</h3>
              <p>Đưa mã này cho nhân viên để tích điểm</p>
            </div>
            <div className="qr-wrap">
              <QRCanvas value={MEMBER.id} />
              <div className="qr-logo">L</div>
            </div>
            <div className="qr-body">
              <div className="qr-member">{MEMBER.name} · {MEMBER.tier}</div>
              <div className="qr-code-txt">{MEMBER.id}</div>
              <div className="qr-hint">
                <Icon name="info" size={18} color="var(--brand)" />
                <span>Mỗi 10.000đ hóa đơn = 1 điểm. Điểm được cộng ngay sau khi nhân viên quét mã.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Promo detail modal ---------- */}
      {promoDetail && (
        <div className="scrim" onClick={() => setPromoDetail(null)}>
          <div className="qr-modal" onClick={e => e.stopPropagation()}>
            <div className="qr-modal-h" style={{ background: promoDetail.bg }}>
              <button className="qr-close" onClick={() => setPromoDetail(null)}>×</button>
              <span className="promo-tag" style={{ marginBottom: 8, display: "inline-block" }}>{promoDetail.tag}</span>
              <h3>{promoDetail.title}</h3>
              {promoDetail.sub && <p>{promoDetail.sub}</p>}
            </div>
            <div className="qr-body" style={{ textAlign: "left" }}>
              {promoDetail.benefit && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <Icon name="gift" size={18} color="var(--brand)" />
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{promoDetail.benefit}</div>
                </div>
              )}
              {(promoDetail.start || promoDetail.end) && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                  <Icon name="cal" size={18} color="var(--brand)" />
                  <div style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
                    Áp dụng {promoDetail.start ? `từ ${promoDetail.start}` : ""}{promoDetail.end ? ` đến ${promoDetail.end}` : ""}
                  </div>
                </div>
              )}
              <div className="qr-hint" style={{ marginBottom: 14 }}>
                <Icon name="info" size={18} color="var(--brand)" />
                <span>Ưu đãi được áp dụng tự động khi bạn đặt món trong thời gian diễn ra chương trình.</span>
              </div>
              <a href={NAV_URLS.menu} className="qr-cta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none" }}>
                <Icon name="cup" size={18} color="#fff" /> Đặt món ngay
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ---------- News detail modal ---------- */}
      {newsDetail && (
        <div className="scrim" onClick={() => setNewsDetail(null)}>
          <div className="qr-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
            <div className="qr-modal-h" style={{ background: "linear-gradient(150deg,#0F623F,#1AA86A)" }}>
              <button className="qr-close" onClick={() => setNewsDetail(null)}>×</button>
              <h3 style={{ paddingRight: 30 }}>{newsDetail.title}</h3>
              {newsDetail.date && <p>{newsDetail.date}</p>}
            </div>
            <div style={{ overflowY: "auto", padding: 0 }}>
              <div style={{ background: "#000" }}>
                {newsDetail.media_type === "youtube" && newsDetail.youtube_id ? (
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                    <iframe src={`https://www.youtube.com/embed/${newsDetail.youtube_id}`} title={newsDetail.title}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                ) : newsDetail.media_type === "video" && newsDetail.video_url ? (
                  <video src={newsDetail.video_url} controls poster={newsDetail.image_url || undefined} style={{ width: "100%", maxHeight: 340, display: "block" }} />
                ) : newsDetail.image_url ? (
                  <img src={newsDetail.image_url} alt={newsDetail.title} style={{ width: "100%", display: "block" }} />
                ) : null}
              </div>
              {newsDetail.body && (
                <div className="news-detail-body" style={{ padding: "18px 20px", fontSize: 14.5, lineHeight: 1.7, color: "var(--ink)" }}
                  dangerouslySetInnerHTML={{ __html: newsDetail.body }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Check-in toast ---------- */}
      {ciToast && <div className="ci-toast"><span className="cit"><Icon name="check" size={14} color="#fff" /></span>{ciToast}</div>}

      {/* ---------- Tweaks ---------- */}
      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={t.brand}
          options={[["#0F623F","#07432A"],["#005A36","#003D24"],["#7A4A28","#56331A"],["#6B4FA0","#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={t.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
