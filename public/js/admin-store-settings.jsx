/* global React, ReactDOM */
const { useState, useEffect, useMemo } = React;

const DATA = window.STORE_SETTINGS_DATA;
const BASE_KEYS = ["rent", "salary", "utility", "depreciation"];
const BASE_LABELS = { rent: "Thuê mặt bằng", salary: "Lương nhân viên", utility: "Điện nước", depreciation: "Khấu hao máy móc" };

const C = { brand: "#0F623F", brand2: "#3D8B63", gold: "#F2C744", ink: "#1A2420", ink2: "#6B756F", ink3: "#8A9189", line: "#EAE6DC", field: "#E5E1D6", bg: "#F7F5F0", danger: "#C0552B" };
const inputStyle = { borderWidth: 1.5, borderStyle: "solid", borderColor: C.field, borderRadius: 12, padding: "12px 14px", fontSize: 14, width: "100%", background: C.bg, font: "inherit", color: C.ink, outline: "none" };
const card = { background: "#fff", borderRadius: 20, border: `1px solid ${C.line}`, padding: 28 };

const fmt = n => Math.round(n || 0).toLocaleString("vi-VN") + "đ";
const monthLabel = ym => `Tháng ${Number(ym.split("-")[1])}`;
const zeroCosts = () => ({ rent: 0, salary: 0, utility: 0, depreciation: 0 });
const amountOf = v => (v && typeof v === "object" ? Number(v.amount) || 0 : Number(v) || 0);
const clone = o => JSON.parse(JSON.stringify(o));

function fromServer(stores) {
  return stores.map(s => ({
    ...s,
    costsByMonth: Array.isArray(s.costsByMonth) ? {} : (s.costsByMonth || {}),
    dirtyProfile: false,
    dirtyMonths: {},
  }));
}

function nextMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/* Costs in force for a month: its own entry, else the latest earlier month that has one. */
function costsForMonth(store, months, month) {
  if (store.costsByMonth[month]) return { costs: store.costsByMonth[month], carriedFrom: null };
  const earlier = months.filter(m => m < month).sort().reverse();
  for (const m of earlier) {
    if (store.costsByMonth[m]) return { costs: store.costsByMonth[m], carriedFrom: m };
  }
  return { costs: zeroCosts(), carriedFrom: null };
}

function FocusInput(props) {
  const [focus, setFocus] = useState(false);
  return <input {...props} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
    style={{ ...inputStyle, ...(props.style || {}), ...(focus ? { borderColor: C.brand, background: "#fff" } : {}) }} />;
}

function useNarrow(px) {
  const [narrow, setNarrow] = useState(() => window.innerWidth < px);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < px);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [px]);
  return narrow;
}

function StoreSettingsApp() {
  const narrow = useNarrow(600);
  const cardStyle = { ...card, padding: narrow ? 18 : 28 };
  const [stores, setStores] = useState(() => fromServer(DATA.stores));
  const [months, setMonths] = useState(DATA.months);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeMonth, setActiveMonth] = useState(DATA.currentMonth);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const store = stores[activeIdx] || stores[0];
  const dirty = stores.some(s => s.dirtyProfile || Object.keys(s.dirtyMonths).length > 0);

  useEffect(() => {
    const warn = e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patchStore = (fn) => setStores(list => list.map((s, i) => (i === activeIdx ? fn(clone(s)) : s)));

  const updateField = (field, value) => patchStore(s => ({ ...s, [field]: value, dirtyProfile: true }));

  // Editing a carried-forward month materialises it as its own copy first.
  const editMonthCosts = (mutate) => patchStore(s => {
    const { costs } = costsForMonth(s, months, activeMonth);
    const own = s.costsByMonth[activeMonth] ? s.costsByMonth[activeMonth] : clone(costs);
    mutate(own);
    s.costsByMonth[activeMonth] = own;
    s.dirtyMonths[activeMonth] = true;
    return s;
  });

  const updateCost = (key, value) => editMonthCosts(c => {
    const n = value === "" ? 0 : Math.max(0, Number(value));
    if (key.startsWith("custom_")) c[key] = { ...(c[key] || { label: "" }), amount: n };
    else c[key] = n;
  });
  const updateCustomLabel = (key, label) => editMonthCosts(c => { c[key] = { ...(c[key] || { amount: 0 }), label }; });
  const addCustomCost = () => editMonthCosts(c => { c["custom_" + Date.now()] = { label: "", amount: 0 }; });
  const removeCustomCost = (key) => editMonthCosts(c => { delete c[key]; });

  const addMonth = () => {
    const last = months[months.length - 1];
    const key = nextMonth(last);
    setMonths(ms => (ms.includes(key) ? ms : [...ms, key]));
    setActiveMonth(key);
  };

  const addStore = () => {
    setStores(list => [...list, {
      id: null, name: "Cửa hàng mới", address: "", size: null,
      costsByMonth: { [activeMonth]: zeroCosts() }, dirtyProfile: true, dirtyMonths: { [activeMonth]: true },
    }]);
    setActiveIdx(stores.length);
  };

  const deleteStore = async () => {
    if (stores.length <= 1) return;
    const target = store;
    if (!window.confirm(`Xoá cửa hàng "${target.name || "Cửa hàng mới"}"? Thao tác này không hoàn tác được.`)) return;
    if (target.id) {
      setError(null);
      const res = await fetch(DATA.urls.deleteStore.replace("__ID__", target.id), {
        method: "DELETE",
        headers: { Accept: "application/json", "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || "Không xoá được cửa hàng.");
        return;
      }
    }
    setStores(list => list.filter((_, i) => i !== activeIdx));
    setActiveIdx(i => Math.max(0, i - 1));
    setNotice("Đã xoá cửa hàng.");
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true); setError(null); setNotice(null);
    const payload = {
      stores: stores.map(s => ({
        id: s.id, name: s.name, address: s.address || "", size: s.size || null,
        costs: Object.fromEntries(Object.keys(s.dirtyMonths).map(m => [m, s.costsByMonth[m]])),
      })),
    };
    try {
      const res = await fetch(DATA.urls.save, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.message || Object.values(body.errors || {}).flat()[0] || "Không lưu được, thử lại.");
        return;
      }
      setStores(fromServer(body.stores));
      setMonths(ms => [...new Set([...ms, ...body.months])].sort());
      setActiveIdx(i => Math.min(i, body.stores.length - 1));
      setNotice(body.message);
    } catch {
      setError("Mất kết nối, thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const activeYear = activeMonth.split("-")[0];
  const years = useMemo(() => [...new Set(months.map(m => m.split("-")[0]))], [months]);
  const { costs, carriedFrom } = costsForMonth(store, months, activeMonth);
  const customKeys = Object.keys(costs).filter(k => k.startsWith("custom_"));
  const allKeys = [...BASE_KEYS, ...customKeys];
  const total = allKeys.reduce((sum, k) => sum + amountOf(costs[k]), 0);

  const tabStyle = on => ({ padding: "10px 18px", borderRadius: 12, fontSize: 13.5, fontWeight: 700, cursor: "pointer", background: on ? C.brand : "#fff", color: on ? "#fff" : C.ink, border: `1.5px solid ${on ? C.brand : C.line}` });

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 64, background: C.bg, color: C.ink }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, padding: "18px 24px", background: C.brand, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <a href="/admin/overview" style={{ width: 38, height: 38, borderRadius: 10, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: C.brand, fontSize: 18, textDecoration: "none" }}>L</a>
          <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.2px" }}>Laboong</div>
          <a href="/admin/overview" style={{ marginLeft: 14, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)", textDecoration: "none", padding: "7px 12px", borderRadius: 9, background: "rgba(255,255,255,0.1)" }}>← Trang chủ</a>
        </div>
        <div title={DATA.admin.name} style={{ width: 36, height: 36, borderRadius: "50%", background: "#E8845C", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{DATA.admin.initial}</div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: narrow ? "24px 16px 0" : "36px 24px 0" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.4px" }}>Cài đặt cửa hàng</div>
          <div style={{ fontSize: 14.5, color: C.ink2, marginTop: 4 }}>Thông tin quán và chi phí cố định — tách riêng theo từng cửa hàng</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
          {stores.map((s, i) => (
            <div key={s.id ?? `new-${i}`} onClick={() => setActiveIdx(i)} style={tabStyle(i === activeIdx)}>
              {s.name || "Cửa hàng mới"}{(s.dirtyProfile || Object.keys(s.dirtyMonths).length > 0) ? " •" : ""}
            </div>
          ))}
          <div onClick={addStore} style={{ padding: "10px 18px", borderRadius: 12, fontSize: 13.5, fontWeight: 700, cursor: "pointer", border: "1.5px dashed #C9C2AE", color: C.ink2 }}>+ Thêm cửa hàng</div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 18 }}>Thông tin quán</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Tên quán</div>
              <FocusInput value={store.name} onChange={e => updateField("name", e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Địa chỉ</div>
              <FocusInput value={store.address || ""} onChange={e => updateField("address", e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Quy mô</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DATA.sizes.map(opt => {
                const on = store.size === opt;
                return (
                  <div key={opt} onClick={() => updateField("size", on ? null : opt)} style={{ padding: "9px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: `1.5px solid ${on ? C.brand : C.field}`, background: on ? "#EAF3EE" : "#fff", color: on ? C.brand : C.ink2 }}>{opt}</div>
                );
              })}
            </div>
          </div>
          {store.id && (
            <div style={{ marginTop: 16, fontSize: 12, color: C.ink3 }}>
              SĐT, giờ mở cửa, ảnh và vị trí bản đồ chỉnh ở trang <a href="/admin/stores" style={{ color: C.brand, fontWeight: 700 }}>Cửa hàng</a>.
            </div>
          )}
          {stores.length > 1 && (
            <div onClick={deleteStore} style={{ marginTop: 20, fontSize: 12.5, fontWeight: 700, color: C.danger, cursor: "pointer", display: "inline-block" }}>Xóa cửa hàng này</div>
          )}
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800 }}>Chi phí cố định hằng tháng</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 4, background: "#EFEBDF", padding: 4, borderRadius: 10, flexWrap: "wrap" }}>
                {years.map(y => (
                  <div key={y} onClick={() => { const inYear = months.filter(m => m.startsWith(y + "-")); setActiveMonth(inYear[inYear.length - 1]); }}
                    style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", background: activeYear === y ? C.brand : "transparent", color: activeYear === y ? "#fff" : C.ink2 }}>{y}</div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, background: "#F1EFE7", padding: 4, borderRadius: 10, flexWrap: "wrap" }}>
                {months.filter(m => m.startsWith(activeYear + "-")).map(m => (
                  <div key={m} onClick={() => setActiveMonth(m)}
                    style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", background: activeMonth === m ? "#fff" : "transparent", color: activeMonth === m ? C.brand : C.ink2 }}>{monthLabel(m)}</div>
                ))}
              </div>
              <div onClick={addMonth} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: C.brand, whiteSpace: "nowrap" }}>+ Thêm tháng</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.ink3, marginBottom: 18, lineHeight: 1.5 }}>Lương, điện nước có thể đổi mỗi tháng — nhập riêng cho từng tháng, hệ thống tự dùng đúng số của tháng đó khi phân bổ.</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {allKeys.map(key => {
              const isCustom = key.startsWith("custom_");
              return (
                <div key={key} style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1.4fr 1fr", gap: narrow ? 6 : 14, alignItems: "center" }}>
                  <div>
                    {isCustom ? (
                      <input value={costs[key]?.label || ""} onChange={e => updateCustomLabel(key, e.target.value)} placeholder="Tên khoản chi phí"
                        style={{ border: "none", borderBottom: `1.5px dashed ${C.field}`, background: "transparent", fontSize: 13.5, fontWeight: 600, color: C.ink, padding: "2px 0", width: "100%", font: "inherit", outline: "none" }} />
                    ) : (
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{BASE_LABELS[key]}</div>
                    )}
                    {carriedFrom && <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Chưa nhập tháng này — đang dùng số của {monthLabel(carriedFrom)}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <FocusInput type="number" min="0" step="1000" inputMode="numeric" value={amountOf(costs[key])} onChange={e => updateCost(key, e.target.value)} style={{ padding: "11px 14px" }} />
                    <span style={{ fontSize: 13, color: C.ink3 }}>đ</span>
                    {isCustom && <div onClick={() => removeCustomCost(key)} title="Bỏ khoản này" style={{ cursor: "pointer", color: C.danger, fontWeight: 700, fontSize: 15, padding: "0 4px" }}>×</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div onClick={addCustomCost} style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: C.brand, cursor: "pointer", display: "inline-block" }}>+ Thêm khoản chi phí</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.brand, textAlign: "right", marginTop: 16 }}>Tổng {monthLabel(activeMonth)}/{activeYear}: {fmt(total)}</div>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 10, lineHeight: 1.5 }}>Chi phí của đúng tháng đang bán sẽ được phân bổ theo ngày để tính lợi nhuận ròng và điểm hòa vốn ở trang Báo cáo.</div>
        </div>

        {error && <div style={{ marginTop: 18, padding: "12px 16px", borderRadius: 12, background: "#FDEEE8", color: C.danger, fontSize: 13.5, fontWeight: 600 }}>{error}</div>}
        {notice && !dirty && !error && <div style={{ marginTop: 18, padding: "12px 16px", borderRadius: 12, background: "#EAF3EE", color: C.brand, fontSize: 13.5, fontWeight: 600 }}>{notice}</div>}

        <div onClick={save} style={{ marginTop: 22, textAlign: "center", padding: 15, borderRadius: 14, background: dirty ? C.brand : C.brand2, color: "#fff", fontWeight: 800, fontSize: 15, cursor: dirty && !saving ? "pointer" : "default", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Đang lưu…" : dirty ? "Lưu thay đổi" : "✓ Đã lưu"}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<StoreSettingsApp />);
