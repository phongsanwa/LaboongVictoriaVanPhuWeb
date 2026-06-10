/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

/* now: dùng để tính trạng thái mở cửa (demo: Thứ 2, 15:30) */
const NOW = { dayIdx: 0, mins: 15 * 60 + 30 }; // 0 = Thứ 2
const DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

const STORES = [
  { id: "s1", name: "Laboong Victoria Văn Phú", short: "Victoria Văn Phú",
    addr: "S2.03 KĐT Văn Phú, P. Phú La, Hà Đông, Hà Nội", phone: "024 6543 2107",
    km: 0.4, rating: 4.8, reviews: 326, x: 52, y: 46, open: "08:00", close: "22:30" },
  { id: "s2", name: "Laboong Royal City", short: "Royal City",
    addr: "B2-R6 Royal City, 72A Nguyễn Trãi, Thanh Xuân, Hà Nội", phone: "024 6512 8890",
    km: 2.1, rating: 4.7, reviews: 512, x: 30, y: 28, open: "08:30", close: "22:00" },
  { id: "s3", name: "Laboong Times City", short: "Times City",
    addr: "T3 Times City, 458 Minh Khai, Hai Bà Trưng, Hà Nội", phone: "024 6677 4521",
    km: 3.4, rating: 4.9, reviews: 408, x: 72, y: 64, open: "08:00", close: "22:30" },
  { id: "s4", name: "Laboong Aeon Hà Đông", short: "Aeon Hà Đông",
    addr: "Aeon Mall, Dương Nội, Hà Đông, Hà Nội", phone: "024 6299 3340",
    km: 1.8, rating: 4.6, reviews: 274, x: 24, y: 72, open: "09:00", close: "22:00" },
];

const AMEN = [
  { ic: "wifi", l: "Wifi miễn phí" }, { ic: "car", l: "Chỗ đậu xe" },
  { ic: "chair", l: "Chỗ ngồi" }, { ic: "bike", l: "Giao hàng" },
  { ic: "qr", l: "Tích điểm" }, { ic: "coin", l: "Đổi quà" },
];

const PHOTO_GRADS = [
  "linear-gradient(150deg,#0F623F,#1AA86A)", "linear-gradient(150deg,#C99A2E,#E0B84A)",
  "linear-gradient(150deg,#FF8A5B,#FF6FA5)", "linear-gradient(150deg,#1E8FA8,#4FC3D9)",
];
const PHOTO_LABELS = ["Không gian quán", "Quầy pha chế", "Đồ uống", "Khu vực ngồi"];

function toMins(hhmm) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }
function isOpenNow(s) { return NOW.mins >= toMins(s.open) && NOW.mins < toMins(s.close); }

/* stylized map background */
function MapBg() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      {/* water */}
      <path d="M0 0 L120 0 Q90 60 130 110 Q160 150 110 200 Q70 250 120 300 L0 300 Z" fill="var(--map-water)" opacity="0" />
      <rect x="300" y="200" width="160" height="140" fill="var(--map-water)" rx="8" />
      {/* park */}
      <rect x="150" y="150" width="80" height="64" rx="12" fill="var(--map-park)" />
      <rect x="20" y="20" width="70" height="50" rx="10" fill="var(--map-park)" />
      {/* blocks */}
      {[[30,90],[110,40],[250,30],[330,90],[60,180],[250,150],[300,250],[160,240],[30,250],[200,90]].map(([x,y],i)=>(
        <rect key={i} x={x} y={y} width="46" height="38" rx="6" fill="var(--map-block)" />
      ))}
      {/* roads (wide) */}
      <g stroke="var(--map-road)" fill="none" strokeLinecap="round">
        <path d="M-10 130 L410 110" strokeWidth="22" />
        <path d="M200 -10 L210 310" strokeWidth="22" />
        <path d="M-10 240 L410 250" strokeWidth="16" />
        <path d="M90 -10 L80 310" strokeWidth="16" />
        <path d="M320 -10 L330 310" strokeWidth="14" />
      </g>
      {/* road centerlines */}
      <g stroke="var(--map-road2)" fill="none" strokeLinecap="round" strokeWidth="2.5" strokeDasharray="9 9" opacity=".8">
        <path d="M-10 130 L410 110" />
        <path d="M200 -10 L210 310" />
      </g>
    </svg>
  );
}

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [sel, setSel] = useState(STORES[0].id);
  const [fav, setFav] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const store = STORES.find(s => s.id === sel);
  const open = isOpenNow(store);
  const switchStore = (id) => { setSel(id); setHoursOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <a className="hbtn" href={NAV_URLS.home} title="Quay lại"><Icon name="arrowleft" size={20} /></a>
          <div className="hdr-spacer" />
          <button className={"hbtn" + (fav ? " on" : "")} onClick={() => setFav(f => !f)} title="Lưu cửa hàng">
            <Icon name={fav ? "heartfill" : "heart"} size={19} color={fav ? "var(--pink)" : "currentColor"} />
          </button>
          <button className="hbtn"><Icon name="share" size={18} /></button>
        </div>
      </header>

      {/* map */}
      <div className="map">
        <MapBg />
        <div className="map-grad" />
        {STORES.filter(s => s.id !== sel).map(s => (
          <button key={s.id} className="dot-branch" style={{ left: s.x + "%", top: s.y + "%" }} onClick={() => switchStore(s.id)} title={s.short} />
        ))}
        <div className="pin" style={{ left: store.x + "%", top: store.y + "%" }}>
          <div className="pin-head"><span className="pi"><Icon name="cup" size={20} color="#fff" /></span></div>
          <span className="pin-pulse" />
        </div>
        <div className="map-ctrls">
          <div className="map-zoom">
            <button style={{ fontSize: 21, fontWeight: 700, fontFamily: "var(--display)" }}>+</button>
            <button style={{ fontSize: 21, fontWeight: 700, fontFamily: "var(--display)" }}>−</button>
          </div>
          <button className="map-ctrl" title="Vị trí của tôi"><Icon name="nav" size={18} /></button>
        </div>
      </div>

      <main className="app">
        <div className="body">
          {/* identity */}
          <section className="store-id">
            <div className="store-top">
              <div className="store-logo"><span>L</span></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="store-name">{store.name}</div>
                <div className="store-sub">
                  <span className={"status " + (open ? "open" : "closed")}>{open ? `Đang mở · đến ${store.close}` : `Đã đóng · mở ${store.open}`}</span>
                  <span className="meta"><Icon name="star" size={14} color="var(--yellow)" /> {store.rating} <span className="dotsep">·</span> {store.reviews} đánh giá</span>
                </div>
              </div>
            </div>
            <div className="actions">
              <button className="act primary"><Icon name="nav" size={18} color="#fff" /> Chỉ đường · {store.km} km</button>
              <button className="act ghost"><Icon name="phone" size={19} /> Gọi</button>
              <button className="act ghost"><Icon name="share" size={18} /> Chia sẻ</button>
            </div>
          </section>

          {/* info */}
          <section className="sec">
            <div className="panel">
              <div className="irow">
                <span className="ii"><Icon name="pin" size={18} color="currentColor" /></span>
                <div style={{ minWidth: 0 }}><div className="ik">Địa chỉ</div><div className="iv">{store.addr}</div></div>
              </div>
              <button className="irow" onClick={() => setHoursOpen(o => !o)}>
                <span className="ii"><Icon name="clock" size={18} color="currentColor" /></span>
                <div style={{ minWidth: 0 }}><div className="ik">Giờ mở cửa</div><div className="iv">{open ? "Đang mở" : "Đã đóng"} · {store.open} – {store.close} hằng ngày</div></div>
                <span className={"ichev" + (hoursOpen ? " open" : "")}><Icon name="chev" size={18} /></span>
              </button>
              {hoursOpen && (
                <div className="hours">
                  {DAYS.map((d, i) => (
                    <div key={d} className={"hrow" + (i === NOW.dayIdx ? " today" : "")}>
                      <span className="d">{d}{i === NOW.dayIdx ? " (hôm nay)" : ""}</span>
                      <span className="h">{store.open} – {store.close}</span>
                    </div>
                  ))}
                </div>
              )}
              <a className="irow" href={"tel:" + store.phone.replace(/\s/g, "")}>
                <span className="ii"><Icon name="phone" size={18} color="currentColor" /></span>
                <div style={{ minWidth: 0 }}><div className="ik">Điện thoại</div><div className="iv">{store.phone}</div></div>
                <span className="ichev"><Icon name="chev" size={18} /></span>
              </a>
            </div>
          </section>

          {/* amenities */}
          <section className="sec">
            <div className="sec-t">Tiện ích</div>
            <div className="amen">
              {AMEN.map(a => (
                <div className="amen-item" key={a.l}>
                  <div className="ai"><Icon name={a.ic} size={19} color="currentColor" /></div>
                  <div className="al">{a.l}</div>
                </div>
              ))}
            </div>
          </section>

          {/* photos */}
          <section className="sec">
            <div className="sec-t">Hình ảnh cửa hàng</div>
            <div className="photos">
              {PHOTO_GRADS.map((g, i) => (
                <div className="photo" key={i} style={{ background: g }}>
                  <Icon name={i === 1 ? "cup" : i === 2 ? "gift" : "image"} size={i === 0 ? 36 : 26} color="rgba(255,255,255,.85)" />
                  <span className="pl">{PHOTO_LABELS[i]}</span>
                  {i === 3 && <div className="more">+12</div>}
                </div>
              ))}
            </div>
          </section>

          {/* nearby branches */}
          <section className="sec">
            <div className="sec-t">Chi nhánh khác gần bạn</div>
            <div className="panel">
              {STORES.map(s => {
                const o = isOpenNow(s);
                const active = s.id === sel;
                return (
                  <button key={s.id} className={"branch" + (active ? " active" : "")} onClick={() => switchStore(s.id)}>
                    <span className="bi"><Icon name="cup" size={20} color="currentColor" /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="bn">{s.short}</div>
                      <div className="ba">{s.addr}</div>
                    </div>
                    {active
                      ? <span className="activeflag">Đang xem</span>
                      : <div className="bd"><div className="bkm">{s.km} km</div><div className={"bopen " + (o ? "o" : "c")}>{o ? "Đang mở" : "Đã đóng"}</div></div>}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>

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
