/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
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

function normPhone(raw) { return raw.replace(/[\s.\-]/g, ""); }
function validPhone(raw) {
  const p = normPhone(raw);
  if (!p) return { ok: false, msg: "Vui lòng nhập số điện thoại" };
  if (!/^(03|05|07|08|09)\d{8}$/.test(p)) return { ok: false, msg: "Số điện thoại không đúng định dạng" };
  return { ok: true };
}
function prettyPhone(raw) { return normPhone(raw).replace(/^0/, "").replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"); }

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
  const [phase, setPhase] = useState("login");   // login | success
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
                <div className="inp-wrap has-prefix">
                  <span className="lic"><Icon name="phone" size={18} /></span>
                  <span className="pfx">+84</span>
                  <input className={"inp" + (touched && !pRes.ok ? " bad" : "")} inputMode="numeric" placeholder="9xx xxx xxx" value={phone}
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
                <button className="forgot">Quên mật khẩu?</button>
              </div>

              {notReg && (
                <div className="notice">
                  <Icon name="info" size={17} color="var(--brand)" />
                  <span>Số <b>+84 {prettyPhone(phone)}</b> chưa có tài khoản. <a href="Laboong Register.html">Đăng ký ngay →</a></span>
                </div>
              )}

              <button className="btn primary" style={{ marginTop: 6 }} disabled={sending} onClick={loginPw}>{sending ? "Đang đăng nhập…" : <>Đăng nhập <Icon name="arrow" size={18} color="#fff" /></>}</button>

              <div className="divider">hoặc tiếp tục với</div>
              <div className="socials">
                <button className="social"><span className="g google">G</span> Google</button>
                <button className="social"><span className="g zalo">Z</span> Zalo</button>
              </div>

              <div className="demo-hint" style={{ marginTop: 16 }}><Icon name="info" size={15} color="var(--ink-3)" /><span>Demo — SĐT đã đăng ký: <b>0912345678</b> · mật khẩu <b>password</b></span></div>
            </>
          )}

          {phase === "success" && <SuccessStep redirect={redirect} />}
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
