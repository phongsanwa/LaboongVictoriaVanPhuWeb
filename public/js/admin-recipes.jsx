/* global React, ReactDOM, OPS_C, opsFmt, opsApi, OpsHeader, useNarrowScreen */
const { useState, useRef, useEffect, useMemo } = React;

const D = window.ADMIN_RECIPES_DATA;
const C = OPS_C;
const SCALE_M = 0.75; // size M uses 75% of the size-L quantities
const SAVE_DELAY = 800;
const GRID = "1.8fr 0.9fr 0.6fr 1fr 1fr 28px";
const cell = { border: `1px solid ${C.field}`, borderRadius: 8, padding: "7px 9px", fontSize: 13, width: "100%", background: "#fff", fontFamily: "inherit", color: C.ink, outline: "none" };
const bigNum = { fontSize: 22, fontWeight: 800, border: "none", borderBottom: "1.5px dashed #D8D3C4", background: "transparent", width: 120, padding: 0, fontFamily: "inherit", outline: "none" };

const CATALOG = D.ingredients;
const catalogById = Object.fromEntries(CATALOG.map(i => [i.id, i]));

const fmtUnit = n => (Number(n) || 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + "đ";
const fmtDate = iso => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const scaleOf = size => (size === "L" ? 1 : SCALE_M);
const marginColor = p => (p >= 50 ? C.brand2 : p >= 35 ? "#B4762A" : C.danger);
const marginBg = p => (p >= 50 ? "#E7F2EC" : p >= 35 ? C.warnBg : "#FBEAE3");

let seq = 0;
const newRow = () => ({ key: "r" + (++seq), mode: "", ingredient_id: null, qty_l: 0, custom_name: "", custom_unit: "g", custom_unit_price: 0 });

function fromServer(r) {
  return {
    ...r,
    key: "s" + r.id,
    rows: r.ingredients.map(i => ({
      key: "r" + (++seq),
      mode: i.ingredient_id ? "catalog" : (i.custom_unit != null || i.custom_name ? "manual" : ""),
      ingredient_id: i.ingredient_id,
      qty_l: i.qty_l,
      custom_name: i.custom_name || "",
      custom_unit: i.custom_unit || "g",
      custom_unit_price: i.custom_unit_price || 0,
    })),
    cost_history: r.cost_history || [],
  };
}

function resolve(row) {
  if (row.mode === "catalog") {
    const c = catalogById[row.ingredient_id];
    return c ? { unit: c.use_unit, unitPrice: c.use_price } : { unit: "", unitPrice: 0 };
  }
  if (row.mode === "manual") return { unit: row.custom_unit, unitPrice: Number(row.custom_unit_price) || 0 };
  return { unit: "", unitPrice: 0 };
}

function compute(dish, size) {
  const sk = size.toLowerCase();
  const price = Number(dish["price_" + sk]) || 0;
  if (dish.input_mode === "direct") {
    const cogs = Number(dish["direct_cogs_" + sk]) || 0;
    return { variable: 0, wastage: 0, packaging: 0, cogs, price, gross: price - cogs, pct: price ? ((price - cogs) / price) * 100 : 0 };
  }
  const s = scaleOf(size);
  const variable = dish.rows.reduce((sum, r) => sum + (Number(r.qty_l) || 0) * s * resolve(r).unitPrice, 0);
  const wastage = variable * ((Number(dish.wastage_pct) || 0) / 100);
  const packaging = Number(dish["packaging_" + sk]) || 0;
  const cogs = variable + wastage + packaging;
  return { variable, wastage, packaging, cogs, price, gross: price - cogs, pct: price ? ((price - cogs) / price) * 100 : 0 };
}

function payloadOf(d) {
  return {
    name: d.name.trim(), input_mode: d.input_mode, wastage_pct: Number(d.wastage_pct) || 0,
    packaging_m: Number(d.packaging_m) || 0, packaging_l: Number(d.packaging_l) || 0,
    price_m: Number(d.price_m) || 0, price_l: Number(d.price_l) || 0,
    direct_cogs_m: Number(d.direct_cogs_m) || 0, direct_cogs_l: Number(d.direct_cogs_l) || 0,
    sort_order: d.sort_order ?? 0,
    ingredients: d.rows.map((r, i) => ({
      ingredient_id: r.mode === "catalog" ? r.ingredient_id : null,
      qty_l: Number(r.qty_l) || 0,
      custom_name: r.mode === "manual" ? r.custom_name : null,
      custom_unit: r.mode === "manual" ? (r.custom_unit || "g") : null,
      custom_unit_price: r.mode === "manual" ? Number(r.custom_unit_price) || 0 : null,
      sort_order: i,
    })),
  };
}

function MoneyInput({ value, onChange, color = C.ink }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
      <input type="number" min="0" step="1000" value={value} onChange={e => onChange(e.target.value)} style={{ ...bigNum, color }} />
      <span style={{ fontSize: 16, fontWeight: 700, color: C.ink3 }}>đ</span>
    </div>
  );
}

function RecipesApp() {
  const narrow = useNarrowScreen(900);
  const [dishes, setDishes] = useState(() => D.recipes.map(fromServer));
  const [selKey, setSelKey] = useState(() => (D.recipes[0] ? "s" + D.recipes[0].id : null));
  const [size, setSize] = useState("L");
  const [saveState, setSaveState] = useState({}); // key -> 'saving' | 'saved' | error
  const [banner, setBanner] = useState(null);
  const timers = useRef({});
  const dishesRef = useRef(dishes);
  dishesRef.current = dishes;

  const dish = dishes.find(d => d.key === selKey) || dishes[0];
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const persist = async (key) => {
    const d = dishesRef.current.find(x => x.key === key);
    if (!d) return;
    if (!d.id) { schedule(key); return; } // create still in flight
    if (!d.name.trim()) { setSaveState(s => ({ ...s, [key]: "Tên món không được để trống." })); return; }
    setSaveState(s => ({ ...s, [key]: "saving" }));
    try {
      await opsApi("PUT", `/admin/recipes/${d.id}`, payloadOf(d));
      setSaveState(s => ({ ...s, [key]: "saved" }));
    } catch (e) {
      setSaveState(s => ({ ...s, [key]: e.message }));
    }
  };
  const schedule = (key) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => persist(key), SAVE_DELAY);
  };

  const patchDish = (fn) => {
    const key = dish.key;
    setDishes(ds => ds.map(d => (d.key === key ? fn({ ...d, rows: d.rows.map(r => ({ ...r })) }) : d)));
    schedule(key);
  };
  const setField = (field, value) => patchDish(d => ({ ...d, [field]: value }));
  const setRow = (rk, patch) => patchDish(d => ({ ...d, rows: d.rows.map(r => (r.key === rk ? { ...r, ...patch } : r)) }));

  const addDish = async () => {
    const n = dishes.length + 1;
    const draft = { id: null, key: "n" + (++seq), name: `Món mới ${n}`, input_mode: "detailed", wastage_pct: 5, packaging_m: 950, packaging_l: 1300, price_m: 0, price_l: 0, direct_cogs_m: 0, direct_cogs_l: 0, sort_order: n, rows: [newRow()], cost_history: [] };
    setDishes(ds => [...ds, draft]);
    setSelKey(draft.key);
    setSize("L");
    setSaveState(s => ({ ...s, [draft.key]: "saving" }));
    try {
      const { recipe } = await opsApi("POST", "/admin/recipes", payloadOf(draft));
      setDishes(ds => ds.map(d => (d.key === draft.key ? { ...d, id: recipe.id } : d)));
      dishesRef.current = dishesRef.current.map(d => (d.key === draft.key ? { ...d, id: recipe.id } : d));
      setSaveState(s => ({ ...s, [draft.key]: "saved" }));
    } catch (e) {
      setSaveState(s => ({ ...s, [draft.key]: e.message }));
    }
  };

  const deleteDish = async (d, ev) => {
    ev.stopPropagation();
    if (dishes.length <= 1) return;
    if (!window.confirm(`Xoá món "${d.name || "chưa đặt tên"}"?`)) return;
    clearTimeout(timers.current[d.key]);
    if (d.id) {
      try { await opsApi("DELETE", `/admin/recipes/${d.id}`); }
      catch (e) { setBanner(e.message); return; }
    }
    const idx = dishes.findIndex(x => x.key === d.key);
    const rest = dishes.filter(x => x.key !== d.key);
    setDishes(rest);
    if (d.key === dish.key) setSelKey(rest[Math.max(0, idx - 1)].key);
  };

  const saveSnapshot = async () => {
    if (!dish.id) return;
    clearTimeout(timers.current[dish.key]);
    await persist(dish.key);
    try {
      const { snapshot } = await opsApi("POST", `/admin/recipes/${dish.id}/snapshot`, { cogs_l: Math.round(compute(dish, "L").cogs) });
      setDishes(ds => ds.map(d => (d.key !== dish.key ? d : {
        ...d, cost_history: [...d.cost_history.filter(h => h.recorded_on !== snapshot.recorded_on), snapshot].sort((a, b) => a.recorded_on.localeCompare(b.recorded_on)),
      })));
    } catch (e) { setBanner(e.message); }
  };

  if (!dish) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.ink }}>
        <OpsHeader admin={D.admin} links={[{ href: "/admin/overview", label: "← Trang chủ" }, { href: "/admin/ingredients", label: "← Nguyên liệu" }]} />
        <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Chưa có món nào</div>
          <div style={{ color: C.ink2, fontSize: 14, marginBottom: 18 }}>Tạo món đầu tiên để tính giá vốn mỗi ly và biên lợi nhuận.</div>
          <div onClick={addDish} style={{ display: "inline-block", padding: "13px 22px", borderRadius: 14, background: C.brand, color: "#fff", fontWeight: 800, cursor: "pointer" }}>+ Thêm món mới</div>
        </div>
      </div>
    );
  }

  const sk = size.toLowerCase();
  const s = scaleOf(size);
  const calc = compute(dish, size);
  const accent = marginColor(calc.pct);
  const note = calc.pct >= 50 ? "Biên lợi nhuận tốt" : calc.pct >= 35 ? "Biên lợi nhuận ở mức trung bình" : "Biên lợi nhuận thấp — cân nhắc tăng giá bán hoặc giảm topping";
  const suggest = calc.pct < 35 && calc.cogs > 0 ? Math.ceil((calc.cogs * 2) / 1000) * 1000 : 0;
  const st = saveState[dish.key];

  const history = dish.cost_history.map((h, i, arr) => ({ ...h, diff: i ? h.cogs_l - arr[i - 1].cogs_l : null })).reverse();
  const seg = on => ({ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", background: on ? "#fff" : "transparent", color: on ? C.brand : C.ink3 });
  const summaryRow = { display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "13px 16px", borderTop: `1px solid ${C.line2}`, alignItems: "center" };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 64, background: C.bg, color: C.ink }}>
      <OpsHeader admin={D.admin}
        links={[{ href: "/admin/overview", label: "← Trang chủ" }, { href: "/admin/ingredients", label: "← Nguyên liệu" }]}
        center={<div style={{ fontSize: 12.5, fontWeight: 700, color: C.brand, background: C.gold, padding: "7px 14px", borderRadius: 20 }}>Dùng chung — mọi cửa hàng</div>} />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: narrow ? "24px 16px 0" : "36px 24px 0" }}>
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.4px" }}>Công thức món & giá vốn (COGS)</div>
          <div style={{ fontSize: 14.5, color: C.ink2, marginTop: 4 }}>Chọn nguyên liệu và định lượng — hệ thống tự tính giá vốn mỗi ly và biên lợi nhuận</div>
        </div>
        {banner && <div onClick={() => setBanner(null)} style={{ fontSize: 13, fontWeight: 600, color: C.danger, background: "#FBEAE3", borderRadius: 12, padding: "12px 16px", marginBottom: 14, cursor: "pointer" }}>{banner} <span style={{ opacity: 0.6 }}>(bấm để ẩn)</span></div>}

        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(260px, 320px) 1fr", gap: 20, alignItems: "start" }}>
          {/* Dish list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div onClick={addDish} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: 14, border: "1.5px dashed #C9C2AE", color: C.ink2, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>+ Thêm món mới</div>
            {dishes.map(d => {
              const c = compute(d, "L");
              const on = d.key === dish.key;
              return (
                <div key={d.key} onClick={() => setSelKey(d.key)} style={{ padding: 16, borderRadius: 14, background: on ? C.brand : "#fff", color: on ? "#fff" : C.ink, border: `1px solid ${on ? C.brand : C.line}`, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800 }}>{d.name || "Món chưa đặt tên"}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: on ? "#fff" : marginColor(c.pct), background: on ? "rgba(255,255,255,0.2)" : marginBg(c.pct), padding: "4px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>{Math.round(c.pct)}%</div>
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 5, opacity: 0.75 }}>Giá vốn (L): {opsFmt(c.cogs)}</div>
                  {dishes.length > 1 && <div onClick={ev => deleteDish(d, ev)} style={{ fontSize: 11.5, fontWeight: 700, color: on ? "rgba(255,255,255,0.85)" : C.danger, marginTop: 8, display: "inline-block" }}>Xóa món</div>}
                </div>
              );
            })}
          </div>

          {/* Builder */}
          <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${C.line}`, padding: narrow ? 18 : 28, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 22 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <input value={dish.name} onChange={e => setField("name", e.target.value)} placeholder="Tên món"
                  style={{ fontSize: 20, fontWeight: 800, color: C.ink, border: "none", borderBottom: `1.5px dashed ${C.field}`, background: "transparent", padding: "2px 0 4px", width: "100%", fontFamily: "inherit", outline: "none" }} />
                <div style={{ fontSize: 12.5, color: C.ink3, marginTop: 6, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                  Hao hụt nguyên liệu áp dụng:
                  <input type="number" min="0" max="100" value={dish.wastage_pct} onChange={e => setField("wastage_pct", e.target.value)}
                    style={{ width: 44, border: "none", borderBottom: `1px dashed ${C.field}`, background: "transparent", fontFamily: "inherit", fontSize: 12.5, color: C.ink, textAlign: "center", outline: "none" }} />% (pha hỏng, đổ vỡ)
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 6, background: C.tray, padding: 4, borderRadius: 10, flexWrap: "wrap" }}>
                  {[["detailed", "Định lượng × đơn giá"], ["direct", "Nhập giá vốn trực tiếp"]].map(([k, l]) => (
                    <div key={k} onClick={() => setField("input_mode", k)} style={seg(dish.input_mode === k)}>{l}</div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, background: C.tray, padding: 4, borderRadius: 10 }}>
                  {["M", "L"].map(z => <div key={z} onClick={() => setSize(z)} style={seg(size === z)}>Size {z}</div>)}
                </div>
              </div>
            </div>

            {narrow && dish.input_mode === "detailed" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 10, padding: "10px 14px", background: C.okBg, borderRadius: 12 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2 }}>Giá vốn / ly (size {size})</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.brand }}>{opsFmt(calc.cogs)}</span>
              </div>
            )}
            {narrow && dish.input_mode === "detailed" && <div style={{ fontSize: 11.5, color: C.ink3, marginBottom: 6 }}>Vuốt ngang bảng để xem đơn giá và thành tiền.</div>}
            <div style={{ border: "1px solid #EFECE3", borderRadius: 14, overflowX: "auto" }}>
              {dish.input_mode === "detailed" ? (
                <div style={{ minWidth: 640 }}>
                  <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "12px 16px", background: C.bg, fontSize: 11, fontWeight: 800, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    <div>Nguyên liệu</div><div>Số lượng</div><div>ĐV</div><div>Đơn giá</div><div style={{ textAlign: "right" }}>Thành tiền</div><div></div>
                  </div>
                  {dish.rows.map(r => {
                    const res = resolve(r);
                    const qty = Math.round((Number(r.qty_l) || 0) * s * 100) / 100;
                    return (
                      <div key={r.key} style={{ display: "grid", gridTemplateColumns: GRID, gap: 8, padding: "9px 16px", borderTop: `1px solid ${C.line2}`, alignItems: "start" }}>
                        <div>
                          <select value={r.mode === "catalog" ? String(r.ingredient_id) : r.mode === "manual" ? "manual" : ""}
                            onChange={e => {
                              const v = e.target.value;
                              setRow(r.key, v === "manual" ? { mode: "manual", ingredient_id: null } : v ? { mode: "catalog", ingredient_id: Number(v) } : { mode: "", ingredient_id: null });
                            }}
                            style={{ ...cell, fontSize: 12.5 }}>
                            <option value="">-- Chọn từ kho --</option>
                            {CATALOG.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            <option value="manual">Nhập tên khác...</option>
                          </select>
                          {r.mode === "manual" && <input value={r.custom_name} onChange={e => setRow(r.key, { custom_name: e.target.value })} placeholder="Tên nguyên liệu" style={{ ...cell, marginTop: 6, fontSize: 12.5 }} />}
                        </div>
                        <input type="number" min="0" value={qty} onChange={e => setRow(r.key, { qty_l: (Number(e.target.value) || 0) / s })} style={cell} />
                        <div>
                          {r.mode === "manual"
                            ? <input value={r.custom_unit} onChange={e => setRow(r.key, { custom_unit: e.target.value })} style={{ ...cell, padding: "7px 6px", textAlign: "center" }} />
                            : <div style={{ textAlign: "center", fontSize: 13, color: C.ink2, padding: "7px 0" }}>{res.unit}</div>}
                        </div>
                        <div>
                          {r.mode === "manual"
                            ? <input type="number" min="0" value={r.custom_unit_price} onChange={e => setRow(r.key, { custom_unit_price: e.target.value })} style={cell} />
                            : <div style={{ textAlign: "right", fontSize: 12.5, color: C.ink2, padding: "7px 0" }}>{res.unitPrice ? fmtUnit(res.unitPrice) + (res.unit ? "/" + res.unit : "") : "—"}</div>}
                        </div>
                        <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13.5, padding: "7px 0" }}>{opsFmt((Number(r.qty_l) || 0) * s * res.unitPrice)}</div>
                        <div onClick={() => patchDish(d => ({ ...d, rows: d.rows.filter(x => x.key !== r.key) }))} title="Bỏ nguyên liệu" style={{ cursor: "pointer", textAlign: "center", color: C.danger, fontWeight: 700, fontSize: 15, padding: "7px 0" }}>×</div>
                      </div>
                    );
                  })}
                  <div onClick={() => patchDish(d => ({ ...d, rows: [...d.rows, newRow()] }))} style={{ padding: "11px 16px", borderTop: `1px solid ${C.line2}`, fontSize: 13, fontWeight: 700, color: C.brand, cursor: "pointer" }}>+ Thêm nguyên liệu</div>
                  <div style={{ ...summaryRow, fontSize: 13, color: C.ink3 }}>
                    <div>Hao hụt nguyên liệu ({Number(dish.wastage_pct) || 0}%)</div><div /><div /><div />
                    <div style={{ textAlign: "right", fontWeight: 700, color: C.ink }}>{opsFmt(calc.wastage)}</div><div />
                  </div>
                  <div style={{ ...summaryRow, fontSize: 13.5 }}>
                    <div style={{ fontWeight: 600 }}>Bao bì (ly, nắp, ống hút)</div><div /><div /><div />
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                      <input type="number" min="0" value={dish["packaging_" + sk]} onChange={e => setField("packaging_" + sk, e.target.value)}
                        style={{ width: 80, border: "none", borderBottom: `1px dashed ${C.field}`, background: "transparent", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, textAlign: "right", color: C.ink, outline: "none" }} />
                      <span style={{ fontWeight: 700 }}>đ</span>
                    </div><div />
                  </div>
                  <div style={{ ...summaryRow, padding: 16, borderTop: `1.5px solid ${C.ink}` }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5 }}>Tổng giá vốn / ly (COGS)</div><div /><div /><div />
                    <div style={{ textAlign: "right", fontWeight: 800, fontSize: 17, color: C.brand }}>{opsFmt(calc.cogs)}</div><div />
                  </div>
                </div>
              ) : (
                <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ fontSize: 13, color: C.ink3, lineHeight: 1.5 }}>Không cần khai báo từng nguyên liệu — nhập trực tiếp giá vốn và giá bán mỗi ly để xem ngay biên lợi nhuận.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 16 }}>
                    <div style={{ background: C.bg, borderRadius: 14, padding: "18px 20px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: "uppercase" }}>Giá vốn / ly (size {size})</div>
                      <MoneyInput value={dish["direct_cogs_" + sk]} onChange={v => setField("direct_cogs_" + sk, v)} color={C.brand} />
                    </div>
                    <div style={{ background: C.bg, borderRadius: 14, padding: "18px 20px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: "uppercase" }}>Giá bán / ly (size {size})</div>
                      <MoneyInput value={dish["price_" + sk]} onChange={v => setField("price_" + sk, v)} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16, marginTop: 20 }}>
              {dish.input_mode === "detailed" && (
                <div style={{ background: C.bg, borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: "uppercase" }}>Giá bán / ly (size {size})</div>
                  <MoneyInput value={dish["price_" + sk]} onChange={v => setField("price_" + sk, v)} />
                </div>
              )}
              <div style={{ borderRadius: 14, padding: "18px 20px", background: marginBg(calc.pct) }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: "uppercase" }}>Lợi nhuận gộp / ly · Biên lợi nhuận</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: accent }}>{opsFmt(calc.gross)}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: accent }}>· {Math.round(calc.pct)}%</div>
                </div>
                <div style={{ fontSize: 12, color: accent, marginTop: 6, fontWeight: 600 }}>{calc.price ? note : "Nhập giá bán để xem biên lợi nhuận"}</div>
                {suggest > 0 && calc.price > 0 && <div style={{ fontSize: 12, color: accent, marginTop: 4, fontWeight: 800 }}>Gợi ý: tăng giá bán lên {opsFmt(suggest)} để đạt biên 50%</div>}
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #F0EDE5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>Lịch sử giá vốn</div>
                <div onClick={saveSnapshot} style={{ fontSize: 12, fontWeight: 700, color: C.brand, cursor: dish.id ? "pointer" : "default", opacity: dish.id ? 1 : 0.5, background: C.okBg, padding: "6px 12px", borderRadius: 20 }}>Lưu giá vốn hôm nay</div>
              </div>
              {history.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {history.map(h => (
                    <div key={h.recorded_on} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: C.bg, borderRadius: 10, fontSize: 12.5 }}>
                      <div style={{ color: C.ink2, fontWeight: 600 }}>{fmtDate(h.recorded_on)}</div>
                      <div style={{ fontWeight: 800 }}>{opsFmt(h.cogs_l)} <span style={{ fontWeight: 700, color: h.diff == null ? C.ink3 : h.diff > 0 ? C.danger : h.diff < 0 ? C.brand2 : C.ink3 }}>({h.diff == null ? "—" : (h.diff >= 0 ? "+" : "") + opsFmt(h.diff)})</span></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: C.ink3 }}>Chưa có lịch sử — bấm "Lưu giá vốn hôm nay" để bắt đầu theo dõi khi giá nguyên liệu thay đổi.</div>
              )}
              <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 10 }}>Lịch sử lưu giá vốn size L; trang Tổng quan và Báo cáo dùng số mới nhất ở đây.</div>
            </div>

            <div style={{ fontSize: 12, marginTop: 14, color: st && st !== "saving" && st !== "saved" ? C.danger : C.ink3, fontWeight: st && st !== "saving" && st !== "saved" ? 700 : 400 }}>
              {st === "saving" ? "Đang lưu…" : st && st !== "saved" ? `⚠ Chưa lưu được: ${st}` : "Mọi thay đổi được lưu tự động."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RecipesApp />);
