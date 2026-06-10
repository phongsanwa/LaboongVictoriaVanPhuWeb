/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useRef } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

/* tài khoản đã đăng ký (demo) */
const REGISTERED = ["0912845207", "0987213668", "0905558410", "0931234567"];
const DEMO_OTP = "284913";
const DEMO_PW = "laboong";
const OTP_TTL = 180;

function normPhone(raw) { return raw.replace(/[\s.\-]/g, ""); }
function validPhone(raw) {
  const p = normPhone(raw);
  if (!p) return { ok: false, msg: "Vui lòng nhập số điện thoại" };
  if (!/^(03|05|07|08|09)\d{8}$/.test(p)) return { ok: false, msg: "Số điện thoại không đúng định dạng" };
  return { ok: true };
}
function fmtTime(s) { const m = Math.floor(s / 60), ss = s % 60; return `${m}:${String(ss).padStart(2, "0")}`; }
function prettyPhone(raw) { return normPhone(raw).replace(/^0/, "").replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"); }

/* ---------------- OTP entry (shared) ---------------- */
function OtpStep({ phone, onBack, onVerify }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [left, setLeft] = useState(OTP_TTL);
  const [bad, setBad] = useState(false);
  const [shake, setShake] = useState(false);
  const refs = useRef([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);
  useEffect(() => { if (left <= 0) return; const id = setInterval(() => setLeft(l => l - 1), 1000); return () => clearInterval(id); }, [left]);

  const code = digits.join("");
  const full = code.length === 6;
  const expired = left <= 0;

  const setAt = (i, v) => { if (!/^\d?$/.test(v)) return; setBad(false); const nd = [...digits]; nd[i] = v; setDigits(nd); if (v && i < 5) refs.current[i + 1]?.focus(); };
  const onKey = (i, e) => { if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus(); };
  const onPaste = (e) => { const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6); if (!t) return; e.preventDefault(); const nd = ["", "", "", "", "", ""]; for (let i = 0; i < t.length; i++) nd[i] = t[i]; setDigits(nd); refs.current[Math.min(t.length, 5)]?.focus(); };
  const verify = () => { if (expired) return; if (code === DEMO_OTP) return onVerify(); setBad(true); setShake(true); setTimeout(() => setShake(false), 400); };
  const resend = () => { setDigits(["", "", "", "", "", ""]); setLeft(OTP_TTL); setBad(false); refs.current[0]?.focus(); };

  return (
    <>
      <div className="step-head"><h1>Nhập mã xác thực</h1><p>Mã gồm 6 số đã được gửi qua SMS để đăng nhập.</p></div>
      <div className="otp-to">
        <div className="pic"><Icon name="phone" size={18} color="#fff" /></div>
        <div><div className="pn">+84 {prettyPhone(phone)}</div><div className="pl">Mã có hiệu lực trong 3 phút</div></div>
        <button className="edit" onClick={onBack}>Đổi</button>
      </div>
      <div className="otp-inputs" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input key={i} ref={el => refs.current[i] = el} className={"otp-box" + (d ? " filled" : "") + (bad && shake ? " bad" : "")} inputMode="numeric" maxLength={1} value={d} onChange={e => setAt(i, e.target.value)} onKeyDown={e => onKey(i, e)} />
        ))}
      </div>
      {bad && <div className="otp-err" style={{ marginTop: 18 }}><Icon name="info" size={16} color="var(--danger)" /> Mã không đúng. Vui lòng kiểm tra lại.</div>}
      <div className="otp-meta">
        <div className={"otp-timer" + (expired ? " expired" : "")}><Icon name="clock" size={15} color={expired ? "var(--danger)" : "var(--brand)"} />{expired ? "Mã đã hết hạn" : <>Còn lại <span className="tval">{fmtTime(left)}</span></>}</div>
        <button className="otp-resend" disabled={left > OTP_TTL - 15 && !expired} onClick={resend}>{expired ? "Gửi lại mã" : "Gửi lại"}</button>
      </div>
      <button className="btn primary" disabled={!full || expired} onClick={verify}>Đăng nhập <Icon name="arrow" size={18} color={full && !expired ? "#fff" : "currentColor"} /></button>
      <div className="demo-hint"><Icon name="info" size={15} color="var(--ink-3)" /><span>Bản demo — mã OTP mẫu là <b>{DEMO_OTP}</b></span></div>
    </>
  );
}

/* ---------------- Success ---------------- */
function SuccessStep() {
  useEffect(() => { const id = setTimeout(() => { location.href = NAV_URLS.home; }, 1900); return () => clearTimeout(id); }, []);
  return (
    <div className="success">
      <div className="succ-ring"><div className="ck"><Icon name="check" size={30} color="#fff" /></div></div>
      <h1>Đăng nhập thành công! 👋</h1>
      <p>Chào mừng bạn quay lại Laboong. Đang chuyển đến trang chủ…</p>
      <div className="autologin" style={{ marginTop: 20 }}><span className="spin" /> Đang tải tài khoản của bạn…</div>
    </div>
  );
}

/* ---------------- App ---------------- */
function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [method, setMethod] = useState("otp");   // otp | password
  const [phase, setPhase] = useState("login");   // login | otp | success
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [notReg, setNotReg] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const pRes = validPhone(phone);

  const sendOtp = () => {
    setTouched(true); setNotReg(false);
    if (!pRes.ok) return;
    if (!REGISTERED.includes(normPhone(phone))) { setNotReg(true); return; }
    setPhase("otp");
  };
  const loginPw = () => {
    setTouched(true); setNotReg(false); setPwErr("");
    if (!pRes.ok) return;
    if (!REGISTERED.includes(normPhone(phone))) { setNotReg(true); return; }
    if (pw !== DEMO_PW) { setPwErr("Mật khẩu không đúng. (demo: " + DEMO_PW + ")"); return; }
    setPhase("success");
  };

  return (
    <div className="wrap">
      <div className="card">
        <div className="brand">
          <div className="brand-mark"><span>L</span></div>
          <div className="brand-name">Laboong</div>
          <div className="brand-sub">Victoria Văn Phú · Thẻ thành viên</div>
        </div>

        <div className="panel">
          {phase === "login" && (
            <>
              <div className="step-head"><h1>Đăng nhập</h1><p>Chào mừng bạn quay lại! Đăng nhập để tích điểm và đổi quà.</p></div>

              <div className="tabs">
                <button className={method === "otp" ? "on" : ""} onClick={() => { setMethod("otp"); setNotReg(false); }}><Icon name="phone" size={16} color="currentColor" /> Mã OTP</button>
                <button className={method === "password" ? "on" : ""} onClick={() => { setMethod("password"); setNotReg(false); }}><Icon name="lock" size={16} color="currentColor" /> Mật khẩu</button>
              </div>

              <div className="fld">
                <label>Số điện thoại</label>
                <div className="inp-wrap has-prefix">
                  <span className="lic"><Icon name="phone" size={18} /></span>
                  <span className="pfx">+84</span>
                  <input className={"inp" + (touched && !pRes.ok ? " bad" : "")} inputMode="numeric" placeholder="9xx xxx xxx" value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/[^\d\s.\-]/g, "")); setNotReg(false); }}
                    onKeyDown={e => { if (e.key === "Enter" && method === "otp") sendOtp(); }} />
                </div>
                {touched && !pRes.ok && <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {pRes.msg}</div>}
              </div>

              {method === "password" && (
                <div className="fld">
                  <label>Mật khẩu</label>
                  <div className="inp-wrap">
                    <span className="lic"><Icon name="lock" size={18} /></span>
                    <input className={"inp" + (pwErr ? " bad" : "")} type={showPw ? "text" : "password"} placeholder="Nhập mật khẩu" value={pw}
                      style={{ paddingRight: 50 }} onChange={e => { setPw(e.target.value); setPwErr(""); }}
                      onKeyDown={e => { if (e.key === "Enter") loginPw(); }} />
                    <button className="eye" onClick={() => setShowPw(s => !s)} tabIndex={-1}><Icon name={showPw ? "eyeoff" : "eye"} size={18} /></button>
                  </div>
                  {pwErr && <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {pwErr}</div>}
                </div>
              )}

              {method === "password" && (
                <div className="row-between">
                  <button className="remember" onClick={() => setRemember(r => !r)}>
                    <span className={"check" + (remember ? " on" : "")}>{remember && <Icon name="check" size={14} color="#fff" />}</span> Ghi nhớ đăng nhập
                  </button>
                  <button className="forgot">Quên mật khẩu?</button>
                </div>
              )}

              {notReg && (
                <div className="notice">
                  <Icon name="info" size={17} color="var(--brand)" />
                  <span>Số <b>+84 {prettyPhone(phone)}</b> chưa có tài khoản. <a href="Laboong Register.html">Đăng ký ngay →</a></span>
                </div>
              )}

              {method === "otp"
                ? <button className="btn primary" style={{ marginTop: 6 }} onClick={sendOtp}>Gửi mã đăng nhập <Icon name="arrow" size={18} color="#fff" /></button>
                : <button className="btn primary" style={{ marginTop: 6 }} onClick={loginPw}>Đăng nhập <Icon name="arrow" size={18} color="#fff" /></button>}

              <div className="divider">hoặc tiếp tục với</div>
              <div className="socials">
                <button className="social"><span className="g google">G</span> Google</button>
                <button className="social"><span className="g zalo">Z</span> Zalo</button>
              </div>

              <div className="demo-hint" style={{ marginTop: 16 }}><Icon name="info" size={15} color="var(--ink-3)" /><span>Demo — SĐT đã đăng ký: <b>0912845207</b>{method === "password" ? <> · mật khẩu <b>{DEMO_PW}</b></> : <> · OTP <b>{DEMO_OTP}</b></>}</span></div>
            </>
          )}

          {phase === "otp" && <OtpStep phone={phone} onBack={() => setPhase("login")} onVerify={() => setPhase("success")} />}
          {phase === "success" && <SuccessStep />}
        </div>

        {phase === "login" && <div className="foot-note">Chưa có tài khoản? <a href="Laboong Register.html">Đăng ký</a></div>}
      </div>

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
