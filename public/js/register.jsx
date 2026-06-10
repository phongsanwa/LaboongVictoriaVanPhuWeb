/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useRef, useMemo } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

/* mock: số đã đăng ký (để test "unique") */
const TAKEN = ["0912845207", "0987213668", "0905558410"];
const OTP_TTL = 180;       // 3 phút
const DEMO_CODE = "284913";

/* chuẩn hoá + validate SĐT VN */
function normalizePhone(raw) { return raw.replace(/[\s.\-]/g, ""); }
function validatePhone(raw) {
  const p = normalizePhone(raw);
  if (!p) return { ok: false, msg: "Vui lòng nhập số điện thoại" };
  if (!/^0\d{9}$/.test(p)) return { ok: false, msg: "SĐT phải gồm 10 số, bắt đầu bằng 0" };
  if (!/^(03|05|07|08|09)\d{8}$/.test(p)) return { ok: false, msg: "Đầu số không hợp lệ (03/05/07/08/09)" };
  if (TAKEN.includes(p)) return { ok: false, msg: "Số điện thoại này đã được đăng ký" };
  return { ok: true };
}
function validateEmail(raw) {
  if (!raw.trim()) return { ok: true }; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim()) ? { ok: true } : { ok: false, msg: "Email không hợp lệ" };
}
function fmtTime(s) { const m = Math.floor(s / 60), ss = s % 60; return `${m}:${String(ss).padStart(2, "0")}`; }

/* ---------------- Step 1: form ---------------- */
function FormStep({ data, setData, onNext }) {
  const [touched, setTouched] = useState({});
  const phoneRes = validatePhone(data.phone);
  const emailRes = validateEmail(data.email);
  const nameOk = data.name.trim().length >= 2;
  const canSubmit = phoneRes.ok && emailRes.ok && nameOk;

  const submit = () => {
    setTouched({ phone: true, name: true, email: true });
    if (canSubmit) onNext();
  };

  return (
    <>
      <div className="step-head">
        <h1>Tạo tài khoản</h1>
        <p>Đăng ký thành viên Laboong để tích điểm và đổi quà.</p>
      </div>

      <div className="fld">
        <label>Số điện thoại<span className="req">*</span></label>
        <div className="inp-wrap has-prefix">
          <span className="lic"><Icon name="phone" size={18} /></span>
          <span className="pfx">+84</span>
          <input className={"inp" + (touched.phone && !phoneRes.ok ? " bad" : "")} inputMode="numeric"
            placeholder="9xx xxx xxx" value={data.phone}
            onChange={e => setData({ ...data, phone: e.target.value.replace(/[^\d\s.\-]/g, "") })}
            onBlur={() => setTouched(t => ({ ...t, phone: true }))} />
          {phoneRes.ok && data.phone && <span className="okmark"><Icon name="check" size={18} /></span>}
        </div>
        {touched.phone && !phoneRes.ok
          ? <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {phoneRes.msg}</div>
          : <div className="hint">Dùng để đăng nhập và nhận mã OTP xác thực.</div>}
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

      <button className="btn primary" disabled={!canSubmit} onClick={submit} style={{ marginTop: 6 }}>
        Gửi mã xác thực <Icon name="arrow" size={18} color={canSubmit ? "#fff" : "currentColor"} />
      </button>

      <div className="legal">
        Bằng việc đăng ký, bạn đồng ý với <a href="#">Điều khoản dịch vụ</a> và <a href="#">Chính sách bảo mật</a> của Laboong.
      </div>
    </>
  );
}

/* ---------------- Step 2: OTP ---------------- */
function OtpStep({ data, onBack, onVerify }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [left, setLeft] = useState(OTP_TTL);
  const [bad, setBad] = useState(false);
  const [shake, setShake] = useState(false);
  const refs = useRef([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft(l => l - 1), 1000);
    return () => clearInterval(id);
  }, [left]);

  const code = digits.join("");
  const full = code.length === 6;
  const expired = left <= 0;

  const setAt = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    setBad(false);
    const nd = [...digits]; nd[i] = v; setDigits(nd);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };
  const onKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };
  const onPaste = (e) => {
    const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!t) return;
    e.preventDefault();
    const nd = ["", "", "", "", "", ""];
    for (let i = 0; i < t.length; i++) nd[i] = t[i];
    setDigits(nd);
    refs.current[Math.min(t.length, 5)]?.focus();
  };

  const verify = () => {
    if (expired) return;
    if (code === DEMO_CODE) { onVerify(); return; }
    setBad(true); setShake(true);
    setTimeout(() => setShake(false), 400);
  };
  const resend = () => { setDigits(["", "", "", "", "", ""]); setLeft(OTP_TTL); setBad(false); refs.current[0]?.focus(); };

  return (
    <>
      <div className="step-head">
        <h1>Nhập mã xác thực</h1>
        <p>Chúng tôi đã gửi mã gồm 6 số qua SMS tới số điện thoại của bạn.</p>
      </div>

      <div className="otp-to">
        <div className="pic"><Icon name="phone" size={18} color="#fff" /></div>
        <div>
          <div className="pn">+84 {normalizePhone(data.phone).replace(/^0/, "").replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}</div>
          <div className="pl">Mã có hiệu lực trong 3 phút</div>
        </div>
        <button className="edit" onClick={onBack}>Sửa</button>
      </div>

      <div className={"otp-inputs"} onPaste={onPaste}>
        {digits.map((d, i) => (
          <input key={i} ref={el => refs.current[i] = el} className={"otp-box" + (d ? " filled" : "") + (bad && shake ? " bad" : "")}
            inputMode="numeric" maxLength={1} value={d}
            onChange={e => setAt(i, e.target.value)} onKeyDown={e => onKey(i, e)} />
        ))}
      </div>

      {bad && <div className="otp-err" style={{ marginTop: 18 }}><Icon name="info" size={16} color="var(--danger)" /> Mã không đúng. Vui lòng kiểm tra lại.</div>}

      <div className="otp-meta">
        <div className={"otp-timer" + (expired ? " expired" : "")}>
          <Icon name="clock" size={15} color={expired ? "var(--danger)" : "var(--brand)"} />
          {expired ? "Mã đã hết hạn" : <>Còn lại <span className="tval">{fmtTime(left)}</span></>}
        </div>
        <button className="otp-resend" disabled={left > OTP_TTL - 15 && !expired} onClick={resend}>
          {expired ? "Gửi lại mã" : "Gửi lại"}
        </button>
      </div>

      <button className="btn primary" disabled={!full || expired} onClick={verify}>
        Xác nhận <Icon name="check" size={18} color={full && !expired ? "#fff" : "currentColor"} />
      </button>

      <div className="demo-hint"><Icon name="info" size={15} color="var(--ink-3)" /><span>Bản demo — mã OTP mẫu là <b>{DEMO_CODE}</b></span></div>
    </>
  );
}

/* ---------------- Step 3: success ---------------- */
function SuccessStep({ data }) {
  useEffect(() => { const id = setTimeout(() => { location.href = NAV_URLS.home; }, 2200); return () => clearTimeout(id); }, []);
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
  const [data, setData] = useState({ phone: "", name: "", email: "", dob: "" });
  const [push, setPush] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const STEPS = ["Thông tin", "Xác thực", "Hoàn tất"];

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

          {step === 0 && <FormStep data={data} setData={setData} onNext={() => setStep(1)} />}
          {step === 1 && <OtpStep data={data} onBack={() => setStep(0)} onVerify={() => setStep(2)} />}
          {step === 2 && <SuccessStep data={data} />}
        </div>

        {step === 0 && <div className="foot-note">Đã có tài khoản? <a href="#">Đăng nhập</a></div>}
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
