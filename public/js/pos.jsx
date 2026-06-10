/* global React, ReactDOM, Icon, QRCanvas, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useRef } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const PER_POINT = 10000;  // 10.000đ = 1 điểm
const STAFF = { name: "Khánh Linh", role: "Thu ngân", store: "Victoria Văn Phú" };

const CUSTOMERS = [
  { name: "Nguyễn Minh Anh", id: "LBVP·0257·418", tier: "Hạng Vàng", points: 2450, av: "linear-gradient(140deg,#0F623F,#1AA86A)" },
  { name: "Trần Quốc Bảo",   id: "LBVP·0142·907", tier: "Hạng Bạc",  points: 3140, av: "linear-gradient(140deg,#FF8A5B,#FF6FA5)" },
  { name: "Đỗ Khánh Linh",   id: "LBVP·0391·556", tier: "Hạng Vàng", points: 6450, av: "linear-gradient(140deg,#1E8FA8,#4FC3D9)" },
];

function initials(n) { const p = n.trim().split(/\s+/); return p[p.length - 1][0]; }

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [step, setStep] = useState(0);          // 0 bill · 1 method · 2 scan · 3 counter-qr · 4 result
  const [bill, setBill] = useState(0);          // đồng
  const [cust, setCust] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const earned = Math.floor(bill / PER_POINT);
  const press = (d) => setBill(b => Math.min(b * 10 + d, 99999999));
  const press000 = () => setBill(b => Math.min(b * 1000, 99999999));
  const delDigit = () => setBill(b => Math.floor(b / 10));
  const add = (v) => setBill(b => Math.min(b + v, 99999999));

  const dotIndex = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3 }[step];

  // staff scans customer → simulate detection
  const startScan = () => {
    setStep(2);
    timer.current = setTimeout(() => finish(), 2600);
  };
  // counter QR — customer scans (simulated by button)
  const startCounter = () => setStep(3);

  const finish = () => {
    const c = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
    setCust(c);
    setStep(4);
  };

  const restart = () => { clearTimeout(timer.current); setBill(0); setCust(null); setStep(0); };

  return (
    <>
      <header className="topbar">
        <div className="tb-mark"><span>L</span></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="tb-title">Tích điểm cho khách</div>
          <div className="tb-sub">{STAFF.store}</div>
        </div>
        <div className="tb-staff">
          <div className="tb-av">{initials(STAFF.name)}</div>
          <div><div className="sn">{STAFF.name}</div><div className="sr">{STAFF.role}</div></div>
        </div>
      </header>

      <main className="stage">
        <div className="flow-steps">
          {[0, 1, 2, 3].map(i => <span key={i} className={"fdot" + (i === dotIndex ? " on" : i < dotIndex ? " done" : "")} />)}
        </div>

        {/* STEP 0 — bill */}
        {step === 0 && (
          <div className="card">
            <div className="card-pad">
              <div className="step-title">Nhập tổng hoá đơn</div>
              <div className="bill-display">
                <div className="bill-label">Tổng tiền hoá đơn</div>
                <div className={"bill-amt tnum" + (bill === 0 ? " zero" : "")}>{fmt(bill)}<span className="cur">đ</span></div>
                <div className="bill-conv"><Icon name="coin" size={16} color="var(--brand)" /> Khách nhận <span className="pp">+{fmt(earned)} điểm</span></div>
              </div>
              <div className="quick">
                {[20000, 50000, 100000].map(v => <button key={v} onClick={() => add(v)}>+{fmt(v / 1000)}k</button>)}
              </div>
              <div className="keypad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} className="key" onClick={() => press(n)}>{n}</button>)}
                <button className="key" onClick={press000}>000</button>
                <button className="key" onClick={() => press(0)}>0</button>
                <button className="key del" onClick={delDigit} aria-label="Xoá"><Icon name="del" size={24} /></button>
              </div>
              <button className="cta primary" disabled={bill < PER_POINT} onClick={() => setStep(1)}>
                Tiếp tục <Icon name="arrow" size={18} color={bill < PER_POINT ? "currentColor" : "#fff"} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 1 — method */}
        {step === 1 && (
          <div className="card">
            <div className="card-pad">
              <div className="step-title">Chọn cách tích điểm</div>
              <div className="center-row">
                <div className="bill-chip">
                  Hoá đơn {fmt(bill)}đ · +{fmt(earned)} điểm
                  <button className="e" onClick={() => setStep(0)} title="Sửa hoá đơn"><Icon name="edit" size={14} /></button>
                </div>
              </div>
              <div className="methods">
                <button className="method scan" onClick={startScan}>
                  <div className="mi"><Icon name="scan" size={26} color="#fff" /></div>
                  <div>
                    <div className="mt">Nhân viên quét mã khách</div>
                    <div className="md">Khách mở mã QR trong app, bạn dùng máy quét tại quầy</div>
                  </div>
                  <span className="mgo"><Icon name="chev" size={18} /></span>
                </button>
                <button className="method show" onClick={startCounter}>
                  <div className="mi"><Icon name="qr" size={26} color="#fff" /></div>
                  <div>
                    <div className="mt">Khách quét mã tại quầy</div>
                    <div className="md">Hiển thị mã QR của quầy để khách tự quét bằng app</div>
                  </div>
                  <span className="mgo"><Icon name="chev" size={18} /></span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — staff scanning */}
        {step === 2 && (
          <div className="card">
            <div className="card-pad">
              <div className="step-title">Đang quét mã khách…</div>
              <div className="step-desc">Đưa mã QR của khách vào khung hình</div>
              <div className="scanner">
                <div className="cust-qr"><QRCanvas /></div>
                <span className="scan-corner tl" /><span className="scan-corner tr" />
                <span className="scan-corner bl" /><span className="scan-corner br" />
                <span className="scan-line" />
              </div>
              <div className="scan-status"><span className="spin" /> Đang nhận diện thành viên…</div>
              <button className="linkback" onClick={() => setStep(1)} style={{ display: "block", margin: "14px auto 0" }}>Huỷ quét</button>
            </div>
          </div>
        )}

        {/* STEP 3 — counter QR for customer to scan */}
        {step === 3 && (
          <div className="card">
            <div className="card-pad">
              <div className="step-title">Khách quét mã này</div>
              <div className="step-desc">Mời khách mở app Laboong và quét mã QR bên dưới</div>
              <div className="counter-qr">
                <QRCanvas />
                <div className="cq-logo">L</div>
              </div>
              <div className="counter-hint">Hoá đơn <b>{fmt(bill)}đ</b> · khách sẽ nhận <b>+{fmt(earned)} điểm</b></div>
              <button className="demo-sim" onClick={finish}><Icon name="phone" size={16} /> Mô phỏng: khách đã quét xong</button>
              <button className="linkback" onClick={() => setStep(1)} style={{ display: "block", margin: "12px auto 0" }}>← Đổi cách khác</button>
            </div>
          </div>
        )}

        {/* STEP 4 — result */}
        {step === 4 && cust && (
          <div className="card">
            <div className="result-head">
              <div className="rh-check"><div className="ck"><Icon name="check" size={26} color="var(--brand)" /></div></div>
              <div className="rh-title">Tích điểm thành công!</div>
              <div className="rh-earned"><span className="pn">+{fmt(earned)}</span><span className="pl">điểm</span></div>
            </div>
            <div className="result-body">
              <div className="cust-strip">
                <div className="ca" style={{ background: cust.av }}>{initials(cust.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="cn">{cust.name}</div>
                  <div className="cm"><span className="cust-tier"><Icon name="star" size={11} color="#C99A2E" /> {cust.tier}</span> ID {cust.id}</div>
                </div>
              </div>

              <div className="pts-flow">
                <div className="pts-box"><div className="pl">Điểm cũ</div><div className="pv tnum">{fmt(cust.points)}</div></div>
                <div className="arr"><Icon name="arrow" size={20} color="var(--brand)" /></div>
                <div className="pts-box new"><div className="pl">Điểm mới</div><div className="pv tnum">{fmt(cust.points + earned)}</div></div>
              </div>

              <div className="total-row">
                <div className="ti"><Icon name="coin" size={22} color="#fff" /></div>
                <div><div className="tl">Tổng điểm hiện tại</div></div>
                <div className="tv tnum">{fmt(cust.points + earned)}<small>điểm</small></div>
              </div>

              <div className="result-actions">
                <button className="cta ghost" title="In biên nhận"><Icon name="print" size={18} /></button>
                <button className="cta primary" onClick={restart}><Icon name="refresh" size={18} color="#fff" /> Tích cho khách khác</button>
              </div>
            </div>
          </div>
        )}
      </main>

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
