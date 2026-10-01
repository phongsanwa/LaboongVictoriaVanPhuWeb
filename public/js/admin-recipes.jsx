/* global React, ReactDOM, Icon, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, NAV_URLS, adminHref */
// Công thức món & giá vốn (COGS)
const { useState, useEffect, useMemo, useCallback } = React;

const RC_DEFAULTS = { brand: ["#0F623F", "#07432A"], dark: false };
const RCDATA = window.ADMIN_RECIPES_DATA || { admin: null, recipes: [], ingredients: [] };
const SCALE_M = 0.75;

function csrf() { return document.querySelector('meta[name="csrf-token"]')?.content || ""; }
async function api(method, url, body) {
  const r = await fetch(url, {
    method, headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": csrf() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let d = {}; try { d = await r.json(); } catch {}
  return { ok: r.ok, data: d };
}

function fmtVnd(n) { return Math.round(n || 0).toLocaleString("vi-VN") + "đ"; }
function marginColor(pct) { return pct >= 50 ? "var(--ok)" : pct >= 35 ? "#B4762A" : "var(--danger)"; }
function marginBg(pct) { return pct >= 50 ? "var(--ok-bg)" : pct >= 35 ? "#FCF3E4" : "var(--danger-bg,#FBEAE3)"; }

function computeRecipe(recipe, ingredients, size) {
  const scale = size === "L" ? 1 : SCALE_M;
  const price = size === "L" ? recipe.price_l : recipe.price_m;
  if (recipe.input_mode === "direct") {
    const cogs = size === "L" ? recipe.direct_cogs_l : recipe.direct_cogs_m;
    const gp = price - cogs; const mp = price ? (gp / price) * 100 : 0;
    return { variable: 0, wastage: 0, packaging: 0, cogs, grossProfit: gp, marginPct: mp };
  }
  const ingMap = Object.fromEntries((ingredients || []).map(i => [i.id, i]));
  let variable = 0;
  (recipe.ingredients || []).forEach(ri => {
    if (ri.ingredient_id) {
      const cat = ingMap[ri.ingredient_id];
      if (cat) variable += (ri.qty_l || 0) * scale * (cat.use_price || 0);
    } else {
      variable += (ri.qty_l || 0) * scale * (ri.custom_unit_price || 0);
    }
  });
  const wastagePct = recipe.wastage_pct || 5;
  const wastage = variable * (wastagePct / 100);
  const packaging = size === "L" ? (recipe.packaging_l || 0) : (recipe.packaging_m || 0);
  const cogs = variable + wastage + packaging;
  const gp = price - cogs; const mp = price ? (gp / price) * 100 : 0;
  return { variable, wastage, packaging, cogs, grossProfit: gp, marginPct: mp };
}

// ─── RecipeEditor ─────────────────────────────────────────────────────────────
function RecipeEditor({ recipe, ingredients, onSave, onClose }) {
  const [name, setName] = useState(recipe?.name || "Món mới");
  const [inputMode, setInputMode] = useState(recipe?.input_mode || "detailed");
  const [size, setSize] = useState("L");
  const [wastagePct] = useState(recipe?.wastage_pct || 5);
  const [packM, setPackM] = useState(recipe?.packaging_m || 950);
  const [packL, setPackL] = useState(recipe?.packaging_l || 1300);
  const [priceM, setPriceM] = useState(recipe?.price_m || 0);
  const [priceL, setPriceL] = useState(recipe?.price_l || 0);
  const [cogsM, setCogsM] = useState(recipe?.direct_cogs_m || 0);
  const [cogsL, setCogsL] = useState(recipe?.direct_cogs_l || 0);
  const [ings, setIngs] = useState(() => (recipe?.ingredients || [{ ingredient_id: null, qty_l: 0, custom_name: "", custom_unit: "g", custom_unit_price: 0, sort_order: 0 }]).map(i => ({ ...i })));
  const [saving, setSaving] = useState(false);

  const addIng = () => setIngs(prev => [...prev, { ingredient_id: null, qty_l: 0, custom_name: "", custom_unit: "g", custom_unit_price: 0, sort_order: prev.length }]);
  const removeIng = idx => setIngs(prev => prev.filter((_, i) => i !== idx));
  const updateIng = (idx, field, value) => setIngs(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const scale = size === "L" ? 1 : SCALE_M;
  const price = size === "L" ? priceL : priceM;
  const ingMap = Object.fromEntries((ingredients || []).map(i => [i.id, i]));

  // build display ings (scale qty for current size)
  const ingRows = ings.map((ri, idx) => {
    const cat = ri.ingredient_id ? ingMap[ri.ingredient_id] : null;
    const isManual = !ri.ingredient_id;
    const unitPrice = cat ? cat.use_price : (ri.custom_unit_price || 0);
    const unit = cat ? cat.use_unit : (ri.custom_unit || "g");
    const displayQty = Math.round((ri.qty_l || 0) * scale * 100) / 100;
    const total = (ri.qty_l || 0) * scale * unitPrice;
    return { ri, idx, cat, isManual, unit, unitPrice, displayQty, total };
  });

  // compute totals
  let variable = 0;
  ings.forEach(ri => {
    const cat = ri.ingredient_id ? ingMap[ri.ingredient_id] : null;
    const up = cat ? (cat.use_price || 0) : (ri.custom_unit_price || 0);
    variable += (ri.qty_l || 0) * scale * up;
  });
  const wastage = variable * (wastagePct / 100);
  const pack = size === "L" ? packL : packM;
  const totalCogs = inputMode === "detailed" ? variable + wastage + pack : (size === "L" ? cogsL : cogsM);
  const gp = price - totalCogs;
  const mp = price ? (gp / price) * 100 : 0;

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name, input_mode: inputMode, wastage_pct: wastagePct,
      packaging_m: packM, packaging_l: packL,
      price_m: priceM, price_l: priceL,
      direct_cogs_m: cogsM, direct_cogs_l: cogsL,
      ingredients: ings.map((ri, i) => ({ ...ri, sort_order: i })),
    };
    const url = recipe?.id ? `/admin/recipes/${recipe.id}` : "/admin/recipes";
    const method = recipe?.id ? "PUT" : "POST";
    const { ok, data } = await api(method, url, payload);
    setSaving(false);
    if (ok) onSave(data.recipe);
    else alert(data.message || "Lỗi lưu công thức");
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)" }} />
      <div style={{ position: "relative", marginLeft: "auto", width: "100%", maxWidth: 720, height: "100%", overflowY: "auto", background: "var(--panel)", borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,.18)" }}>
        {/* header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Tên món" className="inp" style={{ fontSize: 18, fontWeight: 800 }} />
          </div>
          <div className="miniseg">
            {["detailed", "direct"].map(m => (
              <button key={m} className={inputMode === m ? "on" : ""} onClick={() => setInputMode(m)}>
                {m === "detailed" ? "Định lượng" : "Nhập thẳng"}
              </button>
            ))}
          </div>
          <div className="miniseg">
            {["M", "L"].map(s => (
              <button key={s} className={size === s ? "on" : ""} onClick={() => setSize(s)}>Size {s}</button>
            ))}
          </div>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20 }}>
          {inputMode === "detailed" ? (
            <div style={{ border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
              {/* table header */}
              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.9fr 0.6fr 1fr 1fr 28px", gap: 8, padding: "12px 16px", background: "var(--hover)", fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase" }}>
                <div>Nguyên liệu</div><div>Số lượng</div><div>ĐV</div><div>Đơn giá</div><div style={{ textAlign: "right" }}>Thành tiền</div><div></div>
              </div>
              {ingRows.map(({ ri, idx, cat, isManual, unit, unitPrice, displayQty, total }) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.8fr 0.9fr 0.6fr 1fr 1fr 28px", gap: 8, padding: "9px 16px", borderTop: "1px solid var(--line-2)", alignItems: "start" }}>
                  <div>
                    <select value={ri.ingredient_id || ""} onChange={e => updateIng(idx, "ingredient_id", e.target.value ? parseInt(e.target.value) : null)} className="inp">
                      <option value="">-- Chọn từ kho --</option>
                      {(ingredients || []).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      <option value="__manual">Nhập tên khác...</option>
                    </select>
                    {isManual && <input value={ri.custom_name || ""} onChange={e => updateIng(idx, "custom_name", e.target.value)} placeholder="Tên nguyên liệu" className="inp" style={{ marginTop: 6 }} />}
                  </div>
                  <input type="number" value={displayQty} onChange={e => updateIng(idx, "qty_l", parseFloat(e.target.value) / (scale || 1) || 0)} className="inp" />
                  <div>
                    {isManual ? <input value={ri.custom_unit || ""} onChange={e => updateIng(idx, "custom_unit", e.target.value)} className="inp" style={{ textAlign: "center" }} /> : <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-2)", padding: "7px 0" }}>{unit}</div>}
                  </div>
                  <div>
                    {isManual ? <input type="number" value={ri.custom_unit_price || 0} onChange={e => updateIng(idx, "custom_unit_price", parseFloat(e.target.value) || 0)} className="inp" /> : <div style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink-2)", padding: "7px 0" }}>{fmtVnd(unitPrice)}/{unit}</div>}
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13.5, padding: "7px 0" }}>{fmtVnd(total)}</div>
                  <button onClick={() => removeIng(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontWeight: 700, fontSize: 15 }}>×</button>
                </div>
              ))}
              <div onClick={addIng} style={{ padding: "11px 16px", borderTop: "1px solid var(--line-2)", fontSize: 13, fontWeight: 700, color: "var(--brand)", cursor: "pointer" }}>+ Thêm nguyên liệu</div>
              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.9fr 0.6fr 1fr 1fr 28px", gap: 8, padding: "13px 16px", borderTop: "1px solid var(--line-2)", fontSize: 13, color: "var(--ink-3)" }}>
                <div>Hao hụt ({wastagePct}%)</div><div/><div/><div/>
                <div style={{ textAlign: "right", fontWeight: 700, color: "var(--ink)" }}>{fmtVnd(wastage)}</div><div/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.9fr 0.6fr 1fr 1fr 28px", gap: 8, padding: "13px 16px", borderTop: "1px solid var(--line-2)" }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Bao bì (ly, nắp, ống hút)</div><div/><div/><div/>
                <div style={{ textAlign: "right", fontWeight: 700 }}>{fmtVnd(pack)}</div><div/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.9fr 0.6fr 1fr 1fr 28px", gap: 8, padding: "16px", borderTop: "1.5px solid var(--ink)" }}>
                <div style={{ fontWeight: 800, fontSize: 14.5 }}>Tổng giá vốn / ly (COGS)</div><div/><div/><div/>
                <div style={{ textAlign: "right", fontWeight: 800, fontSize: 17, color: "var(--brand)" }}>{fmtVnd(totalCogs)}</div><div/>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Giá vốn / ly (M)", value: cogsM, set: setCogsM },
                { label: "Giá vốn / ly (L)", value: cogsL, set: setCogsL },
              ].map(({ label, value, set }) => (
                <div key={label} style={{ background: "var(--hover)", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase" }}>{label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
                    <input type="number" value={value} onChange={e => set(parseFloat(e.target.value) || 0)} style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", border: "none", borderBottom: "1.5px dashed var(--line)", background: "transparent", width: 120 }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-3)" }}>đ</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* price + margin */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "var(--hover)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase" }}>Giá bán / ly ({size})</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
                <input type="number" value={size === "L" ? priceL : priceM} onChange={e => size === "L" ? setPriceL(parseFloat(e.target.value) || 0) : setPriceM(parseFloat(e.target.value) || 0)}
                  style={{ fontSize: 22, fontWeight: 800, border: "none", borderBottom: "1.5px dashed var(--line)", background: "transparent", width: 120 }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-3)" }}>đ</span>
              </div>
            </div>
            <div style={{ background: marginBg(mp), borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: marginColor(mp), textTransform: "uppercase" }}>Lợi nhuận gộp · Biên</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: marginColor(mp), marginTop: 8 }}>
                {fmtVnd(gp)} · {Math.round(mp)}%
              </div>
              <div style={{ fontSize: 12, color: marginColor(mp), marginTop: 4, fontWeight: 600 }}>
                {mp >= 50 ? "Biên lợi nhuận tốt" : mp >= 35 ? "Biên ở mức trung bình" : "Biên thấp — cân nhắc tăng giá bán"}
              </div>
            </div>
          </div>

          {/* packaging fields */}
          <details className="cb-advanced">
            <summary className="cb-adv-title">Bao bì & cài đặt nâng cao</summary>
            <div className="cb-adv-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[["Bao bì size M (đ)", packM, setPackM], ["Bao bì size L (đ)", packL, setPackL]].map(([lbl, val, set]) => (
                  <div key={lbl}><div className="fl" style={{ fontSize: 12, marginBottom: 5 }}>{lbl}</div>
                    <input type="number" value={val} onChange={e => set(parseFloat(e.target.value) || 0)} className="inp" /></div>
                ))}
                {[["Giá bán size M (đ)", priceM, setPriceM], ["Giá bán size L (đ)", priceL, setPriceL]].map(([lbl, val, set]) => (
                  <div key={lbl}><div className="fl" style={{ fontSize: 12, marginBottom: 5 }}>{lbl}</div>
                    <input type="number" value={val} onChange={e => set(parseFloat(e.target.value) || 0)} className="inp" /></div>
                ))}
              </div>
            </div>
          </details>
        </div>

        {/* footer */}
        <div style={{ padding: "16px 22px", borderTop: "1px solid var(--line)", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} className="btn-ghost">Huỷ</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "Đang lưu…" : recipe?.id ? "Cập nhật" : "Tạo công thức"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────
function RecipeCard({ recipe, ingredients, onEdit, onDelete, onSnapshot }) {
  const computed = computeRecipe(recipe, ingredients, "L");
  const mp = Math.round(computed.marginPct);
  const [snapping, setSnapping] = useState(false);

  const doSnapshot = async () => {
    setSnapping(true);
    await onSnapshot(recipe);
    setSnapping(false);
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{recipe.name}</div>
        <div style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 800, background: marginBg(mp), color: marginColor(mp), flex: "none" }}>{mp}%</div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Giá vốn (L): <strong>{fmtVnd(computed.cogs)}</strong> · Giá bán: {fmtVnd(recipe.price_l)}</div>
      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{recipe.ingredients?.length || 0} nguyên liệu · {recipe.input_mode === "direct" ? "Nhập thẳng" : "Định lượng"}</div>

      {/* cost history */}
      {recipe.cost_history?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {recipe.cost_history.slice(-2).reverse().map(h => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "var(--hover)", borderRadius: 8, fontSize: 12 }}>
              <span style={{ color: "var(--ink-3)" }}>{h.recorded_on}</span>
              <span style={{ fontWeight: 700 }}>{fmtVnd(h.cogs_l)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <button onClick={() => onEdit(recipe)} className="btn-ghost" style={{ flex: 1, fontSize: 13 }}>Chỉnh sửa</button>
        <button onClick={doSnapshot} disabled={snapping} className="pill-btn" style={{ fontSize: 12 }}>{snapping ? "…" : "Lưu giá vốn"}</button>
        <button onClick={() => onDelete(recipe)} className="btn-icon" style={{ color: "var(--danger)" }}><Icon name="trash" size={14} /></button>
      </div>
    </div>
  );
}

// ─── RecipesApp ───────────────────────────────────────────────────────────────
function RecipesApp() {
  const [tw, setTweak] = useTweaks(RC_DEFAULTS);
  const [recipes, setRecipes] = useState(() => (RCDATA.recipes || []).map(r => ({ ...r })));
  const [ingredients] = useState(RCDATA.ingredients || []);
  const [editor, setEditor] = useState(null);
  const [toast, setToast] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const admin = RCDATA.admin || {};

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b); r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const flash = msg => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const onSave = (recipe) => {
    setRecipes(prev => {
      const idx = prev.findIndex(r => r.id === recipe.id);
      return idx >= 0 ? prev.map(r => r.id === recipe.id ? recipe : r) : [...prev, recipe];
    });
    setEditor(null);
    flash("Đã lưu công thức " + recipe.name);
  };

  const onDelete = async (recipe) => {
    if (!confirm(`Xóa công thức "${recipe.name}"?`)) return;
    const { ok, data } = await api("DELETE", `/admin/recipes/${recipe.id}`);
    if (ok) { setRecipes(prev => prev.filter(r => r.id !== recipe.id)); flash("Đã xóa"); }
    else flash(data.message || "Không thể xóa");
  };

  const onSnapshot = async (recipe) => {
    const computed = computeRecipe(recipe, ingredients, "L");
    const { ok, data } = await api("POST", `/admin/recipes/${recipe.id}/snapshot`, { cogs_l: computed.cogs });
    if (ok) {
      setRecipes(prev => prev.map(r => r.id === recipe.id ? data.recipe : r));
      flash("Đã lưu giá vốn hôm nay");
    }
  };

  return (
    <div className="app-wrap">
      <aside className={`sidebar ${sideOpen ? "open" : ""}`}>
        <div className="sidebar-logo"><span className="sidebar-brand">Admin</span></div>
        <nav className="sidebar-nav">
          {Object.entries(window.ADMIN_NAV_HREF || {}).map(([label, href]) => (
            <a key={label} href={href} className={`sidebar-link ${href === "/admin/recipes" ? "active" : ""}`}><span>{label}</span></a>
          ))}
        </nav>
      </aside>
      {sideOpen && <div className="sidebar-backdrop" onClick={() => setSideOpen(false)} />}

      <div className="main-col">
        <div className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div style={{ flex: 1 }}>
            <div className="page-title">Công thức món & giá vốn</div>
            <div className="page-sub">Chọn nguyên liệu và định lượng — tự tính giá vốn mỗi ly và biên lợi nhuận</div>
          </div>
          <button className="btn-primary" onClick={() => setEditor({ recipe: null })}>
            <Icon name="plus" size={15} color="#fff" /> Thêm món
          </button>
          <div className="topbar-user">
            <div className="avatar-chip">{admin.initials}</div>
          </div>
        </div>

        <div className="page-body">
          {recipes.length === 0 ? (
            <div className="cb-empty-state">
              <h3>Chưa có công thức nào</h3>
              <p>Thêm công thức để tính giá vốn và biên lợi nhuận chính xác</p>
              <button className="btn-primary" onClick={() => setEditor({ recipe: null })}>+ Thêm công thức đầu tiên</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
              {recipes.map(r => (
                <RecipeCard key={r.id} recipe={r} ingredients={ingredients} onEdit={r => setEditor({ recipe: r })} onDelete={onDelete} onSnapshot={onSnapshot} />
              ))}
            </div>
          )}
        </div>
      </div>

      {editor && <RecipeEditor recipe={editor.recipe} ingredients={ingredients} onSave={onSave} onClose={() => setEditor(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(RecipesApp));
