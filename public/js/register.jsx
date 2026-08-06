/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, NAV_URLS */
const { useState, useEffect } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

/* ---------------- backend API helpers ---------------- */
function csrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : "";
}
async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-CSRF-TOKEN": csrfToken(),
    },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }
  return { ok: res.ok, status: res.status, data };
}

/* chuẩn hoá + validate SĐT VN */
function normalizePhone(raw) { return raw.replace(/[\s.\-]/g, ""); }
function validatePhone(raw) {
  const p = normalizePhone(raw);
  if (!p) return { ok: false, msg: "Vui lòng nhập số điện thoại" };
  if (!/^0\d{9}$/.test(p)) return { ok: false, msg: "SĐT phải gồm 10 số, bắt đầu bằng 0" };
  if (!/^(03|05|07|08|09)\d{8}$/.test(p)) return { ok: false, msg: "Đầu số không hợp lệ (03/05/07/08/09)" };
  return { ok: true };
}
function validateEmail(raw) {
  if (!raw.trim()) return { ok: false, msg: "Vui lòng nhập email" };
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim()) ? { ok: true } : { ok: false, msg: "Email không hợp lệ" };
}
/* Ngày sinh: nhập tay dd/mm/yyyy, tự chèn dấu "/" */
function formatDobInput(raw) {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + "/" + d.slice(2);
  return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
}
function validateDob(raw) {
  if (!raw.trim()) return { ok: true }; // optional
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return { ok: false, msg: "Nhập đủ ngày sinh theo dạng dd/mm/yyyy" };
  const d = +m[1], mo = +m[2], y = +m[3];
  const dt = new Date(y, mo - 1, d);
  const valid = dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
  if (!valid || y < 1900 || dt >= new Date()) return { ok: false, msg: "Ngày sinh không hợp lệ" };
  return { ok: true };
}
function dobToISO(raw) {
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

/* Bảng chọn ngày sinh: 3 ô chọn Ngày / Tháng / Năm — chọn thẳng năm, không phải lùi lịch */
function DobPicker({ value, onPick, onClose }) {
  const thisYear = new Date().getFullYear();
  const parsed = (() => {
    const m = (value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? { d: +m[1], mo: +m[2], y: +m[3] } : { d: 1, mo: 1, y: 2000 };
  })();
  const [d, setD]   = useState(parsed.d);
  const [mo, setMo] = useState(parsed.mo);
  const [y, setY]   = useState(parsed.y);

  const daysInMonth = new Date(y, mo, 0).getDate();
  const day = Math.min(d, daysInMonth);
  const years = [];
  for (let yy = thisYear; yy >= 1925; yy--) years.push(yy);

  const selStyle = { flex: 1, padding: "11px 8px", borderRadius: 10, border: "1.5px solid var(--line, #ddd)", background: "var(--card, #fff)", color: "inherit", fontSize: 16, fontFamily: "inherit", outline: "none" };

  const confirm = () => {
    onPick(`${String(day).padStart(2, "0")}/${String(mo).padStart(2, "0")}/${y}`);
    onClose();
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 60 }} onClick={onClose} />
      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 61, marginTop: 6, background: "var(--card, #fff)", border: "1.5px solid var(--brand)", borderRadius: 14, padding: 14, boxShadow: "0 14px 34px rgba(0,0,0,.16)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 8 }}>
          <select style={selStyle} value={day} onChange={e => setD(+e.target.value)} aria-label="Ngày">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={selStyle} value={mo} onChange={e => setMo(+e.target.value)} aria-label="Tháng">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(v => <option key={v} value={v}>Tháng {v}</option>)}
          </select>
          <select style={selStyle} value={y} onChange={e => setY(+e.target.value)} aria-label="Năm">
            {years.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid var(--line, #ddd)", background: "transparent", fontWeight: 600, fontSize: 14, color: "inherit" }}>Huỷ</button>
          <button type="button" onClick={confirm}
            style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14 }}>
            Chọn {String(day).padStart(2, "0")}/{String(mo).padStart(2, "0")}/{y}
          </button>
        </div>
      </div>
    </>
  );
}
function validatePassword(raw) {
  if (!raw) return { ok: false, msg: "Vui lòng nhập mật khẩu" };
  if (raw.length < 6) return { ok: false, msg: "Mật khẩu phải có ít nhất 6 ký tự" };
  return { ok: true };
}
function validatePasswordConfirm(pw, confirm) {
  if (!confirm) return { ok: false, msg: "Vui lòng nhập lại mật khẩu" };
  if (pw !== confirm) return { ok: false, msg: "Mật khẩu xác nhận không khớp" };
  return { ok: true };
}

/* ---------------- Step 1: form ---------------- */
function FormStep({ data, setData, onNext }) {
  const [touched, setTouched] = useState({});
  // Lỗi trả về từ server theo từng field: { phone, email, name, password, dob, _general }
  const [serverErrors, setServerErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [dobPicker, setDobPicker] = useState(false);
  const phoneRes = validatePhone(data.phone);
  const emailRes = validateEmail(data.email);
  const dobRes = validateDob(data.dob);
  const pwRes = validatePassword(data.password);
  const pw2Res = validatePasswordConfirm(data.password, data.password_confirmation);
  const nameOk = data.name.trim().length >= 2;
  const canSubmit = phoneRes.ok && emailRes.ok && dobRes.ok && nameOk && pwRes.ok && pw2Res.ok;

  // Xoá lỗi server của 1 field khi người dùng sửa lại field đó
  const clearServerError = (field) => setServerErrors(prev => {
    if (!prev[field] && !prev._general) return prev;
    const next = { ...prev };
    delete next[field];
    delete next._general;
    return next;
  });

  const submit = async () => {
    setTouched({ phone: true, name: true, email: true, dob: true, password: true, password_confirmation: true });
    setServerErrors({});
    if (!canSubmit) return;

    setLoading(true);
    const { ok, data: res } = await apiPost("/register", {
      phone: normalizePhone(data.phone), name: data.name, email: data.email, dob: dobToISO(data.dob),
      password: data.password, password_confirmation: data.password_confirmation,
    });
    setLoading(false);

    if (!ok) {
      // Gán lỗi đúng field: Laravel trả errors = { field: [msg, ...] }
      const errs = res.errors || {};
      const mapped = {};
      Object.keys(errs).forEach(k => { mapped[k] = Array.isArray(errs[k]) ? errs[k][0] : errs[k]; });
      if (!Object.keys(mapped).length) mapped._general = res.message || "Có lỗi xảy ra, vui lòng thử lại.";
      setServerErrors(mapped);
      return;
    }
    onNext(res.redirect, res.welcome_points);
  };

  return (
    <>
      <div className="step-head">
        <h1>Tạo tài khoản</h1>
        <p>Đăng ký thành viên Laboong để tích điểm và đổi quà.</p>
      </div>

      <div className="fld">
        <label>Số điện thoại<span className="req">*</span></label>
        <div className="inp-wrap">
          <span className="lic"><Icon name="phone" size={18} /></span>
          <input className={"inp" + ((touched.phone && !phoneRes.ok) || serverErrors.phone ? " bad" : "")} inputMode="numeric"
            placeholder="0912 345 678" value={data.phone}
            onChange={e => { setData({ ...data, phone: e.target.value.replace(/[^\d\s.\-]/g, "") }); clearServerError("phone"); }}
            onBlur={() => setTouched(t => ({ ...t, phone: true }))} />
          {phoneRes.ok && data.phone && !serverErrors.phone && <span className="okmark"><Icon name="check" size={18} /></span>}
        </div>
        {serverErrors.phone
          ? <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {serverErrors.phone}</div>
          : touched.phone && !phoneRes.ok
            ? <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {phoneRes.msg}</div>
            : <div className="hint">Dùng để đăng nhập vào tài khoản của bạn.</div>}
      </div>

      <div className="fld">
        <label>Họ và tên<span className="req">*</span></label>
        <div className="inp-wrap">
          <span className="lic"><Icon name="user" size={18} /></span>
          <input className={"inp" + ((touched.name && !nameOk) || serverErrors.name ? " bad" : "")}
            placeholder="VD: Nguyễn Minh Anh" value={data.name}
            onChange={e => { setData({ ...data, name: e.target.value }); clearServerError("name"); }}
            onBlur={() => setTouched(t => ({ ...t, name: true }))} />
        </div>
        {serverErrors.name
          ? <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {serverErrors.name}</div>
          : touched.name && !nameOk
            ? <div className="err"><Icon name="info" size={14} color="var(--danger)" /> Vui lòng nhập họ tên</div>
            : null}
      </div>

      <div className="fld">
        <label>Mật khẩu<span className="req">*</span></label>
        <div className="inp-wrap">
          <span className="lic"><Icon name="lock" size={18} /></span>
          <input className={"inp" + (touched.password && !pwRes.ok ? " bad" : "")} type={showPw ? "text" : "password"}
            placeholder="Tối thiểu 6 ký tự" value={data.password}
            style={{ paddingRight: 50 }}
            onChange={e => setData({ ...data, password: e.target.value })}
            onBlur={() => setTouched(t => ({ ...t, password: true }))} />
          <button type="button" className="eye" onClick={() => setShowPw(s => !s)} tabIndex={-1}><Icon name={showPw ? "eyeoff" : "eye"} size={18} /></button>
        </div>
        {touched.password && !pwRes.ok && <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {pwRes.msg}</div>}
      </div>

      <div className="fld">
        <label>Nhập lại mật khẩu<span className="req">*</span></label>
        <div className="inp-wrap">
          <span className="lic"><Icon name="lock" size={18} /></span>
          <input className={"inp" + (touched.password_confirmation && !pw2Res.ok ? " bad" : "")} type={showPw2 ? "text" : "password"}
            placeholder="Nhập lại mật khẩu" value={data.password_confirmation}
            style={{ paddingRight: 50 }}
            onChange={e => setData({ ...data, password_confirmation: e.target.value })}
            onBlur={() => setTouched(t => ({ ...t, password_confirmation: true }))} />
          <button type="button" className="eye" onClick={() => setShowPw2(s => !s)} tabIndex={-1}><Icon name={showPw2 ? "eyeoff" : "eye"} size={18} /></button>
        </div>
        {touched.password_confirmation && !pw2Res.ok && <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {pw2Res.msg}</div>}
      </div>

      <div className="fld">
        <label>Email<span className="req">*</span></label>
        <div className="inp-wrap">
          <span className="lic"><Icon name="mail" size={18} /></span>
          <input className={"inp" + ((touched.email && !emailRes.ok) || serverErrors.email ? " bad" : "")} inputMode="email"
            placeholder="ban@email.com" value={data.email}
            onChange={e => { setData({ ...data, email: e.target.value }); clearServerError("email"); }}
            onBlur={() => setTouched(t => ({ ...t, email: true }))} />
          {emailRes.ok && data.email && !serverErrors.email && <span className="okmark"><Icon name="check" size={18} /></span>}
        </div>
        {serverErrors.email
          ? <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {serverErrors.email}</div>
          : touched.email && !emailRes.ok
            ? <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {emailRes.msg}</div>
            : null}
      </div>

      <div className="fld" style={{ position: "relative" }}>
        <label>Ngày sinh<span className="opt">(không bắt buộc)</span></label>
        <div className="inp-wrap">
          <span className="lic"><Icon name="cal" size={18} /></span>
          <input className={"inp" + (touched.dob && !dobRes.ok ? " bad" : "")} inputMode="numeric"
            placeholder="dd/mm/yyyy — VD: 20/10/1997" value={data.dob} maxLength={10}
            onClick={() => setDobPicker(true)}
            onChange={e => setData({ ...data, dob: formatDobInput(e.target.value) })}
            onBlur={() => setTouched(t => ({ ...t, dob: true }))} />
          {dobRes.ok && data.dob.length === 10 && <span className="okmark"><Icon name="check" size={18} /></span>}
        </div>
        {dobPicker && (
          <DobPicker value={data.dob}
            onPick={v => { setData({ ...data, dob: v }); setTouched(t => ({ ...t, dob: true })); }}
            onClose={() => setDobPicker(false)} />
        )}
        {touched.dob && !dobRes.ok
          ? <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {dobRes.msg}</div>
          : <div className="hint">Bấm để chọn ngày hoặc gõ trực tiếp · Nhận quà sinh nhật từ Laboong 🎂</div>}
      </div>

      {serverErrors._general && (
        <div className="err" style={{ marginTop: 4 }}><Icon name="info" size={14} color="var(--danger)" /> {serverErrors._general}</div>
      )}

      <button className="btn primary" disabled={!canSubmit || loading} onClick={submit} style={{ marginTop: 6 }}>
        {loading ? "Đang đăng ký…" : <>Đăng ký <Icon name="arrow" size={18} color={canSubmit ? "#fff" : "currentColor"} /></>}
      </button>

      <div className="legal">
        Bằng việc đăng ký, bạn đồng ý với <a href="#">Điều khoản dịch vụ</a> và <a href="#">Chính sách bảo mật</a> của Laboong.
      </div>
    </>
  );
}

/* ---------------- Step 2: success ---------------- */
function SuccessStep({ data, redirect, welcomePoints }) {
  useEffect(() => { const id = setTimeout(() => { location.href = redirect || NAV_URLS.home; }, 2200); return () => clearTimeout(id); }, [redirect]);
  const wp = Number(welcomePoints ?? 0);
  return (
    <div className="success">
      <div className="succ-ring"><div className="ck"><Icon name="check" size={30} color="#fff" /></div></div>
      <h1>Chào mừng, {data.name.trim().split(/\s+/).slice(-1)[0]}! 🎉</h1>
      <p>Tài khoản của bạn đã được tạo thành công.</p>

      {wp > 0 && (
        <div className="welcome-card">
          <div className="gico"><Icon name="gift" size={24} color="#fff" /></div>
          <div>
            <div className="wt">Quà chào mừng thành viên mới</div>
            <div className="wv">+{wp} điểm</div>
          </div>
        </div>
      )}

      <div className="autologin"><span className="spin" /> Đang tự động đăng nhập…</div>
    </div>
  );
}

/* ---------------- Push notification demo ---------------- */
function PushDemo({ onClose }) {
  return (
    <div className="push-demo">
      <div className="notif">
        <div className="notif-h">
          <span className="notif-app">L</span>
          <span className="notif-app-name">Laboong</span>
          <span className="notif-time">bây giờ</span>
          <button className="notif-x" onClick={onClose}><Icon name="close" size={15} /></button>
        </div>
        <div className="notif-title">Voucher sắp hết hạn ⏰</div>
        <div className="notif-body">Voucher “Giảm 30.000đ” của bạn sẽ hết hạn sau 3 ngày. Mở app để sử dụng ngay nhé!</div>
      </div>
    </div>
  );
}

/* ---------------- App ---------------- */
function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ phone: "", name: "", email: "", dob: "", password: "", password_confirmation: "" });
  const [redirect, setRedirect] = useState(null);
  const [welcomePoints, setWelcomePoints] = useState(0);
  const [push, setPush] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const STEPS = ["Thông tin", "Hoàn tất"];

  return (
    <div className="wrap">
      <div className="card">
        <div className="brand">
          <div className="brand-mark"><BrandGlyph /></div>
          <div className="brand-name">Laboong</div>
          <div className="brand-sub">Victoria Văn Phú · Thẻ thành viên</div>
        </div>

        <div className="panel">
          <div className="stepper">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className={"sdot" + (i === step ? " on" : i < step ? " done" : "")}>
                  <span className="sn">{i < step ? <Icon name="check" size={14} color="currentColor" /> : i + 1}</span>
                  <span className="sl">{s}</span>
                </div>
                {i < STEPS.length - 1 && <span className={"sline" + (i < step ? " done" : "")} />}
              </React.Fragment>
            ))}
          </div>

          {step === 0 && <FormStep data={data} setData={setData} onNext={(redirectUrl, wp) => { setRedirect(redirectUrl); setWelcomePoints(wp); setStep(1); }} />}
          {step === 1 && <SuccessStep data={data} redirect={redirect} welcomePoints={welcomePoints} />}
        </div>

        {step === 0 && <div className="foot-note">Đã có tài khoản? <a href={NAV_URLS.login}>Đăng nhập</a></div>}
      </div>

      {push && <PushDemo onClose={() => setPush(false)} />}
      <button className="toggle-demo" onClick={() => setPush(p => !p)}>
        <Icon name="bellpush" size={15} /> {push ? "Ẩn" : "Xem"} push hết hạn
      </button>

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F", "#07432A"], ["#005A36", "#003D24"], ["#7A4A28", "#56331A"], ["#6B4FA0", "#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
