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
  timing: { prep_base: 5, prep_per_cup: 2, ship_minutes: 15 },
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
    checkinEnabled: DATA.general.checkin_enabled !== false,
    iosGuide: DATA.general.ios_guide_html || "",
    perPoint: DATA.points.per_point,
    welcome: DATA.points.welcome,
    expiry: DATA.points.expiry,
    rounding: DATA.points.rounding,
    prepBase: (DATA.timing || {}).prep_base ?? 5,
    prepPerCup: (DATA.timing || {}).prep_per_cup ?? 2,
    shipMinutes: (DATA.timing || {}).ship_minutes ?? 15,
    weatherEnabled: !!(DATA.surcharge && DATA.surcharge.weather_enabled),
    weatherFee: (DATA.surcharge || {}).weather_fee ?? 0,
    weatherLabel: (DATA.surcharge || {}).weather_label || "Phụ thu thời tiết xấu",
    mapsProvider: (DATA.maps || {}).provider || "auto",
    serpapiKey: (DATA.maps || {}).serpapi_key || "",
    apifyToken: (DATA.maps || {}).apify_token || "",
    apifyPlaceActor: (DATA.maps || {}).apify_place_actor || "compass~crawler-google-places",
    apifyDirActor: (DATA.maps || {}).apify_directions_actor || "zen-studio~google-maps-directions-api",
    goongKey: (DATA.maps || {}).goong_key || "",
    bankEnabled: !!(DATA.payment && DATA.payment.bank_enabled),
    bankCode: (DATA.payment || {}).bank_code || "",
    bankAccountNumber: (DATA.payment || {}).account_number || "",
    bankAccountName: (DATA.payment || {}).account_name || "",
    tiers: DATA.tiers,
    notif: DATA.notifications,
    integ: DATA.integrations,
    tgEnabled: !!(DATA.telegram && DATA.telegram.enabled),
    tgToken: (DATA.telegram && DATA.telegram.bot_token) || "",
    tgChatId: (DATA.telegram && DATA.telegram.chat_id) || "",
    ntfyEnabled: !!(DATA.ntfy && DATA.ntfy.enabled),
    ntfyTopic: (DATA.ntfy && DATA.ntfy.topic) || "",
    ntfyServer: (DATA.ntfy && DATA.ntfy.server) || "",
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
  const [appIconUrl, setAppIconUrl] = useState(DATA.general.app_icon_url || null);
  const [appIconBusy, setAppIconBusy] = useState(false);
  const appIconInputRef = React.useRef(null);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const iosGuideRef = React.useRef(null);
  const iosEditorRef = React.useRef(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  /* TinyMCE cho ô hướng dẫn cài đặt iPhone — chỉ khởi tạo khi đang ở tab "Thông tin chung";
     CDN bị chặn thì tự dùng textarea thường (vẫn nhập & lưu được HTML). */
  useEffect(() => {
    if (tab !== "general") return;
    const tiny = window.tinymce;
    if (!tiny || !iosGuideRef.current) return;
    tiny.init({
      target: iosGuideRef.current,
      height: 300,
      menubar: false,
      language: "vi",
      branding: false,
      plugins: "lists link image table autolink code",
      toolbar: "undo redo | blocks | bold italic underline | bullist numlist | link image table | alignleft aligncenter alignright | removeformat | code",
      relative_urls: false,
      convert_urls: false,
      setup: (editor) => {
        iosEditorRef.current = editor;
        editor.on("init", () => editor.setContent(form.iosGuide || ""));
        editor.on("Change KeyUp Undo Redo SetContent", () => set("iosGuide", editor.getContent()));
      },
    });
    return () => { try { iosEditorRef.current?.remove(); } catch (e) { /* ignore */ } iosEditorRef.current = null; };
  }, [tab]); // eslint-disable-line
  const setTier = (i, k, v) => setForm(f => ({ ...f, tiers: f.tiers.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const toggleNotif = (k) => setForm(f => ({ ...f, notif: { ...f.notif, [k]: !f.notif[k] } }));
  const toggleInteg = (i) => setForm(f => ({ ...f, integ: f.integ.map((x, j) => j === i ? { ...x, on: !x.on } : x) }));

  const [tgTesting, setTgTesting] = useState(false);
  const testTelegram = async () => {
    if (tgTesting) return;
    setTgTesting(true);
    const { ok, data } = await apiCall("POST", "/admin/settings/telegram/test", { bot_token: (form.tgToken || "").trim(), chat_id: (form.tgChatId || "").trim() });
    setTgTesting(false);
    setToast(data.message || (ok ? "Đã gửi thử" : "Không gửi được"));
    setTimeout(() => setToast(null), 3500);
  };

  const [ntfyTesting, setNtfyTesting] = useState(false);
  const testNtfy = async () => {
    if (ntfyTesting) return;
    setNtfyTesting(true);
    const { ok, data } = await apiCall("POST", "/admin/settings/ntfy/test", { topic: (form.ntfyTopic || "").trim(), server: (form.ntfyServer || "").trim() });
    setNtfyTesting(false);
    setToast(data.message || (ok ? "Đã gửi thử" : "Không gửi được"));
    setTimeout(() => setToast(null), 3500);
  };

  const discard = () => setForm(saved);

  const save = async () => {
    setSaving(true);
    const { ok, data } = await apiCall("POST", "/admin/settings", {
      general: { brand: form.brand, tagline: form.tagline, email: form.email, hotline: form.hotline, checkin_enabled: form.checkinEnabled, ios_guide_html: form.iosGuide || null },
      points: { per_point: form.perPoint, welcome: form.welcome, expiry: form.expiry, rounding: form.rounding },
      timing: { prep_base: form.prepBase, prep_per_cup: form.prepPerCup, ship_minutes: form.shipMinutes },
      surcharge: { weather_enabled: form.weatherEnabled, weather_fee: form.weatherFee, weather_label: (form.weatherLabel || "").trim() },
      maps: {
        provider: form.mapsProvider,
        serpapi_key: (form.serpapiKey || "").trim(),
        apify_token: (form.apifyToken || "").trim(),
        apify_place_actor: (form.apifyPlaceActor || "").trim(),
        apify_directions_actor: (form.apifyDirActor || "").trim(),
        goong_key: (form.goongKey || "").trim(),
      },
      payment: {
        bank_enabled: form.bankEnabled,
        bank_code: (form.bankCode || "").trim(),
        account_number: (form.bankAccountNumber || "").trim(),
        account_name: (form.bankAccountName || "").trim(),
      },
      tiers: form.tiers.map(t => ({ id: t.id, min: t.min, mult: t.mult })),
      notifications: form.notif,
      integrations: form.integ.map(g => ({ id: g.id, on: g.on })),
      telegram: { enabled: form.tgEnabled, bot_token: (form.tgToken || "").trim(), chat_id: (form.tgChatId || "").trim() },
      ntfy: { enabled: form.ntfyEnabled, topic: (form.ntfyTopic || "").trim(), server: (form.ntfyServer || "").trim() },
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

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Cài đặt" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />

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
                      <div className="flabel">Icon màn hình chính<div className="fsub">Ảnh khi khách "Thêm vào màn hình chính". Nên vuông, nền đặc, ≥512px. Để trống thì dùng logo.</div></div>
                      <div className="fcontrol">
                        <div className="logo-up">
                          <div className="logo-prev">
                            {appIconUrl ? <img src={appIconUrl} alt="Icon" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} /> : <span>{(form.brand || "L")[0]}</span>}
                          </div>
                          <input ref={appIconInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
                            onChange={e => { uploadAsset("app_icon", e.target.files[0], setAppIconUrl, setAppIconBusy); e.target.value = ""; }} />
                          <div className="logo-up-btns">
                            <button className="btn ghost sm" disabled={appIconBusy} onClick={() => appIconInputRef.current?.click()}><Icon name="image" size={15} /> Tải lên</button>
                            <button className="btn ghost sm" disabled={appIconBusy || !appIconUrl} onClick={() => deleteAsset("app_icon", setAppIconUrl, setAppIconBusy)}><Icon name="trash" size={15} /> Xoá</button>
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
                    <div className="frow">
                      <div className="flabel">Điểm danh hàng ngày<div className="fsub">Bật/tắt mục điểm danh nhận điểm ở trang chủ khách</div></div>
                      <div className="fcontrol" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Tog on={form.checkinEnabled} onClick={() => set("checkinEnabled", !form.checkinEnabled)} />
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: form.checkinEnabled ? "var(--brand)" : "var(--ink-3)" }}>
                          {form.checkinEnabled ? "Đang bật" : "Đang tắt"}
                        </span>
                      </div>
                    </div>
                    <div className="frow" style={{ alignItems: "flex-start" }}>
                      <div className="flabel">
                        Hướng dẫn cài lên iPhone
                        <div className="fsub">Nội dung hiện cho khách khi bấm "Thêm vào màn hình chính" trên iPhone. Để trống = dùng hướng dẫn mặc định.</div>
                      </div>
                      <div className="fcontrol">
                        <textarea ref={iosGuideRef} className="inp" defaultValue={form.iosGuide}
                          onChange={e => set("iosGuide", e.target.value)} rows={6}
                          placeholder="VD: 1. Bấm nút Chia sẻ ở thanh dưới · 2. Chọn 'Thêm vào MH chính' · 3. Bấm Thêm"
                          style={{ resize: "vertical", minHeight: 140, fontFamily: "inherit" }} />
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
                  <div className="scard">
                    <div className="scard-h"><div className="st">Thời gian đơn hàng</div><div className="sd">Dùng để đếm ngược "dự kiến xong" cho khách. Món có thể cài thời gian pha riêng trong Thực đơn.</div></div>
                    <div className="scard-b">
                      <div className="frow">
                        <div className="flabel">Chuẩn bị chung<div className="fsub">Cộng 1 lần cho mỗi đơn</div></div>
                        <div className="fcontrol"><div className="sinp-affix"><input className="sinp tnum" type="number" value={form.prepBase} onChange={e => set("prepBase", +e.target.value || 0)} /><span className="suffix">phút</span></div></div>
                      </div>
                      <div className="frow">
                        <div className="flabel">Pha chế mỗi ly<div className="fsub">Mặc định khi món không cài riêng</div></div>
                        <div className="fcontrol"><div className="sinp-affix"><input className="sinp tnum" type="number" value={form.prepPerCup} onChange={e => set("prepPerCup", +e.target.value || 0)} /><span className="suffix">phút/ly</span></div></div>
                      </div>
                      <div className="frow">
                        <div className="flabel">Thời gian giao hàng<div className="fsub">Cộng thêm với đơn giao tận nơi</div></div>
                        <div className="fcontrol"><div className="sinp-affix"><input className="sinp tnum" type="number" value={form.shipMinutes} onChange={e => set("shipMinutes", +e.target.value || 0)} /><span className="suffix">phút</span></div></div>
                      </div>
                    </div>
                  </div>
                  <div className="scard">
                    <div className="scard-h"><div className="st">Phụ thu thời tiết xấu</div><div className="sd">Bật khi trời mưa/bão để cộng thêm phụ thu vào phí giao hàng. Chỉ áp dụng cho đơn giao tận nơi; hiện thành một dòng riêng trong giỏ của khách.</div></div>
                    <div className="scard-b">
                      <div className="frow">
                        <div className="flabel">Bật phụ thu<div className="fsub">Tắt khi thời tiết bình thường</div></div>
                        <div className="fcontrol"><Tog on={form.weatherEnabled} onClick={() => set("weatherEnabled", !form.weatherEnabled)} /></div>
                      </div>
                      <div className="frow">
                        <div className="flabel">Số tiền phụ thu<div className="fsub">Cộng vào mỗi đơn giao khi đang bật</div></div>
                        <div className="fcontrol"><div className="sinp-affix"><input className="sinp tnum" type="number" min="0" value={form.weatherFee} disabled={!form.weatherEnabled} onChange={e => set("weatherFee", +e.target.value || 0)} /><span className="suffix">đ</span></div></div>
                      </div>
                      <div className="frow">
                        <div className="flabel">Nhãn hiển thị<div className="fsub">Tên dòng phụ thu khách nhìn thấy</div></div>
                        <div className="fcontrol"><input className="sinp" type="text" maxLength={60} value={form.weatherLabel} disabled={!form.weatherEnabled} onChange={e => set("weatherLabel", e.target.value)} placeholder="Phụ thu thời tiết xấu" /></div>
                      </div>
                    </div>
                  </div>
                  <div className="scard">
                    <div className="scard-h"><div className="st">Bản đồ (Google / SerpApi / Apify / Goong)</div><div className="sd">Chọn nhà cung cấp bản đồ cho phần chọn địa chỉ giao hàng. "Tự động" dùng Google trước, khi lỗi (hết hạn mức, chặn key…) thì tự chuyển SerpApi. "Goong" là dịch vụ Việt Nam, nhanh & hợp địa chỉ trong nước.</div></div>
                    <div className="scard-b">
                      <div className="frow">
                        <div className="flabel">Nhà cung cấp<div className="fsub">Áp dụng cho gợi ý địa chỉ, toạ độ & khoảng cách</div></div>
                        <div className="fcontrol">
                          <div className="miniseg">
                            {[["auto", "Tự động"], ["google", "Chỉ Google"], ["serpapi", "Chỉ SerpApi"], ["apify", "Chỉ Apify"], ["goong", "Chỉ Goong"]].map(([k, l]) => (
                              <button key={k} className={form.mapsProvider === k ? "on" : ""} onClick={() => set("mapsProvider", k)}>{l}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {(form.mapsProvider === "auto" || form.mapsProvider === "serpapi") && (
                        <div className="frow">
                          <div className="flabel">SerpApi API key<div className="fsub">Lấy tại serpapi.com → Dashboard → Api Key</div></div>
                          <div className="fcontrol"><input className="sinp" type="password" autoComplete="off" maxLength={200} value={form.serpapiKey} onChange={e => set("serpapiKey", e.target.value)} placeholder="Dán API key…" /></div>
                        </div>
                      )}
                      {form.mapsProvider === "serpapi" && !((form.serpapiKey || "").trim()) && (
                        <div style={{ fontSize: 12.5, color: "var(--hot)", fontWeight: 600, padding: "2px 2px 6px" }}>
                          ⚠ Bạn đang chọn "Chỉ SerpApi" nhưng chưa nhập API key — phần chọn địa chỉ sẽ không hoạt động.
                        </div>
                      )}

                      {form.mapsProvider === "apify" && (<>
                        <div className="frow">
                          <div className="flabel">Apify API token<div className="fsub">Lấy tại apify.com → Settings → Integrations → API token</div></div>
                          <div className="fcontrol"><input className="sinp" type="password" autoComplete="off" maxLength={200} value={form.apifyToken} onChange={e => set("apifyToken", e.target.value)} placeholder="Dán API token…" /></div>
                        </div>
                        <div className="frow">
                          <div className="flabel">Actor tìm địa điểm<div className="fsub">Geocode & gợi ý địa chỉ (mặc định compass~crawler-google-places)</div></div>
                          <div className="fcontrol"><input className="sinp" type="text" autoComplete="off" maxLength={120} value={form.apifyPlaceActor} onChange={e => set("apifyPlaceActor", e.target.value)} placeholder="compass~crawler-google-places" /></div>
                        </div>
                        <div className="frow">
                          <div className="flabel">Actor chỉ đường<div className="fsub">Tính khoảng cách (mặc định zen-studio~google-maps-directions-api)</div></div>
                          <div className="fcontrol"><input className="sinp" type="text" autoComplete="off" maxLength={120} value={form.apifyDirActor} onChange={e => set("apifyDirActor", e.target.value)} placeholder="zen-studio~google-maps-directions-api" /></div>
                        </div>
                        {!((form.apifyToken || "").trim()) && (
                          <div style={{ fontSize: 12.5, color: "var(--hot)", fontWeight: 600, padding: "2px 2px 6px" }}>
                            ⚠ Bạn đang chọn "Chỉ Apify" nhưng chưa nhập API token — phần chọn địa chỉ sẽ không hoạt động.
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: "var(--ink-3)", padding: "2px 2px 4px", lineHeight: 1.5 }}>
                          Apify chạy theo "actor run" nên gợi ý địa chỉ sẽ chậm hơn (vài giây) và tính phí mỗi lượt. Nếu cần gợi ý nhanh, dùng "Tự động" hoặc "Chỉ SerpApi".
                        </div>
                      </>)}

                      {form.mapsProvider === "goong" && (<>
                        <div className="frow">
                          <div className="flabel">Goong API key<div className="fsub">Lấy tại goong.io → Dashboard → API key (REST API Key)</div></div>
                          <div className="fcontrol"><input className="sinp" type="password" autoComplete="off" maxLength={200} value={form.goongKey} onChange={e => set("goongKey", e.target.value)} placeholder="Dán API key…" /></div>
                        </div>
                        {!((form.goongKey || "").trim()) && (
                          <div style={{ fontSize: 12.5, color: "var(--hot)", fontWeight: 600, padding: "2px 2px 6px" }}>
                            ⚠ Bạn đang chọn "Chỉ Goong" nhưng chưa nhập API key — phần chọn địa chỉ sẽ không hoạt động.
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: "var(--ink-3)", padding: "2px 2px 4px", lineHeight: 1.5 }}>
                          Goong dùng đúng key <b>REST API Key</b> (không phải Maptiles Key). Dịch vụ nhanh & hợp địa chỉ Việt Nam.
                        </div>
                      </>)}
                    </div>
                  </div>

                  <div className="scard">
                    <div className="scard-h"><div className="st">Thanh toán chuyển khoản (VietQR)</div><div className="sd">Bật để khách chọn "Chuyển khoản ngân hàng" khi đặt. Sau khi đặt, khách thấy mã VietQR (số tiền + mã đơn) để chuyển khoản; bạn xác nhận "Đã nhận chuyển khoản" trong Đơn hàng.</div></div>
                    <div className="scard-b">
                      <div className="frow">
                        <div className="flabel">Bật chuyển khoản<div className="fsub">Cho khách thanh toán qua ngân hàng</div></div>
                        <div className="fcontrol"><Tog on={form.bankEnabled} onClick={() => set("bankEnabled", !form.bankEnabled)} /></div>
                      </div>
                      <div className="frow">
                        <div className="flabel">Mã ngân hàng<div className="fsub">Vd: VCB, MB, TCB, ACB, BIDV, VPB…</div></div>
                        <div className="fcontrol"><input className="sinp" type="text" maxLength={20} value={form.bankCode} disabled={!form.bankEnabled} onChange={e => set("bankCode", e.target.value)} placeholder="VCB" /></div>
                      </div>
                      <div className="frow">
                        <div className="flabel">Số tài khoản</div>
                        <div className="fcontrol"><input className="sinp tnum" type="text" inputMode="numeric" maxLength={40} value={form.bankAccountNumber} disabled={!form.bankEnabled} onChange={e => set("bankAccountNumber", e.target.value)} placeholder="0123456789" /></div>
                      </div>
                      <div className="frow">
                        <div className="flabel">Chủ tài khoản</div>
                        <div className="fcontrol"><input className="sinp" type="text" maxLength={100} value={form.bankAccountName} disabled={!form.bankEnabled} onChange={e => set("bankAccountName", e.target.value)} placeholder="LABOONG VICTORIA VAN PHU" /></div>
                      </div>
                      {form.bankEnabled && (!(form.bankCode || "").trim() || !(form.bankAccountNumber || "").trim()) && (
                        <div style={{ fontSize: 12.5, color: "var(--hot)", fontWeight: 600, padding: "2px 2px 6px" }}>
                          ⚠ Cần nhập mã ngân hàng và số tài khoản thì mới hiện tùy chọn chuyển khoản cho khách.
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "var(--ink-3)", padding: "2px 2px 4px", lineHeight: 1.5 }}>
                        VietQR miễn phí, không cần hợp đồng. Mã QR tạo tự động từ tài khoản trên. Bạn tự xác nhận đã nhận tiền trong mục Đơn hàng.
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

              {tab === "integrations" && (
                <div className="scard" style={{ marginTop: 16 }}>
                  <div className="scard-h">
                    <div className="st">Gửi đơn hàng qua Telegram</div>
                    <div className="sd">Ngoài email, gửi thông báo đơn mới về nhóm/kênh Telegram.</div>
                  </div>
                  <div className="scard-b">
                    <div className="frow">
                      <div className="flabel">Bật gửi Telegram</div>
                      <div className="fcontrol" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Tog on={form.tgEnabled} onClick={() => set("tgEnabled", !form.tgEnabled)} />
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: form.tgEnabled ? "var(--brand)" : "var(--ink-3)" }}>{form.tgEnabled ? "Đang bật" : "Đang tắt"}</span>
                      </div>
                    </div>
                    <div className="frow">
                      <div className="flabel">Bot Token<div className="fsub">Lấy từ @BotFather trên Telegram</div></div>
                      <div className="fcontrol"><input className="sinp" value={form.tgToken} onChange={e => set("tgToken", e.target.value)} placeholder="123456:ABC-DEF..." /></div>
                    </div>
                    <div className="frow">
                      <div className="flabel">Chat ID<div className="fsub">ID nhóm/kênh/cá nhân nhận thông báo</div></div>
                      <div className="fcontrol">
                        <input className="sinp" value={form.tgChatId} onChange={e => set("tgChatId", e.target.value)} placeholder="-1001234567890" />
                        <div style={{ marginTop: 10 }}>
                          <button className="btn ghost sm" disabled={tgTesting || !form.tgToken.trim() || !form.tgChatId.trim()} onClick={testTelegram}>
                            <Icon name="send" size={15} /> {tgTesting ? "Đang gửi…" : "Gửi thử"}
                          </button>
                          <span style={{ marginLeft: 10, fontSize: 12, color: "var(--ink-3)" }}>Nhớ bấm “Lưu thay đổi” sau khi cấu hình.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "integrations" && (
                <div className="scard" style={{ marginTop: 16 }}>
                  <div className="scard-h">
                    <div className="st">Báo đơn qua ntfy.sh (chuông to)</div>
                    <div className="sd">Thông báo đẩy về điện thoại kèm chuông báo lớn khi có đơn mới.</div>
                  </div>
                  <div className="scard-b">
                    <div className="frow">
                      <div className="flabel">Bật ntfy</div>
                      <div className="fcontrol" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Tog on={form.ntfyEnabled} onClick={() => set("ntfyEnabled", !form.ntfyEnabled)} />
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: form.ntfyEnabled ? "var(--brand)" : "var(--ink-3)" }}>{form.ntfyEnabled ? "Đang bật" : "Đang tắt"}</span>
                      </div>
                    </div>
                    <div className="frow">
                      <div className="flabel">Topic<div className="fsub">Chuỗi bí mật, khó đoán. Cài app ntfy → Subscribe đúng topic này.</div></div>
                      <div className="fcontrol"><input className="sinp" value={form.ntfyTopic} onChange={e => set("ntfyTopic", e.target.value)} placeholder="vd: laboong-vvp-donhang-8x2k" /></div>
                    </div>
                    <div className="frow">
                      <div className="flabel">Server<div className="fsub">Để trống = dùng ntfy.sh miễn phí</div></div>
                      <div className="fcontrol">
                        <input className="sinp" value={form.ntfyServer} onChange={e => set("ntfyServer", e.target.value)} placeholder="https://ntfy.sh" />
                        <div style={{ marginTop: 10 }}>
                          <button className="btn ghost sm" disabled={ntfyTesting || !form.ntfyTopic.trim()} onClick={testNtfy}>
                            <Icon name="send" size={15} /> {ntfyTesting ? "Đang gửi…" : "Gửi thử"}
                          </button>
                          <span style={{ marginLeft: 10, fontSize: 12, color: "var(--ink-3)" }}>Nhớ bấm “Lưu thay đổi” sau khi cấu hình.</span>
                        </div>
                      </div>
                    </div>
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
