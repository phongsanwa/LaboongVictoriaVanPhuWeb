/* global React, ReactDOM, Icon, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect } = React;

const ST_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const SETTINGS_NAV = [
  { key: "general", ic: "building", label: "Thông tin chung" },
  { key: "points", ic: "coin", label: "Quy tắc điểm" },
  { key: "tiers", ic: "star", label: "Hạng thành viên" },
  { key: "notif", ic: "bell", label: "Thông báo" },
  { key: "integrations", ic: "link", label: "Tích hợp" },
];

const TIER_CFG = [
  { label: "Đồng", color: "#A9743F", bg: "#F6EBDF", min: 0, mult: 1 },
  { label: "Bạc", color: "#7C8794", bg: "#EEF1F4", min: 1000, mult: 1.1 },
  { label: "Vàng", color: "#C99A2E", bg: "#FBF1D8", min: 2500, mult: 1.25 },
  { label: "Kim Cương", color: "#1E8FA8", bg: "#DCF0F4", min: 6000, mult: 1.5 },
];

const INTEGRATIONS = [
  { name: "KiotViet POS", desc: "Đồng bộ hoá đơn & tích điểm tự động", logo: "K", grad: "linear-gradient(135deg,#2B6CB0,#4A90D9)", on: true },
  { name: "Zalo OA", desc: "Gửi thông báo & chăm sóc khách qua Zalo", logo: "Z", grad: "linear-gradient(135deg,#0068FF,#3B8BFF)", on: true },
  { name: "VNPAY QR", desc: "Thanh toán QR & tích điểm cùng lúc", logo: "V", grad: "linear-gradient(135deg,#005A9E,#0089D0)", on: false },
  { name: "Google Sheets", desc: "Xuất dữ liệu khách hàng định kỳ", logo: "G", grad: "linear-gradient(135deg,#0F9D58,#34A853)", on: false },
];

function Tog({ on, onClick }) { return <button className={"tog" + (on ? " on" : "")} onClick={onClick} role="switch" aria-checked={on} />; }

function App() {
  const [tw, setTweak] = useTweaks(ST_DEFAULTS);
  const [tab, setTab] = useState("general");
  const [sideOpen, setSideOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  // form state
  const [brand, setBrand] = useState("Laboong");
  const [tagline, setTagline] = useState("Victoria Văn Phú · Trà sữa & cà phê");
  const [email, setEmail] = useState("hello@laboong.vn");
  const [hotline, setHotline] = useState("1900 8386");
  const [perPoint, setPerPoint] = useState(10000);
  const [welcome, setWelcome] = useState(50);
  const [expiry, setExpiry] = useState(12);
  const [rounding, setRounding] = useState("down");
  const [tiers, setTiers] = useState(TIER_CFG);
  const [notif, setNotif] = useState({ earn: true, expiry: true, promo: true, tier: true, birthday: true, weekly: false });
  const [integ, setInteg] = useState(INTEGRATIONS);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const touch = () => { setDirty(true); setSaved(false); };
  const save = () => { setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2600); };
  const setTier = (i, k, v) => { setTiers(t => t.map((x, j) => j === i ? { ...x, [k]: v } : x)); touch(); };
  const toggleNotif = (k) => { setNotif(n => ({ ...n, [k]: !n[k] })); touch(); };
  const toggleInteg = (i) => { setInteg(g => g.map((x, j) => j === i ? { ...x, on: !x.on } : x)); touch(); };

  const NAV = [
    { ic: "chart", label: "Tổng quan" }, { ic: "users", label: "Khách hàng" },
    { ic: "receipt", label: "Điểm & giao dịch" }, { ic: "gift", label: "Đổi quà" },
    { ic: "mega", label: "Chiến dịch" }, { ic: "shield", label: "Phân quyền" },
  ];

  return (
    <div className="shell">
      {sideOpen && <div className="scrim" style={{ zIndex: 55 }} onClick={() => setSideOpen(false)} />}
      <aside className={"side" + (sideOpen ? " open" : "")}>
        <div className="side-brand">
          <div className="side-mark"><span>L</span></div>
          <div><div className="nm">Laboong</div><div className="sb">Bảng quản trị</div></div>
        </div>
        <div className="side-sec">Quản lý</div>
        <nav className="side-nav">
          {NAV.map(n => <a key={n.label} className="side-link" href={adminHref(n.label)}><Icon name={n.ic} size={19} /> {n.label}</a>)}
        </nav>
        <div className="side-sec">Hệ thống</div>
        <nav className="side-nav">
          <a className="side-link on" href={NAV_URLS.adminSettings}><Icon name="gear" size={19} /> Cài đặt</a>
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="side-av">QT</div>
            <div style={{ minWidth: 0 }}><div className="un">Quản trị viên</div><div className="ur">admin@laboong.vn</div></div>
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: "auto" }}><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Hệ thống · Cài đặt</div>
            <h1>Cài đặt</h1>
          </div>
        </header>

        <div className="content">
          <div className="set-wrap">
            {/* left rail */}
            <nav className="set-nav">
              {SETTINGS_NAV.map(n => (
                <button key={n.key} className={"set-navi" + (tab === n.key ? " on" : "")} onClick={() => setTab(n.key)}>
                  <span className="sni"><Icon name={n.ic} size={17} color="currentColor" /></span> {n.label}
                </button>
              ))}
            </nav>

            {/* panels */}
            <div className="set-section">
              {tab === "general" && (
                <div className="scard">
                  <div className="scard-h"><div className="st">Thông tin thương hiệu</div><div className="sd">Hiển thị trong app khách hàng và trên các thông báo.</div></div>
                  <div className="scard-b">
                    <div className="frow">
                      <div className="flabel">Logo<div className="fsub">PNG / SVG, tối thiểu 256px</div></div>
                      <div className="fcontrol">
                        <div className="logo-up">
                          <div className="logo-prev"><span>L</span></div>
                          <div className="logo-up-btns">
                            <button className="btn ghost sm"><Icon name="image" size={15} /> Tải lên</button>
                            <button className="btn ghost sm"><Icon name="trash" size={15} /> Xoá</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="frow">
                      <div className="flabel">Tên thương hiệu</div>
                      <div className="fcontrol"><input className="sinp" value={brand} onChange={e => { setBrand(e.target.value); touch(); }} /></div>
                    </div>
                    <div className="frow">
                      <div className="flabel">Khẩu hiệu<div className="fsub">Dòng mô tả ngắn</div></div>
                      <div className="fcontrol"><input className="sinp" value={tagline} onChange={e => { setTagline(e.target.value); touch(); }} /></div>
                    </div>
                    <div className="frow">
                      <div className="flabel">Liên hệ</div>
                      <div className="fcontrol">
                        <div className="inp-grid">
                          <div className="sinp-affix"><input className="sinp" value={email} onChange={e => { setEmail(e.target.value); touch(); }} /></div>
                          <div className="sinp-affix"><input className="sinp" value={hotline} onChange={e => { setHotline(e.target.value); touch(); }} /></div>
                        </div>
                        <div className="fsub" style={{ marginTop: 7, color: "var(--ink-3)", fontSize: 12 }}>Email hỗ trợ · Hotline</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "points" && (
                <>
                  <div className="scard">
                    <div className="scard-h"><div className="st">Quy tắc tích điểm</div><div className="sd">Cách quy đổi hoá đơn thành điểm thưởng.</div></div>
                    <div className="scard-b">
                      <div className="frow">
                        <div className="flabel">Mức quy đổi<div className="fsub">Số tiền cho mỗi 1 điểm</div></div>
                        <div className="fcontrol">
                          <div className="sinp-affix"><input className="sinp tnum" type="number" value={perPoint} onChange={e => { setPerPoint(+e.target.value || 0); touch(); }} /><span className="suffix">đ / điểm</span></div>
                          <div className="fsub" style={{ marginTop: 8, color: "var(--ink-2)", fontSize: 12.5, fontWeight: 600 }}>Ví dụ: hoá đơn 250.000đ → <b style={{ color: "var(--brand)" }}>+{perPoint > 0 ? fmt(Math.floor(250000 / perPoint)) : 0} điểm</b></div>
                        </div>
                      </div>
                      <div className="frow">
                        <div className="flabel">Điểm chào mừng<div className="fsub">Tặng khi đăng ký mới</div></div>
                        <div className="fcontrol"><div className="sinp-affix"><input className="sinp tnum" type="number" value={welcome} onChange={e => { setWelcome(+e.target.value || 0); touch(); }} /><span className="suffix">điểm</span></div></div>
                      </div>
                      <div className="frow">
                        <div className="flabel">Cách làm tròn<div className="fsub">Khi điểm bị lẻ</div></div>
                        <div className="fcontrol">
                          <div className="miniseg">
                            {[["down", "Làm tròn xuống"], ["nearest", "Gần nhất"], ["up", "Làm tròn lên"]].map(([k, l]) => (
                              <button key={k} className={rounding === k ? "on" : ""} onClick={() => { setRounding(k); touch(); }}>{l}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="scard">
                    <div className="scard-h"><div className="st">Hết hạn điểm</div><div className="sd">Thời gian điểm có hiệu lực kể từ ngày tích.</div></div>
                    <div className="scard-b">
                      <div className="frow">
                        <div className="flabel">Thời hạn điểm</div>
                        <div className="fcontrol"><div className="sinp-affix"><input className="sinp tnum" type="number" value={expiry} onChange={e => { setExpiry(+e.target.value || 0); touch(); }} /><span className="suffix">tháng</span></div></div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tab === "tiers" && (
                <div className="scard">
                  <div className="scard-h"><div className="st">Hạng thành viên</div><div className="sd">Ngưỡng điểm và hệ số tích điểm cho từng hạng.</div></div>
                  <div className="scard-b">
                    {tiers.map((t, i) => (
                      <div className="tier-row" key={t.label}>
                        <span className="tier-dot" style={{ background: t.bg, color: t.color }}><Icon name="star" size={16} color="currentColor" /></span>
                        <div><div className="tier-name">{t.label}</div><div className="tier-sub">{i === 0 ? "Hạng khởi đầu" : `Từ ${fmt(t.min)} điểm`}</div></div>
                        <div className="tier-field">
                          <div className="tfl">Ngưỡng (điểm)</div>
                          <input className="sinp tnum" type="number" value={t.min} disabled={i === 0} onChange={e => setTier(i, "min", +e.target.value || 0)} />
                        </div>
                        <div className="tier-field">
                          <div className="tfl">Hệ số tích</div>
                          <div className="sinp-affix"><input className="sinp tnum" type="number" step="0.05" value={t.mult} onChange={e => setTier(i, "mult", +e.target.value || 1)} /><span className="suffix">×</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "notif" && (
                <div className="scard">
                  <div className="scard-h"><div className="st">Thông báo đẩy</div><div className="sd">Chọn các loại thông báo gửi tự động đến khách hàng.</div></div>
                  <div className="scard-b">
                    {[
                      ["earn", "cup", "Tích điểm thành công", "Gửi ngay sau khi khách tích điểm"],
                      ["expiry", "clock", "Điểm / voucher sắp hết hạn", "Nhắc trước 3 ngày khi sắp hết hạn"],
                      ["promo", "mega", "Khuyến mãi & chiến dịch", "Thông báo các ưu đãi mới"],
                      ["tier", "star", "Lên hạng thành viên", "Chúc mừng khi khách đạt hạng mới"],
                      ["birthday", "gift", "Quà sinh nhật", "Tặng ưu đãi vào dịp sinh nhật"],
                      ["weekly", "chart", "Tổng kết hàng tuần", "Báo cáo điểm & ưu đãi mỗi tuần"],
                    ].map(([k, ic, t, d]) => (
                      <div className="toggle-row" key={k}>
                        <span className="tri"><Icon name={ic} size={18} color="currentColor" /></span>
                        <div><div className="trt">{t}</div><div className="trd">{d}</div></div>
                        <Tog on={notif[k]} onClick={() => toggleNotif(k)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "integrations" && (
                <div className="scard">
                  <div className="scard-h"><div className="st">Tích hợp & kết nối</div><div className="sd">Liên kết Laboong với các nền tảng bên ngoài.</div></div>
                  <div className="scard-b">
                    {integ.map((g, i) => (
                      <div className="intg" key={g.name}>
                        <span className="intg-logo" style={{ background: g.grad }}>{g.logo}</span>
                        <div style={{ minWidth: 0 }}><div className="intg-name">{g.name}</div><div className="intg-desc">{g.desc}</div></div>
                        <div className="intg-status">
                          <span className={"conn-badge " + (g.on ? "on" : "off")}>{g.on ? "Đã kết nối" : "Chưa kết nối"}</span>
                          <button className={"btn sm " + (g.on ? "ghost" : "primary")} onClick={() => toggleInteg(i)}>{g.on ? "Ngắt" : "Kết nối"}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* save bar */}
              <div className="savebar">
                {dirty
                  ? <><span className="si" /><span className="stxt">Có thay đổi chưa được lưu</span></>
                  : saved
                    ? <><span className="si" style={{ background: "var(--ok)" }} /><span className="stxt" style={{ color: "var(--ok)" }}>Đã lưu thay đổi</span></>
                    : <><span className="si" style={{ background: "var(--ink-3)" }} /><span className="stxt">Mọi thay đổi đã được lưu</span></>}
                <div className="sbtns">
                  <button className="btn ghost" disabled={!dirty} onClick={() => setDirty(false)}>Huỷ</button>
                  <button className="btn primary" disabled={!dirty} onClick={save}><Icon name="check" size={16} color="#fff" /> Lưu thay đổi</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
