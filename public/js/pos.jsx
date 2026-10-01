/* global React, ReactDOM, Icon, QRCanvas, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useRef } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const DATA = window.POS_DATA || {
  staff: { name: "Khánh Linh", role: "Thu ngân", store: "Victoria Văn Phú", store_id: 1 },
  stores: [{ id: 1, name: "Victoria Văn Phú" }],
  perPoint: 10000,
};
const PER_POINT = DATA.perPoint;
const STAFF = DATA.staff;
const STORES = DATA.stores || [];
const CAN_ORDERS = !!DATA.canOrders;           // nhân viên có quyền xem đơn hàng
const ORDERS_URL = DATA.ordersUrl || "/admin/orders";

function initials(n) { const p = n.trim().split(/\s+/); return p[p.length - 1][0]; }

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

function QRScanner({ active, onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState("");

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!active) return;
    let stream = null;
    let raf = null;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && window.jsQR) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = window.jsQR(img.data, img.width, img.height);
        if (result && result.data) onScanRef.current(result.data);
      }
      raf = requestAnimationFrame(tick);
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Thiết bị không hỗ trợ camera. Vui lòng nhập mã thủ công.");
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(s => {
        if (stopped) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        raf = requestAnimationFrame(tick);
      })
      .catch(() => setError("Không thể truy cập camera. Vui lòng nhập mã thủ công."));

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [active]);

  if (error) {
    return <div className="scanner-msg"><Icon name="close" size={14} color="#fff" /> {error}</div>;
  }

  return (
    <>
      <video ref={videoRef} className="scanner-video" muted playsInline />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  );
}

function MemberLookup({ code, setCode, onLookup, found, error, busy }) {
  return (
    <div className="member-lookup">
      <div className="fld">
        <input
          className="inp"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onLookup(); }}
          placeholder="Quét hoặc nhập mã thành viên / SĐT"
          autoFocus
        />
      </div>
      {error && <div className="lookup-error"><Icon name="close" size={14} /> {error}</div>}
      {found && (
        <div className="cust-strip found">
          <div className="ca" style={{ background: found.av }}>{initials(found.name)}</div>
          <div style={{ minWidth: 0 }}>
            <div className="cn">{found.name}</div>
            <div className="cm"><span className="cust-tier"><Icon name="star" size={11} color="#C99A2E" /> {found.tier}</span> ID {found.id}</div>
          </div>
        </div>
      )}
      <button className="cta primary" disabled={!code.trim() || busy} onClick={() => onLookup()}>
        {busy ? "Đang tìm…" : found ? <><Icon name="check" size={18} color="#fff" /> Xác nhận tích điểm</> : <>Tìm khách hàng <Icon name="arrow" size={18} color="#fff" /></>}
      </button>
    </div>
  );
}

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  // Cửa hàng đang bán — nhân viên nhiều cửa hàng phải chọn trước khi thao tác
  const multiStore = STORES.length > 1;
  const [storeId, setStoreId] = useState(multiStore ? null : (STAFF.store_id ?? STORES[0]?.id ?? null));
  const [switchStore, setSwitchStore] = useState(false); // mở lại bảng chọn để đổi cửa hàng
  const [mode, setMode] = useState(null);        // null home · "points" · "redeem"
  const [step, setStep] = useState(0);          // 0 bill · 1 method · 2 scan · 3 counter-qr · 4 result
  const [bill, setBill] = useState(0);          // đồng
  const [cust, setCust] = useState(null);
  const [earned, setEarned] = useState(0);
  const [pointsBefore, setPointsBefore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [code, setCode] = useState("");
  const [found, setFound] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const baseEarned = Math.floor(bill / PER_POINT);
  const press = (d) => setBill(b => Math.min(b * 10 + d, 99999999));
  const press000 = () => setBill(b => Math.min(b * 1000, 99999999));
  const delDigit = () => setBill(b => Math.floor(b / 10));
  const add = (v) => setBill(b => Math.min(b + v, 99999999));

  const dotIndex = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3 }[step];

  const lastScanRef = useRef("");
  const resetLookup = () => { setCode(""); setFound(null); setError(""); lastScanRef.current = ""; };

  const goStep = (s) => { resetLookup(); setStep(s); };

  const lookupOrCharge = async (codeOverride) => {
    const c = (codeOverride ?? code).trim();
    if (!c) return;
    setBusy(true);
    setError("");

    if (!found) {
      const { ok, data } = await apiCall("POST", "/pos/points/lookup", { code: c });
      setBusy(false);
      if (!ok) { setError(data.message || "Không tìm thấy khách hàng"); return; }
      setCode(c);
      setFound(data.customer);
      return;
    }

    const { ok, data } = await apiCall("POST", "/pos/points/charge", { code: c, amount: bill, store_id: storeId });
    setBusy(false);
    if (!ok) { setError(data.message || "Có lỗi xảy ra, vui lòng thử lại"); setFound(null); return; }

    setCust(data.customer);
    setEarned(data.earned);
    setPointsBefore(data.pointsBefore);
    setMultiplier(data.multiplier);
    setStep(4);
  };

  const scanLockRef = useRef(false);
  const handleScan = (text) => {
    if (scanLockRef.current || found || text === lastScanRef.current) return;
    scanLockRef.current = true;
    lastScanRef.current = text;
    lookupOrCharge(text).finally(() => { scanLockRef.current = false; });
  };

  const restart = () => { setBill(0); setCust(null); resetLookup(); setStep(0); };

  const goHome = () => { setMode(null); restart(); resetRedeem(); };

  /* ---- redeem (đổi quà) flow ---- */
  const [rCode, setRCode] = useState("");
  const [rFound, setRFound] = useState(null);
  const [rDone, setRDone] = useState(null);
  const [rError, setRError] = useState("");
  const [rBusy, setRBusy] = useState(false);
  const rLastScanRef = useRef("");
  const rScanLockRef = useRef(false);

  const resetRedeem = () => { setRCode(""); setRFound(null); setRDone(null); setRError(""); rLastScanRef.current = ""; };

  const lookupRedeem = async (codeOverride) => {
    const c = (codeOverride ?? rCode).trim();
    if (!c) return;
    setRBusy(true);
    setRError("");
    const { ok, data } = await apiCall("POST", "/pos/redeem/lookup", { code: c });
    setRBusy(false);
    if (!ok) { setRError(data.message || "Không tìm thấy mã đổi quà này"); return; }
    setRCode(c);
    setRFound(data);
  };

  const confirmRedeem = async () => {
    if (!rFound) return;
    setRBusy(true);
    setRError("");
    const { ok, data } = await apiCall("POST", "/pos/redeem/confirm", { code: rFound.code });
    setRBusy(false);
    if (!ok) { setRError(data.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
    setRDone(data);
  };

  const handleRedeemScan = (text) => {
    if (rScanLockRef.current || rFound || text === rLastScanRef.current) return;
    rScanLockRef.current = true;
    rLastScanRef.current = text;
    lookupRedeem(text).finally(() => { rScanLockRef.current = false; });
  };

  const logout = async (e) => {
    e.preventDefault();
    await apiCall("POST", "/logout");
    location.href = "/login";
  };

  const currentStoreName = (STORES.find(s => s.id === storeId) || {}).name || "";
  // Cần chọn cửa hàng: nhân viên nhiều cửa hàng chưa chọn, hoặc đang bấm đổi
  const needStorePick = multiStore && (storeId === null || switchStore);

  const pickStore = (id) => {
    setStoreId(id);
    setSwitchStore(false);
    // đổi cửa hàng giữa chừng → về màn chức năng, huỷ thao tác đang dở
    setMode(null); setStep(0); setBill(0); setCust(null); setFound(null); setCode(""); setError("");
  };

  return (
    <>
      <header className="topbar">
        <a className="tb-mark" href="/" title="Về trang chủ" style={{ textDecoration: "none", cursor: "pointer" }}><BrandGlyph /></a>
        <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
          <div className="tb-title">Tích điểm cho khách</div>
          {multiStore ? (
            <button className="tb-sub" onClick={() => setSwitchStore(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", font: "inherit" }}
              title="Đổi cửa hàng đang bán">
              <Icon name="pin" size={12} /> {currentStoreName || "Chọn cửa hàng"} <Icon name="chevdown" size={13} />
            </button>
          ) : (
            <div className="tb-sub">{currentStoreName || STAFF.store}</div>
          )}
        </div>
        <div className="tb-staff">
          <div className="tb-av">{initials(STAFF.name)}</div>
          <div className="tb-staff-tx"><div className="sn">{STAFF.name}</div><div className="sr">{STAFF.role}</div></div>
        </div>
        <button className="icon-btn" style={{ width: 34, height: 34, marginLeft: 8 }} onClick={logout} title="Đăng xuất"><Icon name="logout" size={16} /></button>
      </header>

      <main className="stage">
        {/* STORE PICK — nhân viên nhiều cửa hàng chọn cửa hàng đang bán */}
        {needStorePick && (
          <div className="card">
            <div className="card-pad">
              <div className="step-title">Chọn cửa hàng đang bán</div>
              <div className="step-desc">Bạn đang bán tại cửa hàng nào? Giao dịch tích điểm sẽ ghi nhận cho cửa hàng này.</div>
              <div className="methods">
                {STORES.map(s => (
                  <button key={s.id} className="method scan" onClick={() => pickStore(s.id)}
                    style={s.id === storeId ? { outline: "2px solid var(--brand)" } : {}}>
                    <div className="mi"><Icon name="pin" size={24} color="#fff" /></div>
                    <div>
                      <div className="mt">{s.name}</div>
                      <div className="md">{s.id === storeId ? "Đang chọn" : "Chọn cửa hàng này"}</div>
                    </div>
                    <span className="mgo"><Icon name={s.id === storeId ? "check" : "chev"} size={18} /></span>
                  </button>
                ))}
              </div>
              {switchStore && storeId !== null && (
                <button className="btn ghost" style={{ marginTop: 14, width: "100%" }} onClick={() => setSwitchStore(false)}>Huỷ</button>
              )}
            </div>
          </div>
        )}

        {/* HOME — choose function */}
        {!needStorePick && mode === null && (
          <div className="card">
            <div className="card-pad">
              <div className="step-title">Chọn chức năng</div>
              <div className="step-desc">Bạn muốn thực hiện thao tác gì cho khách?</div>
              <div className="methods">
                <button className="method scan" onClick={() => setMode("points")}>
                  <div className="mi"><Icon name="coin" size={26} color="#fff" /></div>
                  <div>
                    <div className="mt">Tích điểm cho khách</div>
                    <div className="md">Nhập hoá đơn rồi quét hoặc nhập mã thành viên để tích điểm</div>
                  </div>
                  <span className="mgo"><Icon name="chev" size={18} /></span>
                </button>
                <button className="method redeem" onClick={() => setMode("redeem")}>
                  <div className="mi"><Icon name="gift" size={26} color="#fff" /></div>
                  <div>
                    <div className="mt">Đổi quà cho khách</div>
                    <div className="md">Quét mã voucher / quà khách đã đổi để xác nhận sử dụng</div>
                  </div>
                  <span className="mgo"><Icon name="chev" size={18} /></span>
                </button>
                {CAN_ORDERS && (
                  <a className="method orders" href={ORDERS_URL} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="mi" style={{ background: "linear-gradient(150deg,#2B6CB0,#4A90D9)" }}><Icon name="bag" size={26} color="#fff" /></div>
                    <div>
                      <div className="mt">Quản lý đơn hàng</div>
                      <div className="md">Xem và xử lý đơn đặt online của cửa hàng</div>
                    </div>
                    <span className="mgo"><Icon name="chev" size={18} /></span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {!needStorePick && mode === "points" && <div className="flow-steps">
          {[0, 1, 2, 3].map(i => <span key={i} className={"fdot" + (i === dotIndex ? " on" : i < dotIndex ? " done" : "")} />)}
        </div>}

        {/* STEP 0 — bill */}
        {!needStorePick && mode === "points" && step === 0 && (
          <div className="card">
            <div className="card-pad">
              <button className="linkback" onClick={goHome}>← Trang chủ</button>
              <div className="step-title">Nhập tổng hoá đơn</div>
              <div className="bill-display">
                <div className="bill-label">Tổng tiền hoá đơn</div>
                <div className={"bill-amt tnum" + (bill === 0 ? " zero" : "")}>{fmt(bill)}<span className="cur">đ</span></div>
                <div className="bill-conv"><Icon name="coin" size={16} color="var(--brand)" /> Khách nhận <span className="pp">+{fmt(baseEarned)} điểm</span></div>
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
        {!needStorePick && mode === "points" && step === 1 && (
          <div className="card">
            <div className="card-pad">
              <div className="step-title">Chọn cách tích điểm</div>
              <div className="center-row">
                <div className="bill-chip">
                  Hoá đơn {fmt(bill)}đ · +{fmt(baseEarned)} điểm
                  <button className="e" onClick={() => setStep(0)} title="Sửa hoá đơn"><Icon name="edit" size={14} /></button>
                </div>
              </div>
              <div className="methods">
                <button className="method scan" onClick={() => goStep(2)}>
                  <div className="mi"><Icon name="scan" size={26} color="#fff" /></div>
                  <div>
                    <div className="mt">Nhân viên quét mã khách</div>
                    <div className="md">Khách mở mã QR trong app, bạn dùng máy quét tại quầy</div>
                  </div>
                  <span className="mgo"><Icon name="chev" size={18} /></span>
                </button>
                <button className="method show" onClick={() => goStep(3)}>
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
        {!needStorePick && mode === "points" && step === 2 && (
          <div className="card">
            <div className="card-pad">
              <div className="step-title">Quét mã khách</div>
              <div className="step-desc">Đưa mã QR của khách vào khung hình hoặc nhập mã thành viên</div>
              <div className="scanner">
                <QRScanner active={mode === "points" && step === 2} onScan={handleScan} />
                <span className="scan-corner tl" /><span className="scan-corner tr" />
                <span className="scan-corner bl" /><span className="scan-corner br" />
                <span className="scan-line" />
              </div>
              <MemberLookup code={code} setCode={setCode} onLookup={lookupOrCharge} found={found} error={error} busy={busy} />
              <button className="linkback" onClick={() => setStep(1)} style={{ display: "block", margin: "14px auto 0" }}>← Đổi cách khác</button>
            </div>
          </div>
        )}

        {/* STEP 3 — counter QR for customer to scan */}
        {!needStorePick && mode === "points" && step === 3 && (
          <div className="card">
            <div className="card-pad">
              <div className="step-title">Khách quét mã này</div>
              <div className="step-desc">Mời khách mở app Laboong và quét mã QR bên dưới, sau đó nhập mã thành viên của khách để xác nhận</div>
              <div className="counter-qr">
                <QRCanvas />
                <div className="cq-logo">L</div>
              </div>
              <div className="counter-hint">Hoá đơn <b>{fmt(bill)}đ</b> · khách sẽ nhận <b>+{fmt(baseEarned)} điểm</b></div>
              <MemberLookup code={code} setCode={setCode} onLookup={lookupOrCharge} found={found} error={error} busy={busy} />
              <button className="linkback" onClick={() => setStep(1)} style={{ display: "block", margin: "12px auto 0" }}>← Đổi cách khác</button>
            </div>
          </div>
        )}

        {/* STEP 4 — result */}
        {!needStorePick && mode === "points" && step === 4 && cust && (
          <div className="card">
            <div className="result-head">
              <div className="rh-check"><div className="ck"><Icon name="check" size={26} color="var(--brand)" /></div></div>
              <div className="rh-title">Tích điểm thành công!</div>
              <div className="rh-earned"><span className="pn">+{fmt(earned)}</span><span className="pl">điểm</span></div>
              {multiplier > 1 && <div className="rh-bonus">x{multiplier} điểm áp dụng</div>}
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
                <div className="pts-box"><div className="pl">Điểm cũ</div><div className="pv tnum">{fmt(pointsBefore)}</div></div>
                <div className="arr"><Icon name="arrow" size={20} color="var(--brand)" /></div>
                <div className="pts-box new"><div className="pl">Điểm mới</div><div className="pv tnum">{fmt(cust.points)}</div></div>
              </div>

              <div className="total-row">
                <div className="ti"><Icon name="coin" size={22} color="#fff" /></div>
                <div><div className="tl">Tổng điểm hiện tại</div></div>
                <div className="tv tnum">{fmt(cust.points)}<small>điểm</small></div>
              </div>

              <div className="result-actions">
                <button className="cta ghost" title="In biên nhận"><Icon name="print" size={18} /></button>
                <button className="cta primary" onClick={restart}><Icon name="refresh" size={18} color="#fff" /> Tích cho khách khác</button>
              </div>
            </div>
          </div>
        )}

        {/* REDEEM — scan voucher/redemption code */}
        {!needStorePick && mode === "redeem" && !rDone && (
          <div className="card">
            <div className="card-pad">
              <button className="linkback" onClick={goHome}>← Trang chủ</button>
              <div className="step-title">Quét mã đổi quà</div>
              <div className="step-desc">Đưa mã QR voucher / quà của khách vào khung hình hoặc nhập mã thủ công</div>
              <div className="scanner">
                <QRScanner active={mode === "redeem" && !rFound} onScan={handleRedeemScan} />
                <span className="scan-corner tl" /><span className="scan-corner tr" />
                <span className="scan-corner bl" /><span className="scan-corner br" />
                <span className="scan-line" />
              </div>
              <div className="member-lookup">
                <div className="fld">
                  <input
                    className="inp"
                    value={rCode}
                    onChange={e => setRCode(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !rFound) lookupRedeem(); }}
                    placeholder="Nhập mã voucher / mã đổi quà"
                    autoFocus
                  />
                </div>
                {rError && <div className="lookup-error"><Icon name="close" size={14} /> {rError}</div>}

                {rFound && (
                  <div className="cust-strip found">
                    <div className="ca" style={{ background: rFound.customer.av }}>{initials(rFound.customer.name)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="cn">{rFound.customer.name}</div>
                      <div className="cm"><span className="cust-tier"><Icon name="star" size={11} color="#C99A2E" /> {rFound.customer.tier}</span> ID {rFound.customer.id}</div>
                    </div>
                  </div>
                )}

                {rFound && (
                  <div className="bill-chip" style={{ display: "flex", marginTop: 12 }}>
                    <Icon name="gift" size={16} color="var(--brand)" /> {rFound.reward.name} · {rFound.code}
                  </div>
                )}

                {rFound && !rFound.usable && (
                  <div className="lookup-error"><Icon name="close" size={14} /> Mã này {rFound.status === "used" ? "đã được sử dụng" : "đã hết hạn"}, không thể dùng lại.</div>
                )}

                {!rFound && (
                  <button className="cta primary" disabled={!rCode.trim() || rBusy} onClick={() => lookupRedeem()}>
                    {rBusy ? "Đang tra cứu…" : <>Tra cứu mã <Icon name="arrow" size={18} color="#fff" /></>}
                  </button>
                )}

                {rFound && rFound.usable && (
                  <button className="cta primary" disabled={rBusy} onClick={confirmRedeem}>
                    {rBusy ? "Đang xác nhận…" : <><Icon name="check" size={18} color="#fff" /> Xác nhận sử dụng</>}
                  </button>
                )}

                {rFound && (
                  <button className="linkback" onClick={resetRedeem} style={{ display: "block", margin: "10px auto 0" }}>← Quét mã khác</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* REDEEM — done */}
        {!needStorePick && mode === "redeem" && rDone && (
          <div className="card">
            <div className="result-head">
              <div className="rh-check"><div className="ck"><Icon name="check" size={26} color="var(--brand)" /></div></div>
              <div className="rh-title">Đã dùng quà thành công!</div>
            </div>
            <div className="result-body">
              <div className="cust-strip">
                <div className="ca" style={{ background: rDone.customer.av }}>{initials(rDone.customer.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="cn">{rDone.customer.name}</div>
                  <div className="cm"><span className="cust-tier"><Icon name="star" size={11} color="#C99A2E" /> {rDone.customer.tier}</span> ID {rDone.customer.id}</div>
                </div>
              </div>

              <div className="total-row" style={{ marginTop: 18 }}>
                <div className="ti"><Icon name="gift" size={22} color="#fff" /></div>
                <div><div className="tl">Quà đã dùng</div><div className="cn" style={{ color: "#fff" }}>{rDone.reward.name}</div></div>
              </div>

              <div className="result-actions">
                <button className="cta primary" onClick={resetRedeem}><Icon name="refresh" size={18} color="#fff" /> Quét mã khác</button>
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
