/* global React, ReactDOM, Icon, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, NAV_URLS, adminHref */
// Quản lý nguyên liệu — admin-ingredients.jsx
const { useState, useEffect, useMemo, useRef } = React;

const IG_DEFAULTS = { brand: ["#0F623F", "#07432A"], dark: false };
const IGDATA = window.ADMIN_INGREDIENTS_DATA || { admin: null, ingredients: [], stores: [] };

function csrf() { return document.querySelector('meta[name="csrf-token"]')?.content || ""; }
async function api(method, url, body) {
  const r = await fetch(url, {
    method, headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": csrf() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let d = {}; try { d = await r.json(); } catch {}
  return { ok: r.ok, data: d };
}

function fmtInt(n) { return Math.round(n || 0).toLocaleString("vi-VN"); }

// ─── IngredientRow ────────────────────────────────────────────────────────────
function IngredientRow({ row, stores, activeStore, onUpdate, onRemove, onSetOverride, onClearOverride, onOverrideChange }) {
  const usePrice = row.conversion > 0 ? row.buy_price / row.conversion : 0;
  const isStoreView = activeStore !== "chung";
  const override = isStoreView ? (row.overrides?.[activeStore] ?? null) : null;
  const hasOverride = override !== null;
  const displayPrice = hasOverride ? override : usePrice;
  const missing = !row.name || !row.buy_price || !row.conversion;

  return (
    <div style={{ borderTop: "1px solid var(--line-2)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1.1fr 0.9fr 0.8fr 1.2fr 1.3fr 28px", gap: 8, padding: "10px 18px", alignItems: "center" }}>
        <input value={row.name} onChange={e => onUpdate("name", e.target.value)} placeholder="Tên nguyên liệu" className="inp" />
        <input value={row.buy_unit} onChange={e => onUpdate("buy_unit", e.target.value)} placeholder="kg, lon..." className="inp" />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="number" value={row.buy_price} onChange={e => onUpdate("buy_price", parseFloat(e.target.value) || 0)} className="inp" style={{ textAlign: "right" }} />
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>đ</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>1 =</span>
          <input type="number" value={row.conversion} onChange={e => onUpdate("conversion", parseFloat(e.target.value) || 1)} className="inp" style={{ textAlign: "center" }} />
        </div>
        <input value={row.use_unit} onChange={e => onUpdate("use_unit", e.target.value)} placeholder="g, ml..." className="inp" style={{ textAlign: "center" }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--brand)" }}>{fmtInt(displayPrice)}đ</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>/{row.use_unit || "?"}</div>
        </div>
        {/* override column */}
        <div>
          {isStoreView ? (
            hasOverride ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input type="number" value={override} onChange={e => onOverrideChange(parseFloat(e.target.value) || 0)}
                  style={{ border: "1.5px solid var(--brand)", borderRadius: 8, padding: "6px 8px", fontSize: 12.5, width: 72, background: "var(--brand-soft)" }} />
                <span onClick={onClearOverride} style={{ fontSize: 11, color: "var(--danger)", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Bỏ</span>
              </div>
            ) : (
              <button onClick={onSetOverride} className="pill-btn" style={{ fontSize: 11.5 }}>Ghi đè giá</button>
            )
          ) : (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-3)" }}>Giá chung</span>
          )}
        </div>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontWeight: 700, fontSize: 15 }}>×</button>
      </div>
      {missing && (
        <div style={{ padding: "0 18px 10px 18px", fontSize: 11.5, color: "var(--danger)", fontWeight: 600 }}>⚠ Thiếu giá hoặc quy đổi — công thức dùng nguyên liệu này sẽ tính sai giá vốn.</div>
      )}
    </div>
  );
}

// ─── IngredientsApp ───────────────────────────────────────────────────────────
function IngredientsApp() {
  const [tw, setTweak] = useTweaks(IG_DEFAULTS);
  const [rows, setRows] = useState(() => (IGDATA.ingredients || []).map(i => ({ ...i })));
  const [activeStore, setActiveStore] = useState("chung");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const stores = IGDATA.stores || [];
  const admin = IGDATA.admin || {};

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b); r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const flash = msg => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const addRow = () => {
    setRows(prev => [...prev, { id: null, name: "", buy_unit: "kg", buy_price: 0, conversion: 1000, use_unit: "g", overrides: {}, _dirty: true }]);
  };

  const updateRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value, _dirty: true } : r));
  };

  const removeRow = async (idx) => {
    const row = rows[idx];
    if (row.id) {
      const { ok, data } = await api("DELETE", `/admin/ingredients/${row.id}`);
      if (!ok) { flash(data.message || "Không thể xóa"); return; }
    }
    setRows(prev => prev.filter((_, i) => i !== idx));
    flash("Đã xóa nguyên liệu");
  };

  const setOverride = (idx) => {
    const row = rows[idx];
    const usePrice = row.conversion > 0 ? row.buy_price / row.conversion : 0;
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, overrides: { ...r.overrides, [activeStore]: Math.round(usePrice * 10000) / 10000 }, _dirty: true } : r));
  };

  const clearOverride = (idx) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const ov = { ...r.overrides }; delete ov[activeStore];
      return { ...r, overrides: ov, _dirty: true };
    }));
  };

  const changeOverride = (idx, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, overrides: { ...r.overrides, [activeStore]: value }, _dirty: true } : r));
  };

  const saveAll = async () => {
    setSaving(true);
    let saved = 0;
    const next = [...rows];
    for (let i = 0; i < next.length; i++) {
      const r = next[i];
      if (!r._dirty) continue;
      const payload = { name: r.name, buy_unit: r.buy_unit, buy_price: r.buy_price, conversion: r.conversion, use_unit: r.use_unit };
      let res;
      if (r.id) res = await api("PUT", `/admin/ingredients/${r.id}`, payload);
      else res = await api("POST", "/admin/ingredients", payload);
      if (res.ok) {
        next[i] = { ...res.data.ingredient, overrides: r.overrides || {}, _dirty: false };
        saved++;
        // sync overrides
        for (const [storeKey, price] of Object.entries(r.overrides || {})) {
          const storeId = stores.find(s => `store${s.id}` === storeKey || String(s.id) === storeKey)?.id;
          if (storeId) await api("POST", `/admin/ingredients/${next[i].id}/overrides/${storeId}`, { use_price: price });
        }
      }
    }
    setRows(next);
    setSaving(false);
    flash(`Đã lưu ${saved} nguyên liệu`);
  };

  const storeTabs = [{ key: "chung", label: "Giá chung" }, ...stores.map(s => ({ key: String(s.id), label: s.name }))];
  const isStoreView = activeStore !== "chung";
  const dirty = rows.some(r => r._dirty);

  return (
    <div className="app-wrap">
      {/* sidebar */}
      <aside className={`sidebar ${sideOpen ? "open" : ""}`}>
        <div className="sidebar-logo"><span className="sidebar-brand">Admin</span></div>
        <nav className="sidebar-nav">
          {Object.entries(window.ADMIN_NAV_HREF || {}).map(([label, href]) => (
            <a key={label} href={href} className={`sidebar-link ${href === "/admin/ingredients" ? "active" : ""}`}>
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </aside>
      {sideOpen && <div className="sidebar-backdrop" onClick={() => setSideOpen(false)} />}

      <div className="main-col">
        {/* header */}
        <div className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div style={{ flex: 1 }}>
            <div className="page-title">Quản lý nguyên liệu</div>
            <div className="page-sub">Nguồn dữ liệu gốc cho công thức món — cập nhật đúng đơn giá và quy đổi</div>
          </div>
          <div className="topbar-user">
            <div className="avatar-chip">{admin.initials}</div>
            <div className="user-info"><div className="user-name">{admin.name}</div></div>
          </div>
        </div>

        <div className="page-body">
          {/* store tabs + add button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
            <div className="miniseg">
              {storeTabs.map(s => (
                <button key={s.key} className={activeStore === s.key ? "on" : ""} onClick={() => setActiveStore(s.key)}>{s.label}</button>
              ))}
            </div>
            {isStoreView && (
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", background: "var(--hover)", borderRadius: 10, padding: "8px 14px", border: "1px solid var(--line)" }}>
                Đang xem giá của <strong>{storeTabs.find(s => s.key === activeStore)?.label}</strong>. Mặc định dùng giá chung — bấm "Ghi đè" để đặt giá riêng.
              </div>
            )}
          </div>

          {/* add row */}
          <button onClick={addRow} className="cb-empty-items" style={{ marginBottom: 12, width: "100%", cursor: "pointer", textAlign: "center", fontSize: 13.5, fontWeight: 700 }}>
            + Thêm nguyên liệu
          </button>

          {/* table */}
          <div className="card" style={{ overflow: "hidden", overflowX: "auto" }}>
            <div style={{ minWidth: 920 }}>
              {/* header */}
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1.1fr 0.9fr 0.8fr 1.2fr 1.3fr 28px", gap: 8, padding: "13px 18px", background: "var(--hover)", fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".3px" }}>
                <div>Nguyên liệu</div><div>Đơn vị mua</div><div>Giá mua</div><div>Quy đổi</div><div>ĐV dùng</div>
                <div style={{ textAlign: "right" }}>Giá dùng (tính)</div>
                <div>{isStoreView ? "Giá riêng cửa hàng" : "Trạng thái"}</div><div></div>
              </div>
              {rows.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-3)", fontSize: 14 }}>Chưa có nguyên liệu nào — bấm "+ Thêm" bên trên</div>
              )}
              {rows.map((row, idx) => (
                <IngredientRow key={idx} row={row} stores={stores} activeStore={activeStore}
                  onUpdate={(f, v) => updateRow(idx, f, v)}
                  onRemove={() => removeRow(idx)}
                  onSetOverride={() => setOverride(idx)}
                  onClearOverride={() => clearOverride(idx)}
                  onOverrideChange={v => changeOverride(idx, v)}
                />
              ))}
            </div>
          </div>

          {/* save bar */}
          {dirty && (
            <div className="savebar" style={{ marginTop: 16 }}>
              <div className="si" />
              <span className="stxt">Có thay đổi chưa lưu</span>
              <div className="sbtns">
                <button onClick={() => setRows(IGDATA.ingredients.map(i => ({ ...i })))} className="btn-ghost">Huỷ</button>
                <button onClick={saveAll} disabled={saving} className="btn-primary">{saving ? "Đang lưu…" : "Lưu tất cả"}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
      <TweaksPanel open={false} onClose={() => {}} tw={tw} setTweak={setTweak}>
        <TweakSection label="Màu sắc"><TweakColor label="Thương hiệu" value={tw.brand} onChange={v => setTweak("brand", v)} /></TweakSection>
        <TweakSection label="Giao diện"><TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} /></TweakSection>
      </TweaksPanel>

      <div id="react-root-ready" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(IngredientsApp));
