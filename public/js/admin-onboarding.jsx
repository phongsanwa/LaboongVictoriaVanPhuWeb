/* global React, ReactDOM */
// Onboarding — thiết lập quán lần đầu
const { useState } = React;

function fmtNum(n) { return Math.round(n || 0).toLocaleString("vi-VN"); }
function csrf() { return window.ONBOARDING_CSRF || document.querySelector('meta[name="csrf-token"]')?.content || ""; }

async function api(method, url, body) {
  const r = await fetch(url, {
    method, headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": csrf() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let d = {}; try { d = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, data: d };
}

const FLOW = ["signup", "profile", "costs", "askMore"];
const SUGGESTED = { rent: 15000000, salary: 18000000, utility: 3000000, depreciation: 2000000 };
const COST_LABELS = { rent: "Thuê mặt bằng", salary: "Lương nhân viên", utility: "Điện nước", depreciation: "Khấu hao máy móc" };
const SIZE_OPTIONS = ["Nhỏ (dưới 30m²)", "Vừa (30–60m²)", "Lớn (trên 60m²)"];

function OnboardingApp() {
  const [stepIndex, setStepIndex] = useState(0);
  const [signup, setSignup] = useState({ email: "", password: "" });
  const [stores, setStores] = useState([{ name: "", size: null, costs: { rent: null, salary: null, utility: null, depreciation: null } }]);
  const [activeStoreIdx, setActiveStoreIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const step = stepIndex === "done" ? "done" : (FLOW[stepIndex] || "profile");
  const store = stores[activeStoreIdx];

  const progressSteps = [...FLOW, "done"].map((s, i) => {
    const currentIdx = stepIndex === "done" ? FLOW.length : stepIndex;
    return i <= currentIdx ? "#0F623F" : "#E5E1D6";
  });

  const updateStore = (field, value) => {
    setStores(prev => prev.map((s, i) => i === activeStoreIdx ? { ...s, [field]: value } : s));
  };
  const updateCost = (key, value) => {
    setStores(prev => prev.map((s, i) => i === activeStoreIdx ? { ...s, costs: { ...s.costs, [key]: value === "" ? null : Number(value) } } : s));
  };

  const goNext = () => {
    if (stepIndex < FLOW.length - 1) setStepIndex(s => s + 1);
  };
  const goBack = () => {
    if (stepIndex > 0) setStepIndex(s => s - 1);
  };

  const addAnotherStore = () => {
    const newIdx = stores.length;
    setStores(prev => [...prev, { name: "", size: null, costs: { rent: null, salary: null, utility: null, depreciation: null } }]);
    setActiveStoreIdx(newIdx);
    setStepIndex(1); // go to profile step
  };

  const finish = async () => {
    setSubmitting(true);
    setError(null);
    const { ok, data } = await api("POST", "/setup", {
      email: signup.email,
      password: signup.password,
      stores: stores.map(s => ({ name: s.name, size: s.size, costs: s.costs })),
    });
    setSubmitting(false);
    if (ok) {
      // Redirect to admin
      window.location.href = data.redirect || "/admin";
    } else {
      setError(data.message || Object.values(data.errors || {}).flat().join(", ") || "Đã xảy ra lỗi");
      setStepIndex(0); // back to signup on error
    }
  };

  const costsTotal = ["rent","salary","utility","depreciation"].reduce((s, k) => s + (store.costs[k] || 0), 0);

  const inp = {
    border: "1.5px solid #E5E1D6", borderRadius: 12, padding: "13px 16px",
    fontSize: 14, width: "100%", background: "#F7F5F0",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", background: "#F7F5F0", fontFamily: "'Manrope','Segoe UI',sans-serif" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "#0F623F", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#F2C744", fontSize: 16 }}>T</div>
        <div style={{ fontWeight: 800, fontSize: 17, color: "#1A2420" }}>TràSữa Lãi</div>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 32, width: "100%", maxWidth: 480 }}>
        {progressSteps.map((c, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 4, background: c }} />
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 22, border: "1px solid #EAE6DC", padding: 32 }}>

        {/* Step: Signup */}
        {step === "signup" && (
          <>
            <div style={{ fontSize: 21, fontWeight: 800, color: "#1A2420" }}>Tạo tài khoản</div>
            <div style={{ fontSize: 13.5, color: "#8A9189", marginTop: 4, marginBottom: 22 }}>Chỉ mất 30 giây — bạn có thể bổ sung thông tin sau</div>
            {error && <div style={{ background: "#FBF3F0", border: "1px solid #F2CEC5", borderRadius: 10, padding: "10px 14px", color: "#C0552B", fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input value={signup.email} onChange={e => setSignup(s => ({ ...s, email: e.target.value }))} placeholder="Email" style={inp} />
              <input type="password" value={signup.password} onChange={e => setSignup(s => ({ ...s, password: e.target.value }))} placeholder="Mật khẩu" style={inp} />
            </div>
            <div onClick={goNext} style={{ marginTop: 22, textAlign: "center", padding: 15, borderRadius: 14, background: "#0F623F", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Tiếp tục</div>
          </>
        )}

        {/* Step: Store profile */}
        {step === "profile" && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0F623F", background: "#EAF3EE", display: "inline-block", padding: "4px 10px", borderRadius: 20, marginBottom: 12 }}>
              Cửa hàng {activeStoreIdx + 1}{stores.length > 1 ? " / " + stores.length : ""}
            </div>
            <div style={{ fontSize: 21, fontWeight: 800, color: "#1A2420" }}>Thông tin quán</div>
            <div style={{ fontSize: 13.5, color: "#8A9189", marginTop: 4, marginBottom: 22 }}>Điền nhanh — bạn có thể sửa lại bất cứ lúc nào</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1A2420", marginBottom: 6 }}>Tên quán</div>
                <input value={store.name} onChange={e => updateStore("name", e.target.value)} placeholder="VD: TràSữa Nguyễn Trãi" style={inp} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1A2420", marginBottom: 6 }}>Quy mô quán</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SIZE_OPTIONS.map(opt => (
                    <div key={opt} onClick={() => updateStore("size", opt)} style={{ padding: "9px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: `1.5px solid ${store.size === opt ? "#0F623F" : "#E5E1D6"}`, background: store.size === opt ? "#EAF3EE" : "#fff", color: store.size === opt ? "#0F623F" : "#6B756F" }}>{opt}</div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <div onClick={goBack} style={{ flex: 1, textAlign: "center", padding: 15, borderRadius: 14, background: "#F1EFE7", color: "#6B756F", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>Quay lại</div>
              <div onClick={goNext} style={{ flex: 2, textAlign: "center", padding: 15, borderRadius: 14, background: "#0F623F", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Tiếp tục</div>
            </div>
          </>
        )}

        {/* Step: Fixed costs */}
        {step === "costs" && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0F623F", background: "#EAF3EE", display: "inline-block", padding: "4px 10px", borderRadius: 20, marginBottom: 12 }}>
              Cửa hàng {activeStoreIdx + 1}{stores.length > 1 ? " / " + stores.length : ""}
            </div>
            <div style={{ fontSize: 21, fontWeight: 800, color: "#1A2420" }}>Chi phí cố định mỗi tháng</div>
            <div style={{ fontSize: 13.5, color: "#8A9189", marginTop: 4, marginBottom: 20, lineHeight: 1.5 }}>Dùng để phân bổ vào giá thành sau này. Không chắc số chính xác? Bấm "Dùng gợi ý" rồi sửa lại sau.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {["rent","salary","utility","depreciation"].map(key => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1A2420" }}>{COST_LABELS[key]}</div>
                    <div onClick={() => updateCost(key, SUGGESTED[key])} style={{ fontSize: 11.5, fontWeight: 700, color: "#0F623F", cursor: "pointer", background: "#EAF3EE", padding: "3px 9px", borderRadius: 20 }}>
                      Dùng gợi ý ({fmtNum(SUGGESTED[key])})
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" value={store.costs[key] ?? ""} onChange={e => updateCost(key, e.target.value)} style={inp} />
                    <span style={{ fontSize: 13, color: "#8A9189" }}>đ</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1A2420", marginTop: 16, textAlign: "right" }}>Tổng: {fmtNum(costsTotal)}đ/tháng</div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <div onClick={goBack} style={{ flex: 1, textAlign: "center", padding: 15, borderRadius: 14, background: "#F1EFE7", color: "#6B756F", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>Quay lại</div>
              <div onClick={goNext} style={{ flex: 2, textAlign: "center", padding: 15, borderRadius: 14, background: "#0F623F", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Tiếp tục</div>
            </div>
          </>
        )}

        {/* Step: Ask more stores */}
        {step === "askMore" && (
          <>
            <div style={{ fontSize: 21, fontWeight: 800, color: "#1A2420" }}>Bạn có thêm cửa hàng khác không?</div>
            <div style={{ fontSize: 13.5, color: "#8A9189", marginTop: 4, marginBottom: 24, lineHeight: 1.5 }}>
              Mỗi cửa hàng có chi phí cố định riêng, nhưng dùng chung nguyên liệu và công thức món với "{stores[0].name || "quán đầu tiên"}".
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div onClick={addAnotherStore} style={{ textAlign: "center", padding: 15, borderRadius: 14, background: "#0F623F", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>+ Thêm cửa hàng thứ {stores.length + 1}</div>
              <div onClick={finish} style={{ textAlign: "center", padding: 15, borderRadius: 14, background: "#F1EFE7", color: "#1A2420", fontWeight: 700, fontSize: 14.5, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Đang tạo tài khoản…" : "Chưa, chỉ 1 cửa hàng này thôi"}
              </div>
            </div>
          </>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EAF3EE", color: "#0F623F", fontSize: 26, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>✓</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: "#1A2420" }}>Thiết lập xong!</div>
            <div style={{ fontSize: 13.5, color: "#8A9189", marginTop: 6, marginBottom: 6, lineHeight: 1.5 }}>
              Đã tạo {stores.length > 1 ? `${stores.length} cửa hàng` : "1 cửa hàng"}. Bước tiếp theo: thêm nguyên liệu và xây công thức món đầu tiên để thấy ngay giá vốn thực tế.
            </div>
            <a href="/admin/ingredients" style={{ display: "block", textAlign: "center", marginTop: 20, padding: 15, borderRadius: 14, background: "#0F623F", color: "#fff", fontWeight: 800, fontSize: 15, textDecoration: "none" }}>Bắt đầu nhập nguyên liệu</a>
            <a href="/admin/overview" style={{ display: "block", textAlign: "center", marginTop: 10, padding: 13, borderRadius: 14, background: "#fff", color: "#6B756F", fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>Vào trang chủ</a>
          </div>
        )}

      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(OnboardingApp));
