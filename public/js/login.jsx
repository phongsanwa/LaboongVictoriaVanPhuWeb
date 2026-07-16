/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, NAV_URLS */
const { useState, useEffect, useRef } = React;

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

function normPhone(raw) { return raw.replace(/[\s.\-]/g, ""); }
function validPhone(raw) {
  const p = normPhone(raw);
  if (!p) return { ok: false, msg: "Vui lòng nhập số điện thoại" };
  if (!/^(03|05|07|08|09)\d{8}$/.test(p)) return { ok: false, msg: "Số điện thoại không đúng định dạng" };
  return { ok: true };
}
function prettyPhone(raw) { return normPhone(raw).replace(/^0(\d{3})(\d{3})(\d{3})$/, "0$1 $2 $3"); }

function fmtTime(s) { return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }

/* ---------------- Forgot Password Flow ---------------- */
function ForgotFlow({ onBack }) {
  const [step, setStep] = useState("phone");   // phone | done
  const [phone, setPhone] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);

  const pRes = validPhone(phone);

  const sendNewPassword = async () => {
    setTouched(true); setErr("");
    if (!pRes.ok || sending) return;
    setSending(true);
    const { ok, data } = await apiPost("/forgot-password/send-new-password", { phone: normPhone(phone) });
    setSending(false);
    if (!ok) { setErr(data.message || "Có lỗi xảy ra"); return; }
    setMaskedEmail(data.email || "");
    setStep("done");
  };

  if (step === "done") return (
    <div className="fp-success">
      <div className="succ-ring"><div className="ck"><Icon name="mail" size={30} color="#fff" /></div></div>
      <h1>Đã gửi mật khẩu mới! 📧</h1>
      <p>
        Mật khẩu mới đã được gửi tới email
        {maskedEmail ? <> <b>{maskedEmail}</b></> : " của bạn"}.<br />
        Kiểm tra hộp thư (cả mục Spam) rồi dùng mật khẩu đó để đăng nhập.<br />
        Sau khi vào được, hãy đổi mật khẩu riêng trong mục Tài khoản nhé.
      </p>
      <button className="btn primary" style={{ marginTop: 24 }} onClick={onBack}>Đăng nhập ngay <Icon name="arrow" size={18} color="#fff" /></button>
    </div>
  );

  // step === "phone"
  return (
    <>
      <button className="fp-back" onClick={onBack}>
        <Icon name="chev" size={16} /> Quay lại đăng nhập
      </button>
      <div className="step-head">
        <h1>Quên mật khẩu</h1>
        <p>Nhập số điện thoại đã đăng ký — mật khẩu mới sẽ được gửi về email của bạn.</p>
      </div>
      <div className="fld">
        <label>Số điện thoại</label>
        <div className="inp-wrap">
          <span className="lic"><Icon name="phone" size={18} /></span>
          <input className={"inp" + (touched && !pRes.ok ? " bad" : "")} inputMode="numeric" placeholder="0912 345 678" value={phone}
            onChange={e => { setPhone(e.target.value.replace(/[^\d\s.\-]/g, "")); setErr(""); }}
            onKeyDown={e => { if (e.key === "Enter") sendNewPassword(); }} />
        </div>
        {touched && !pRes.ok && <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {pRes.msg}</div>}
        {err && <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {err}</div>}
      </div>
      <button className="btn primary" style={{ marginTop: 6 }} disabled={sending} onClick={sendNewPassword}>
        {sending ? "Đang gửi…" : <>Gửi mật khẩu mới về email <Icon name="arrow" size={18} color="#fff" /></>}
      </button>
    </>
  );
}

/* ---------------- Success ---------------- */
function SuccessStep({ redirect }) {
  useEffect(() => { const id = setTimeout(() => { location.href = redirect || NAV_URLS.home; }, 1900); return () => clearTimeout(id); }, [redirect]);
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
  const [phase, setPhase] = useState("login");   // login | forgot | success
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [notReg, setNotReg] = useState(false);
  const [redirect, setRedirect] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const pRes = validPhone(phone);

  const loginPw = async () => {
    setTouched(true); setNotReg(false); setPwErr("");
    if (!pRes.ok || sending) return;
    setSending(true);
    const { ok, data } = await apiPost("/login/password", { phone: normPhone(phone), password: pw, remember });
    setSending(false);
    if (!ok) {
      if (data.not_registered) { setNotReg(true); return; }
      setPwErr(data.message || "Mật khẩu không đúng.");
      return;
    }
    setRedirect(data.redirect || null);
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

              <div className="fld">
                <label>Số điện thoại</label>
                <div className="inp-wrap">
                  <span className="lic"><Icon name="phone" size={18} /></span>
                  <input className={"inp" + (touched && !pRes.ok ? " bad" : "")} inputMode="numeric" placeholder="0912 345 678" value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/[^\d\s.\-]/g, "")); setNotReg(false); }}
                    onKeyDown={e => { if (e.key === "Enter") loginPw(); }} />
                </div>
                {touched && !pRes.ok && <div className="err"><Icon name="info" size={14} color="var(--danger)" /> {pRes.msg}</div>}
              </div>

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

              <div className="row-between">
                <button className="remember" onClick={() => setRemember(r => !r)}>
                  <span className={"check" + (remember ? " on" : "")}>{remember && <Icon name="check" size={14} color="#fff" />}</span> Ghi nhớ đăng nhập
                </button>
                <button className="forgot" onClick={() => setPhase("forgot")}>Quên mật khẩu?</button>
              </div>

              {notReg && (
                <div className="notice">
                  <Icon name="info" size={17} color="var(--brand)" />
                  <span>Số <b>{prettyPhone(phone)}</b> chưa có tài khoản. <a href={NAV_URLS.register}>Đăng ký ngay →</a></span>
                </div>
              )}

              <button className="btn primary" style={{ marginTop: 6 }} disabled={sending} onClick={loginPw}>{sending ? "Đang đăng nhập…" : <>Đăng nhập <Icon name="arrow" size={18} color="#fff" /></>}</button>
            </>
          )}

          {phase === "forgot" && <ForgotFlow onBack={() => setPhase("login")} />}
          {phase === "success" && <SuccessStep redirect={redirect} />}
        </div>

        {(phase === "login") && <div className="foot-note">Chưa có tài khoản? <a href={NAV_URLS.register}>Đăng ký</a></div>}
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
