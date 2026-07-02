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
const GOAL = HOME.goal || 0;
const REWARD = HOME.reward || "";
const PROMOS = HOME.promos || [];
const TX = HOME.transactions || [];
const STORE = HOME.store || null;

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
  const [tab, setTab] = useState("home");

  const serverCi = HOME.checkin || { streak: 0, last: null, today: false };
  const [checkedToday, setCheckedToday] = useState(serverCi.today);
  const [streak, setStreak] = useState(serverCi.streak);
  const [points, setPoints] = useState(HOME.points || 0);
  const [ciToast, setCiToast] = useState(null);
  const [ciLoading, setCiLoading] = useState(false);

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
    const h = e => { if (e.key === "Escape") setQrOpen(false); };
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
          <a className="avatar" href={NAV_URLS.profile} title={MEMBER.name}>{initials}</a>
        </div>
      </header>

      <main className="app">
        <div className="greet">
          <h1>Chào <b>{MEMBER.name}</b> 👋</h1>
          <p>Tích điểm mỗi ly, đổi quà mỗi ngày tại Laboong.</p>
        </div>

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
              </div>
            </section>

            {/* ---- Promo carousel ---- */}
            {PROMOS.length > 0 && (
              <section className="promo">
                <div className="promo-track">
                  {PROMOS.map((p, i) => (
                    <div className="promo-slide" key={i}
                      style={{ background: p.bg, transform: `translateX(-${slide * 100}%)` }}>
                      <div className="pico"><Icon name={p.icon} size={30} color="#fff"/></div>
                      <div style={{ minWidth: 0 }}>
                        <span className="promo-tag">{p.tag}</span>
                        <h4>{p.title}</h4>
                        <p>{p.sub}</p>
                      </div>
                      <button className="promo-go">Xem <Icon name="arrow" size={15}/></button>
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
