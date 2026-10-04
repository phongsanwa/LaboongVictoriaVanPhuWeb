/* global React, ReactDOM, OPS_C, opsFmt, opsApi, OpsHeader */
const { useState, useRef, useEffect } = React;

const D = window.ADMIN_INGREDIENTS_DATA;
const C = OPS_C;
const GRID = "1.6fr 1fr 1.1fr 0.9fr 0.8fr 1.2fr 1.3fr 28px";
const cell = { border: `1px solid ${C.field}`, borderRadius: 8, padding: "7px 9px", fontSize: 13, width: "100%", background: "#fff", fontFamily: "inherit", color: C.ink, outline: "none" };
const SAVE_DELAY = 700;

const usePrice = ing => (Number(ing.conversion) > 0 ? (Number(ing.buy_price) || 0) / Number(ing.conversion) : 0);
const canPersist = ing => ing.name.trim() && ing.buy_unit.trim() && ing.use_unit.trim() && Number(ing.conversion) >= 0.001 && Number(ing.buy_price) >= 0;
const missingCost = ing => !ing.name.trim() || !Number(ing.buy_price) || !Number(ing.conversion);

let tempSeq = 0;
const fromServer = i => ({ ...i, key: "s" + i.id, overrides: Array.isArray(i.overrides) ? {} : (i.overrides || {}) });

function IngredientsApp() {
  const [rows, setRows] = useState(() => D.ingredients.map(fromServer));
  const [store, setStore] = useState("chung");
  const [status, setStatus] = useState({}); // key -> 'saving' | 'saved' | error text
  const [banner, setBanner] = useState(null);
  const timers = useRef({});
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const storeObj = D.stores.find(s => String(s.id) === store);
  const isStoreView = store !== "chung";

  const setRowStatus = (key, v) => setStatus(s => ({ ...s, [key]: v }));
  const patchRow = (key, patch) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const creating = useRef(new Set());
  const persist = async (key) => {
    const ing = rowsRef.current.find(r => r.key === key);
    if (!ing || !canPersist(ing)) return;
    // A create is still in flight: retry once it has an id instead of POSTing a duplicate.
    if (!ing.id && creating.current.has(key)) { schedule(key); return; }
    if (!ing.id) creating.current.add(key);
    const body = { name: ing.name.trim(), buy_unit: ing.buy_unit.trim(), buy_price: Number(ing.buy_price) || 0, conversion: Number(ing.conversion), use_unit: ing.use_unit.trim(), sort_order: ing.sort_order ?? 0 };
    setRowStatus(key, "saving");
    try {
      const { ingredient } = ing.id
        ? await opsApi("PUT", `/admin/ingredients/${ing.id}`, body)
        : await opsApi("POST", "/admin/ingredients", body);
      if (!ing.id) { rowsRef.current = rowsRef.current.map(r => (r.key === key ? { ...r, id: ingredient.id } : r)); patchRow(key, { id: ingredient.id }); }
      setRowStatus(key, "saved");
    } catch (e) {
      setRowStatus(key, e.message);
    } finally {
      creating.current.delete(key);
    }
  };

  const schedule = (key) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => persist(key), SAVE_DELAY);
  };
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const update = (key, field, value) => { patchRow(key, { [field]: value }); schedule(key); };

  const addRow = () => {
    const key = "t" + (++tempSeq);
    setRows(rs => [...rs, { key, id: null, name: "", buy_unit: "", buy_price: 0, conversion: 1, use_unit: "", sort_order: rs.length, overrides: {} }]);
  };

  const removeRow = async (ing) => {
    if (ing.id && !window.confirm(`Xoá nguyên liệu "${ing.name}"?`)) return;
    clearTimeout(timers.current[ing.key]);
    if (ing.id) {
      try { await opsApi("DELETE", `/admin/ingredients/${ing.id}`); }
      catch (e) { setBanner(e.message); return; }
    }
    setRows(rs => rs.filter(r => r.key !== ing.key));
  };

  const overrideCall = async (ing, method, usePriceValue) => {
    if (!ing.id) { setBanner("Lưu nguyên liệu (điền đủ thông tin) trước khi đặt giá riêng."); return; }
    setRowStatus(ing.key, "saving");
    try {
      const { ingredient } = await opsApi(method, `/admin/ingredients/${ing.id}/overrides/${store}`, method === "POST" ? { use_price: usePriceValue } : undefined);
      patchRow(ing.key, { overrides: Array.isArray(ingredient.overrides) ? {} : ingredient.overrides });
      setRowStatus(ing.key, "saved");
    } catch (e) { setRowStatus(ing.key, e.message); }
  };

  const overrideTimers = useRef({});
  const editOverride = (ing, value) => {
    const v = value === "" ? 0 : Math.max(0, Number(value));
    patchRow(ing.key, { overrides: { ...ing.overrides, [store]: { ...(ing.overrides[store] || {}), store_id: Number(store), use_price: v } } });
    clearTimeout(overrideTimers.current[ing.key]);
    overrideTimers.current[ing.key] = setTimeout(() => overrideCall(ing, "POST", v), SAVE_DELAY);
  };

  const tabs = [{ key: "chung", label: "Giá chung" }, ...D.stores.map(s => ({ key: String(s.id), label: s.name }))];

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 64, background: C.bg, color: C.ink }}>
      <OpsHeader admin={D.admin} links={[{ href: "/admin/overview", label: "← Trang chủ" }, { href: "/admin/recipes", label: "Công thức món →" }]} />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.4px" }}>Quản lý nguyên liệu</div>
            <div style={{ fontSize: 14.5, color: C.ink2, marginTop: 4, maxWidth: 560 }}>Nguồn dữ liệu gốc cho công thức món — cập nhật đúng đơn giá và quy đổi đơn vị, vì sai ở đây thì mọi giá vốn phía sau đều sai.</div>
          </div>
          <div style={{ display: "flex", gap: 6, background: "#EFEBDF", padding: 4, borderRadius: 11, flexWrap: "wrap" }}>
            {tabs.map(t => (
              <div key={t.key} onClick={() => setStore(t.key)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", background: store === t.key ? "#fff" : "transparent", color: store === t.key ? C.brand : C.ink2 }}>{t.label}</div>
            ))}
          </div>
        </div>

        {isStoreView && (
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: C.warnInk, background: C.warnBg, borderRadius: 12, padding: "12px 16px", marginBottom: 18 }}>
            Đang xem giá của <b>{storeObj?.name}</b>. Mặc định dùng giá chung — bấm "Ghi đè" ở dòng nào để đặt giá riêng cho cửa hàng này (ví dụ nhà cung cấp khác).
          </div>
        )}
        {banner && (
          <div onClick={() => setBanner(null)} style={{ fontSize: 13, fontWeight: 600, color: C.danger, background: "#FBEAE3", borderRadius: 12, padding: "12px 16px", marginBottom: 14, cursor: "pointer" }}>{banner} <span style={{ opacity: 0.6 }}>(bấm để ẩn)</span></div>
        )}

        <div onClick={addRow} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: 14, border: "1.5px dashed #C9C2AE", color: C.ink2, fontSize: 13.5, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>+ Thêm nguyên liệu</div>

        <div style={{ background: "#fff", borderRadius: 18, border: `1px solid ${C.line}`, overflowX: "auto" }}>
          <div style={{ minWidth: 920 }}>
            <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "13px 18px", background: C.bg, fontSize: 11, fontWeight: 800, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.3px" }}>
              <div>Nguyên liệu</div><div>Đơn vị mua</div><div>Giá mua</div><div>Quy đổi</div><div>Đơn vị dùng</div><div style={{ textAlign: "right" }}>Giá dùng (tính)</div><div>{isStoreView ? "Giá riêng cửa hàng" : "Trạng thái"}</div><div></div>
            </div>
            {rows.length === 0 && <div style={{ padding: 28, textAlign: "center", color: C.ink3, fontSize: 13.5 }}>Chưa có nguyên liệu nào — bấm "+ Thêm nguyên liệu" để bắt đầu.</div>}
            {rows.map(ing => {
              const base = usePrice(ing);
              const ov = isStoreView ? ing.overrides[store] : undefined;
              const st = status[ing.key];
              return (
                <div key={ing.key} style={{ borderTop: `1px solid ${C.line2}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "10px 18px", alignItems: "center" }}>
                    <input value={ing.name} onChange={e => update(ing.key, "name", e.target.value)} placeholder="Tên nguyên liệu" style={cell} />
                    <input value={ing.buy_unit} onChange={e => update(ing.key, "buy_unit", e.target.value)} placeholder="kg, lon..." style={cell} />
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="number" min="0" value={ing.buy_price} onChange={e => update(ing.key, "buy_price", e.target.value)} style={cell} />
                      <span style={{ fontSize: 12, color: C.ink3 }}>đ</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11.5, color: C.ink3, whiteSpace: "nowrap" }}>1 =</span>
                      <input type="number" min="0" value={ing.conversion} onChange={e => update(ing.key, "conversion", e.target.value)} style={{ ...cell, padding: "7px 6px" }} />
                    </div>
                    <input value={ing.use_unit} onChange={e => update(ing.key, "use_unit", e.target.value)} placeholder="g, ml..." style={{ ...cell, padding: "7px 6px", textAlign: "center" }} />
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: C.brand }}>{opsFmt(ov ? ov.use_price : base)}</div>
                      <div style={{ fontSize: 11, color: C.ink3 }}>/{ing.use_unit || "?"}</div>
                    </div>
                    <div>
                      {isStoreView ? (
                        ov ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input type="number" min="0" value={ov.use_price} onChange={e => editOverride(ing, e.target.value)} style={{ border: `1.5px solid ${C.brand}`, borderRadius: 8, padding: "6px 8px", fontSize: 12.5, width: 72, background: "#F0F7F3", fontFamily: "inherit", outline: "none" }} />
                            <span onClick={() => overrideCall(ing, "DELETE")} style={{ fontSize: 11, color: C.danger, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Bỏ ghi đè</span>
                          </div>
                        ) : (
                          <div onClick={() => overrideCall(ing, "POST", Math.round(base))} style={{ fontSize: 12, fontWeight: 700, color: C.brand, cursor: "pointer", background: C.okBg, padding: "6px 10px", borderRadius: 8, display: "inline-block" }}>Ghi đè giá</div>
                        )
                      ) : (
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3 }}>
                          {!ing.id ? "Chưa lưu" : Object.keys(ing.overrides).length ? `Giá chung · ${Object.keys(ing.overrides).length} quán giá riêng` : "Giá chung"}
                        </div>
                      )}
                    </div>
                    <div onClick={() => removeRow(ing)} title="Xoá nguyên liệu" style={{ cursor: "pointer", textAlign: "center", color: C.danger, fontWeight: 700, fontSize: 15 }}>×</div>
                  </div>
                  {(missingCost(ing) || !canPersist(ing) || (st && st !== "saving" && st !== "saved")) && (
                    <div style={{ padding: "0 18px 10px 18px", fontSize: 11.5, color: C.danger, fontWeight: 600 }}>
                      {st && st !== "saving" && st !== "saved"
                        ? `⚠ Chưa lưu được: ${st}`
                        : !canPersist(ing)
                          ? "⚠ Điền tên, đơn vị mua, quy đổi và đơn vị dùng để lưu nguyên liệu này."
                          : "⚠ Thiếu giá hoặc quy đổi — công thức dùng nguyên liệu này sẽ tính sai giá vốn."}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.ink3, marginTop: 10 }}>
          {Object.values(status).includes("saving") ? "Đang lưu…" : "Mọi thay đổi được lưu tự động."}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<IngredientsApp />);
