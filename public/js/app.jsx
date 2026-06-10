/* global React, Icon, QRCanvas, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, TweakSlider, TweakRadio */
const { useState, useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false,
  "points": 2450,
  "accent": "peach"
}/*EDITMODE-END*/;

/* ---- static content ---- */
const MEMBER = { name: "Minh Anh", id: "LBVP·0257·418", tier: "Hạng Vàng" };
const GOAL = 3000;
const REWARD = "1 ly trà sữa size L miễn phí";

const PROMOS = [
  { tag: "Hot", icon: "cup", bg: "linear-gradient(135deg,#0F623F,#1AA86A)",
    title: "Mua 1 Tặng 1 trà sữa", sub: "Trân châu đường đen size L · Thứ 4 hàng tuần" },
  { tag: "Ưu đãi", icon: "spark", bg: "linear-gradient(135deg,#FF8A5B,#FF6FA5)",
    title: "Giảm 30% qua App", sub: "Đơn từ 99k · áp dụng đến hết 15/06" },
  { tag: "Mới", icon: "star", bg: "linear-gradient(135deg,#FFB13D,#FF7A3D)",
    title: "Tặng 50 điểm đánh giá", sub: "Đánh giá 5★ sau mỗi lần mua hàng" },
];

const TX = [
  { type: "earn", icon: "cup", title: "Trà sữa trân châu đường đen", meta: "Hôm nay · 14:20", amt: 45 },
  { type: "redeem", icon: "gift", title: "Đổi voucher giảm 30.000đ", meta: "Hôm qua · 19:05", amt: -300 },
  { type: "earn", icon: "cup", title: "2 ly Macchiato kem phô mai", meta: "05/06 · 12:30", amt: 60 },
];

/* ================= App ================= */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [qrOpen, setQrOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [tab, setTab] = useState("home");

  const points = t.points;
  const remain = Math.max(0, GOAL - points);
  const pct = Math.min(100, Math.round((points / GOAL) * 100));

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
    const id = setInterval(() => setSlide(s => (s + 1) % PROMOS.length), 4200);
    return () => clearInterval(id);
  }, []);

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
            <a href={NAV_URLS.catalog}>Đổi quà</a>
            <a href={NAV_URLS.store}>Cửa hàng</a>
            <a href={NAV_URLS.history}>Lịch sử</a>
          </nav>
          <a className="avatar" href={NAV_URLS.profile} title={MEMBER.name}>MA</a>
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
                <span className="points-delta"><Icon name="spark" size={13} color="#fff"/> +105 tuần này</span>
              </div>

              {/* progress to next reward */}
              <div className="prog">
                <div className="prog-top">
                  <div className="prog-goal">Mốc đổi quà gần nhất · <b>{REWARD}</b></div>
                  <div className="prog-need">Còn <b>{fmt(remain)}</b> điểm</div>
                </div>
                <div className="prog-bar"><div className="prog-fill" style={{ width: pct + "%" }} /></div>
                <div className="prog-scale"><span>{fmt(points)} điểm</span><span>{fmt(GOAL)} điểm</span></div>
              </div>

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
              <div className="promo-dots">
                {PROMOS.map((_, i) => (
                  <button key={i} className={i === slide ? "on" : ""} onClick={() => setSlide(i)} aria-label={"Promo " + (i+1)} />
                ))}
              </div>
            </section>
          </div>

          {/* ============ RIGHT COLUMN ============ */}
          <div className="col">

            {/* ---- Nearest store ---- */}
            <section className="card">
              <div className="card-h">
                <h3>Cửa hàng gần bạn</h3>
                <a className="link" href={NAV_URLS.store}>Tất cả <Icon name="chev" size={15}/></a>
              </div>
              <div className="store-map">
                <div className="pin" />
                <span className="maplabel">// bản đồ vị trí cửa hàng</span>
              </div>
              <div className="store-body">
                <div className="store-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="store-name">Laboong Victoria Văn Phú</div>
                    <div className="store-addr">S2.03 KĐT Văn Phú, P. Phú La, Hà Đông, Hà Nội</div>
                  </div>
                  <div className="store-dist">
                    <div className="km">0,4 km</div>
                    <div className="open">Đang mở · đến 22:30</div>
                  </div>
                </div>
              </div>
              <div className="store-btns">
                <button className="sbtn primary"><Icon name="nav" size={17} color="#fff"/> Chỉ đường</button>
                <button className="sbtn ghost"><Icon name="phone" size={17}/> Gọi cửa hàng</button>
              </div>
            </section>

            {/* ---- Recent transactions ---- */}
            <section className="card">
              <div className="card-h">
                <h3>Giao dịch gần đây</h3>
                <a className="link" href={NAV_URLS.history}>Xem tất cả <Icon name="chev" size={15}/></a>
              </div>
              <div className="tx-list">
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
        <a className="tab" href={NAV_URLS.catalog}><span className="ti"><Icon name="gift" size={22}/></span>Đổi quà</a>
        <button className="tab tab-qr" onClick={openQR}><span className="ti"><Icon name="qr" size={26} color="#fff"/></span>Quét QR</button>
        <a className="tab" href={NAV_URLS.store}><span className="ti"><Icon name="pin" size={22}/></span>Cửa hàng</a>
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
              <QRCanvas />
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

      {/* ---------- Tweaks ---------- */}
      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={t.brand}
          options={[["#0F623F","#07432A"],["#005A36","#003D24"],["#7A4A28","#56331A"],["#6B4FA0","#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={t.dark} onChange={v => setTweak("dark", v)} />
        <TweakSection label="Dữ liệu mẫu" />
        <TweakSlider label="Điểm hiện tại" value={t.points} min={0} max={3000} step={10} unit=" điểm"
          onChange={v => setTweak("points", v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
