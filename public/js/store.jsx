/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const STORE_DATA = window.STORE_DATA || { stores: [], selectedId: null, todayIdx: 0 };
const STORES = STORE_DATA.stores;
const TODAY_IDX = STORE_DATA.todayIdx;
const DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

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

function directionsHref(s) {
  return s.lat != null && s.lng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.addr)}`;
}

/* embedded Google Map, falls back to a stylized map when coordinates are missing */
function MapView({ store, sel, switchStore }) {
  if (store.lat == null || store.lng == null) {
    return (
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
      </div>
    );
  }

  return (
    <div className="map">
      <iframe
        className="map-iframe"
        src={`https://www.google.com/maps?q=${store.lat},${store.lng}&z=16&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Bản đồ ${store.name}`}
      />
      <div className="map-grad" />
      <div className="map-ctrls">
        <a className="map-ctrl" href={directionsHref(store)} target="_blank" rel="noreferrer" title="Mở trong Google Maps">
          <Icon name="nav" size={18} />
        </a>
      </div>
    </div>
  );
}

/* stylized map background, used as a fallback when a store has no coordinates */
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
  const [sel, setSel] = useState(STORE_DATA.selectedId ?? (STORES[0] && STORES[0].id));
  const [fav, setFav] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const store = STORES.find(s => s.id === sel);
  const switchStore = (id) => { setSel(id); setHoursOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const shareStore = async (s) => {
    const url = window.location.href;
    const text = `${s.name} — ${s.addr}`;
    if (navigator.share) {
      try { await navigator.share({ title: s.name, text, url }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("Đã sao chép liên kết cửa hàng");
    } catch {
      flash("Không thể sao chép, vui lòng copy thủ công");
    }
  };

  if (!store) {
    return (
      <main className="app">
        <div className="body">
          <div className="empty">Hiện chưa có cửa hàng nào hoạt động.</div>
        </div>
      </main>
    );
  }

  const open = store.isOpenNow;

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <a className="hbtn" href={NAV_URLS.home} title="Quay lại"><Icon name="arrowleft" size={20} /></a>
          <div className="hdr-spacer" />
          <button className={"hbtn" + (fav ? " on" : "")} onClick={() => setFav(f => !f)} title="Lưu cửa hàng">
            <Icon name={fav ? "heartfill" : "heart"} size={19} color={fav ? "var(--pink)" : "currentColor"} />
          </button>
          <button className="hbtn" onClick={() => shareStore(store)} title="Chia sẻ cửa hàng"><Icon name="share" size={18} /></button>
        </div>
      </header>

      {/* map */}
      <MapView store={store} sel={sel} switchStore={switchStore} />

      <main className="app">
        <div className="body">
          {/* identity */}
          <section className="store-id">
            <div className="store-top">
              <div className="store-logo"><BrandGlyph /></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="store-name">{store.name}</div>
                <div className="store-sub">
                  <span className={"status " + (open ? "open" : "closed")}>{open ? `Đang mở · đến ${store.close}` : `Đã đóng · mở ${store.open}`}</span>
                  <span className="meta"><Icon name="star" size={14} color="var(--yellow)" /> {store.rating} <span className="dotsep">·</span> {store.reviews} đánh giá</span>
                </div>
              </div>
            </div>
            <div className="actions">
              <a className="act primary" href={directionsHref(store)} target="_blank" rel="noreferrer">
                <Icon name="nav" size={18} color="#fff" /> Chỉ đường{store.km != null ? ` · ${store.km} km` : ""}
              </a>
              <a className="act ghost" href={"tel:" + store.phone.replace(/\s/g, "")}><Icon name="phone" size={19} /> Gọi</a>
              <button className="act ghost" onClick={() => shareStore(store)}><Icon name="share" size={18} /> Chia sẻ</button>
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
                    <div key={d} className={"hrow" + (i === TODAY_IDX ? " today" : "")}>
                      <span className="d">{d}{i === TODAY_IDX ? " (hôm nay)" : ""}</span>
                      <span className="h">{store.operatingDays.includes(i) ? `${store.open} – ${store.close}` : "Đóng cửa"}</span>
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
              {store.photos && store.photos.length > 0 ? (
                <>
                  {store.photos.slice(0, 4).map((url, i) => (
                    <div className="photo" key={i} style={{ backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                      {i === 3 && store.photos.length > 4 && (
                        <div className="more">+{store.photos.length - 4}</div>
                      )}
                    </div>
                  ))}
                  {store.photos.length < 4 && PHOTO_GRADS.slice(store.photos.length, 4).map((g, i) => (
                    <div className="photo" key={"ph-" + i} style={{ background: g }}>
                      <Icon name="image" size={26} color="rgba(255,255,255,.85)" />
                      <span className="pl">{PHOTO_LABELS[store.photos.length + i]}</span>
                    </div>
                  ))}
                </>
              ) : (
                PHOTO_GRADS.map((g, i) => (
                  <div className="photo" key={i} style={{ background: g }}>
                    <Icon name={i === 1 ? "cup" : i === 2 ? "gift" : "image"} size={i === 0 ? 36 : 26} color="rgba(255,255,255,.85)" />
                    <span className="pl">{PHOTO_LABELS[i]}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* nearby branches */}
          {STORES.length > 1 && (
            <section className="sec">
              <div className="sec-t">Chi nhánh khác gần bạn</div>
              <div className="panel">
                {STORES.map(s => {
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
                        : <div className="bd">{s.km != null && <div className="bkm">{s.km} km</div>}<div className={"bopen " + (s.isOpenNow ? "o" : "c")}>{s.isOpenNow ? "Đang mở" : "Đã đóng"}</div></div>}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      {toast && <div className="toast"><span className="tc"><Icon name="check" size={15} color="#fff" /></span>{toast}</div>}

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
