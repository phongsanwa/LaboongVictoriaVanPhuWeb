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
  if (!raw.trim()) return { ok: true }; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim()) ? { ok: true } : { ok: false, msg: "Email không hợp lệ" };
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
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const phoneRes = validatePhone(data.phone);
  const emailRes = validateEmail(data.email);
  const pwRes = validatePassword(data.password);
  const pw2Res = validatePasswordConfirm(data.password, data.password_confirmation);
  const nameOk = data.name.trim().length >= 2;
  const canSubmit = phoneRes.ok && emailRes.ok && nameOk && pwRes.ok && pw2Res.ok;

  const submit = async () => {
    setTouched({ phone: true, name: true, email: true, password: true, password_confirmation: true });
    setServerError("");
    if (!canSubmit) return;

    setLoading(true);
    const { ok, data: res } = await apiPost("/register", {
      phone: normalizePhone(data.phone), name: data.name, email: data.email, dob: data.dob,
      password: data.password, password_confirmation: data.password_confirmation,
    });
    setLoading(false);

    if (!ok) { setServerError(res.message || "Có lỗi xảy ra, vui lòng thử lại."); return; }
    onNext(res.redirect);
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
          <input className={"inp" + ((touched.phone && !phoneRes.ok) || serverError ? " bad" : "")} inputMode="numeric"
            placeholder="0912 345 678" value={data.phone}
            onChange={e => { setData({ ...data, phone: e.target.value.replace(/[^\d\s.\-]/g, "") }); setServerError(""); }}
            onBlur={() => setTouched(t => ({ ...t, phone: true }))} />
          {phoneRes.ok && data.phone && !serverError && <span className="okmark"><Icon name="check" size={18} /></span>}
        </div>
        {serverError
          ? <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {serverError}</div>
          : touched.phone && !phoneRes.ok
            ? <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {phoneRes.msg}</div>
            : <div className="hint">Dùng để đăng nhập vào tài khoản của bạn.</div>}
      </div>

      <div className="fld">
        <label>Họ và tên<span className="req">*</span></label>
        <div className="inp-wrap">
          <span className="lic"><Icon name="user" size={18} /></span>
          <input className={"inp" + (touched.name && !nameOk ? " bad" : "")}
            placeholder="VD: Nguyễn Minh Anh" value={data.name}
            onChange={e => setData({ ...data, name: e.target.value })}
            onBlur={() => setTouched(t => ({ ...t, name: true }))} />
        </div>
        {touched.name && !nameOk && <div className="err"><Icon name="info" size={14} color="var(--danger)" /> Vui lòng nhập họ tên</div>}
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
        <label>Email<span className="opt">(không bắt buộc)</span></label>
        <div className="inp-wrap">
          <span className="lic"><Icon name="mail" size={18} /></span>
          <input className={"inp" + (touched.email && !emailRes.ok ? " bad" : "")} inputMode="email"
            placeholder="ban@email.com" value={data.email}
            onChange={e => setData({ ...data, email: e.target.value })}
            onBlur={() => setTouched(t => ({ ...t, email: true }))} />
        </div>
        {touched.email && !emailRes.ok && <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {emailRes.msg}</div>}
      </div>

      <div className="fld">
        <label>Ngày sinh<span className="opt">(không bắt buộc)</span></label>
        <div className="inp-wrap">
          <span className="lic"><Icon name="cal" size={18} /></span>
          <input className="inp" type="date" max="2012-12-31" value={data.dob}
            onChange={e => setData({ ...data, dob: e.target.value })} />
        </div>
        <div className="hint">Nhận quà sinh nhật đặc biệt từ Laboong 🎂</div>
      </div>

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
function SuccessStep({ data, redirect }) {
  useEffect(() => { const id = setTimeout(() => { location.href = redirect || NAV_URLS.home; }, 2200); return () => clearTimeout(id); }, [redirect]);
  return (
    <div className="success">
      <div className="succ-ring"><div className="ck"><Icon name="check" size={30} color="#fff" /></div></div>
      <h1>Chào mừng, {data.name.trim().split(/\s+/).slice(-1)[0]}! 🎉</h1>
      <p>Tài khoản của bạn đã được tạo thành công.</p>

      <div className="welcome-card">
        <div className="gico"><Icon name="gift" size={24} color="#fff" /></div>
        <div>
          <div className="wt">Quà chào mừng thành viên mới</div>
          <div className="wv">+50 điểm</div>
        </div>
      </div>

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
          <div className="brand-mark"><span>L</span></div>
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

          {step === 0 && <FormStep data={data} setData={setData} onNext={(redirectUrl) => { setRedirect(redirectUrl); setStep(1); }} />}
          {step === 1 && <SuccessStep data={data} redirect={redirect} />}
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
