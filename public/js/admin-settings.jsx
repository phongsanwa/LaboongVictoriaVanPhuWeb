/* global React, ReactDOM, Icon, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, NAV_URLS, adminHref */
const { useState, useEffect, useMemo } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
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

const DATA = window.ADMIN_SETTINGS_DATA || {
  admin: { name: "Quản trị viên", email: "", initials: "QT" },
  general: { brand: "Laboong", tagline: "", email: "", hotline: "" },
  points: { per_point: 10000, welcome: 50, expiry: 12, rounding: "down" },
  tiers: [],
  notifications: { earn: true, expiry: true, promo: true, tier: true, birthday: true, weekly: false },
  integrations: [],
};

function csrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : "";
}
async function apiCall(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-CSRF-TOKEN": csrfToken(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }
  return { ok: res.ok, status: res.status, data };
}

function Tog({ on, onClick }) { return <button className={"tog" + (on ? " on" : "")} onClick={onClick} role="switch" aria-checked={on} />; }

function buildState() {
  return {
    brand: DATA.general.brand,
    tagline: DATA.general.tagline,
    email: DATA.general.email,
    hotline: DATA.general.hotline,
    perPoint: DATA.points.per_point,
    welcome: DATA.points.welcome,
    expiry: DATA.points.expiry,
    rounding: DATA.points.rounding,
    tiers: DATA.tiers,
    notif: DATA.notifications,
    integ: DATA.integrations,
  };
}

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [tab, setTab] = useState("general");
  const [sideOpen, setSideOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState(buildState);
  const [saved, setSaved] = useState(buildState);
  const [logoUrl, setLogoUrl] = useState(DATA.general.logo_url || null);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = React.useRef(null);
  const [faviconUrl, setFaviconUrl] = useState(DATA.general.favicon_url || null);
  const [faviconBusy, setFaviconBusy] = useState(false);
  const faviconInputRef = React.useRef(null);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setTier = (i, k, v) => setForm(f => ({ ...f, tiers: f.tiers.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const toggleNotif = (k) => setForm(f => ({ ...f, notif: { ...f.notif, [k]: !f.notif[k] } }));
  const toggleInteg = (i) => setForm(f => ({ ...f, integ: f.integ.map((x, j) => j === i ? { ...x, on: !x.on } : x) }));

  const discard = () => setForm(saved);

  const save = async () => {
    setSaving(true);
    const { ok, data } = await apiCall("POST", "/admin/settings", {
      general: { brand: form.brand, tagline: form.tagline, email: form.email, hotline: form.hotline },
      points: { per_point: form.perPoint, welcome: form.welcome, expiry: form.expiry, rounding: form.rounding },
      tiers: form.tiers.map(t => ({ id: t.id, min: t.min, mult: t.mult })),
      notifications: form.notif,
      integrations: form.integ.map(g => ({ id: g.id, on: g.on })),
    });
    setSaving(false);
    if (ok) {
      setSaved(form);
      setToast(data.message || "Đã lưu thay đổi cài đặt");
    } else {
      setToast(data.message || "Có lỗi xảy ra, vui lòng thử lại");
    }
    setTimeout(() => setToast(null), 3000);
  };

  const uploadAsset = async (kind, file, setUrl, setBusy) => {
    if (!file) return;
    setBusy(true);
    const body = new FormData();
    body.append(kind, file);
    const res = await fetch(`/admin/settings/${kind}`, {
      method: "POST",
      headers: { "Accept": "application/json", "X-CSRF-TOKEN": csrfToken() },
      body,
    });
    let data = {};
    try { data = await res.json(); } catch (e) { /* no body */ }
    setBusy(false);
    if (res.ok) {
      setUrl(data[`${kind}_url`]);
      setToast(data.message || "Đã tải lên");
    } else {
      setToast(data.errors?.[kind]?.[0] || data.message || "Có lỗi xảy ra, vui lòng thử lại");
    }
    setTimeout(() => setToast(null), 3000);
  };

  const deleteAsset = async (kind, setUrl, setBusy) => {
    setBusy(true);
    const { ok, data } = await apiCall("DELETE", `/admin/settings/${kind}`);
    setBusy(false);
    if (ok) {
      setUrl(null);
      setToast(data.message || "Đã xoá");
    } else {
      setToast(data.message || "Có lỗi xảy ra, vui lòng thử lại");
    }
    setTimeout(() => setToast(null), 3000);
  };

  const logout = async (e) => {
    e.preventDefault();
    await apiCall("POST", "/logout");
    location.href = NAV_URLS.login;
  };

  const NAV = [
    { ic: "chart", label: "Tổng quan" }, { ic: "users", label: "Khách hàng" },
    { ic: "receipt", label: "Điểm & giao dịch" }, { ic: "gift", label: "Đổi quà" },
    { ic: "mega", label: "Chiến dịch" }, { ic: "shield", label: "Phân quyền" },
    { ic: "gear", label: "Cài đặt", on: true },
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
          {NAV.slice(0, 5).map(n => (
            <a key={n.label} className={"side-link" + (n.on ? " on" : "")} href={adminHref(n.label)}>
              <Icon name={n.ic} size={19} /> {n.label}
            </a>
          ))}
        </nav>
        <div className="side-sec">Hệ thống</div>
        <nav className="side-nav">
          {NAV.slice(5).map(n => (
            <a key={n.label} className={"side-link" + (n.on ? " on" : "")} href={adminHref(n.label)}>
              <Icon name={n.ic} size={19} /> {n.label}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="side-av">{DATA.admin.initials}</div>
            <div style={{ minWidth: 0 }}><div className="un">{DATA.admin.name}</div><div className="ur">{DATA.admin.email}</div></div>
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: "auto" }} onClick={logout} title="Đăng xuất"><Icon name="logout" size={16} /></button>
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
                          <div className="logo-prev">
                            {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} /> : <span>{(form.brand || "L")[0]}</span>}
                          </div>
                          <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: "none" }}
                            onChange={e => { uploadAsset("logo", e.target.files[0], setLogoUrl, setLogoBusy); e.target.value = ""; }} />
                          <div className="logo-up-btns">
                            <button className="btn ghost sm" disabled={logoBusy} onClick={() => logoInputRef.current?.click()}><Icon name="image" size={15} /> Tải lên</button>
                            <button className="btn ghost sm" disabled={logoBusy || !logoUrl} onClick={() => deleteAsset("logo", setLogoUrl, setLogoBusy)}><Icon name="trash" size={15} /> Xoá</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="frow">
                      <div className="flabel">Favicon<div className="fsub">Biểu tượng trên tab trình duyệt, hình vuông</div></div>
                      <div className="fcontrol">
                        <div className="logo-up">
                          <div className="logo-prev" style={{ width: 40, height: 40, borderRadius: 10 }}>
                            {faviconUrl ? <img src={faviconUrl} alt="Favicon" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} /> : <span style={{ fontSize: 18 }}>{(form.brand || "L")[0]}</span>}
                          </div>
                          <input ref={faviconInputRef} type="file" accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/webp" style={{ display: "none" }}
                            onChange={e => { uploadAsset("favicon", e.target.files[0], setFaviconUrl, setFaviconBusy); e.target.value = ""; }} />
                          <div className="logo-up-btns">
                            <button className="btn ghost sm" disabled={faviconBusy} onClick={() => faviconInputRef.current?.click()}><Icon name="image" size={15} /> Tải lên</button>
                            <button className="btn ghost sm" disabled={faviconBusy || !faviconUrl} onClick={() => deleteAsset("favicon", setFaviconUrl, setFaviconBusy)}><Icon name="trash" size={15} /> Xoá</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="frow">
                      <div className="flabel">Tên thương hiệu</div>
                      <div className="fcontrol"><input className="sinp" value={form.brand} onChange={e => set("brand", e.target.value)} /></div>
                    </div>
                    <div className="frow">
                      <div className="flabel">Khẩu hiệu<div className="fsub">Dòng mô tả ngắn</div></div>
                      <div className="fcontrol"><input className="sinp" value={form.tagline} onChange={e => set("tagline", e.target.value)} /></div>
                    </div>
                    <div className="frow">
                      <div className="flabel">Liên hệ</div>
                      <div className="fcontrol">
                        <div className="inp-grid">
                          <div className="sinp-affix"><input className="sinp" value={form.email} onChange={e => set("email", e.target.value)} /></div>
                          <div className="sinp-affix"><input className="sinp" value={form.hotline} onChange={e => set("hotline", e.target.value)} /></div>
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
                          <div className="sinp-affix"><input className="sinp tnum" type="number" value={form.perPoint} onChange={e => set("perPoint", +e.target.value || 0)} /><span className="suffix">đ / điểm</span></div>
                          <div className="fsub" style={{ marginTop: 8, color: "var(--ink-2)", fontSize: 12.5, fontWeight: 600 }}>Ví dụ: hoá đơn 250.000đ → <b style={{ color: "var(--brand)" }}>+{form.perPoint > 0 ? fmt(Math.floor(250000 / form.perPoint)) : 0} điểm</b></div>
                        </div>
                      </div>
                      <div className="frow">
                        <div className="flabel">Điểm chào mừng<div className="fsub">Tặng khi đăng ký mới</div></div>
                        <div className="fcontrol"><div className="sinp-affix"><input className="sinp tnum" type="number" value={form.welcome} onChange={e => set("welcome", +e.target.value || 0)} /><span className="suffix">điểm</span></div></div>
                      </div>
                      <div className="frow">
                        <div className="flabel">Cách làm tròn<div className="fsub">Khi điểm bị lẻ</div></div>
                        <div className="fcontrol">
                          <div className="miniseg">
                            {[["down", "Làm tròn xuống"], ["nearest", "Gần nhất"], ["up", "Làm tròn lên"]].map(([k, l]) => (
                              <button key={k} className={form.rounding === k ? "on" : ""} onClick={() => set("rounding", k)}>{l}</button>
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
                        <div className="fcontrol"><div className="sinp-affix"><input className="sinp tnum" type="number" value={form.expiry} onChange={e => set("expiry", +e.target.value || 0)} /><span className="suffix">tháng</span></div></div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tab === "tiers" && (
                <div className="scard">
                  <div className="scard-h"><div className="st">Hạng thành viên</div><div className="sd">Ngưỡng điểm và hệ số tích điểm cho từng hạng.</div></div>
                  <div className="scard-b">
                    {form.tiers.map((t, i) => (
                      <div className="tier-row" key={t.id}>
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
                        <Tog on={form.notif[k]} onClick={() => toggleNotif(k)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "integrations" && (
                <div className="scard">
                  <div className="scard-h"><div className="st">Tích hợp & kết nối</div><div className="sd">Liên kết Laboong với các nền tảng bên ngoài.</div></div>
                  <div className="scard-b">
                    {form.integ.map((g, i) => (
                      <div className="intg" key={g.id}>
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
                  : <><span className="si" style={{ background: "var(--ink-3)" }} /><span className="stxt">Mọi thay đổi đã được lưu</span></>}
                <div className="sbtns">
                  <button className="btn ghost" disabled={!dirty || saving} onClick={discard}>Huỷ</button>
                  <button className="btn primary" disabled={!dirty || saving} onClick={save}><Icon name="check" size={16} color="#fff" /> {saving ? "Đang lưu…" : "Lưu thay đổi"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
