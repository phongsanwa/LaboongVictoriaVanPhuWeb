/* global React, ReactDOM, Icon, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, NAV_URLS, adminHref */
// Nhập liệu hàng ngày
const { useState, useEffect, useMemo } = React;

const DE_DEFAULTS = { brand: ["#0F623F", "#07432A"], dark: false };
const DEDATA = window.ADMIN_DAILY_DATA || { admin: null, stores: [], recipes: [], today: "", entries: {} };

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

// Build blank entry for a store
function blankEntry(storeId, recipes) {
  return {
    store_id: storeId, is_saved: false, dirty: true,
    sales: Object.fromEntries((recipes || []).map(r => [r.id, { qty_m: 0, qty_l: 0 }])),
    expenses: [],
  };
}

function serverEntryToLocal(e, recipes) {
  const sales = Object.fromEntries((recipes || []).map(r => [r.id, { qty_m: 0, qty_l: 0 }]));
  if (e.sales) e.sales.forEach(s => { sales[s.recipe_id] = { qty_m: s.qty_m, qty_l: s.qty_l }; });
  return { store_id: e.store_id, is_saved: e.is_saved, dirty: false, sales, expenses: e.expenses || [] };
}

// ─── DailyEntriesApp ──────────────────────────────────────────────────────────
function DailyEntriesApp() {
  const [tw, setTweak] = useTweaks(DE_DEFAULTS);
  const stores = DEDATA.stores || [];
  const recipes = DEDATA.recipes || [];
  const today = DEDATA.today || new Date().toISOString().slice(0, 10);
  const admin = DEDATA.admin || {};

  // local entries state keyed by store_id
  const [entries, setEntries] = useState(() => {
    const init = {};
    stores.forEach(s => {
      const srv = DEDATA.entries?.[s.id];
      init[s.id] = srv ? serverEntryToLocal(srv, recipes) : blankEntry(s.id, recipes);
    });
    return init;
  });
  const [activeStore, setActiveStore] = useState(stores[0]?.id || null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b); r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const flash = msg => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const entry = entries[activeStore] || blankEntry(activeStore, recipes);

  const updateSale = (recipeId, size, value) => {
    setEntries(prev => ({
      ...prev,
      [activeStore]: {
        ...prev[activeStore],
        dirty: true, is_saved: false,
        sales: { ...prev[activeStore].sales, [recipeId]: { ...prev[activeStore].sales[recipeId], [size === "M" ? "qty_m" : "qty_l"]: parseInt(value) || 0 } },
      },
    }));
  };

  const addExpense = () => {
    setEntries(prev => ({
      ...prev,
      [activeStore]: { ...prev[activeStore], dirty: true, is_saved: false, expenses: [...(prev[activeStore].expenses || []), { description: "", amount: 0 }] },
    }));
  };

  const updateExpense = (idx, field, value) => {
    setEntries(prev => {
      const exps = [...(prev[activeStore].expenses || [])];
      exps[idx] = { ...exps[idx], [field]: field === "amount" ? parseFloat(value) || 0 : value };
      return { ...prev, [activeStore]: { ...prev[activeStore], dirty: true, is_saved: false, expenses: exps } };
    });
  };

  const removeExpense = (idx) => {
    setEntries(prev => ({
      ...prev,
      [activeStore]: { ...prev[activeStore], dirty: true, is_saved: false, expenses: (prev[activeStore].expenses || []).filter((_, i) => i !== idx) },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const e = entry;
    const payload = {
      is_saved: true,
      sales: Object.entries(e.sales).map(([rid, q]) => ({ recipe_id: parseInt(rid), qty_m: q.qty_m, qty_l: q.qty_l })),
      expenses: e.expenses,
    };
    const { ok, data } = await api("POST", `/admin/daily-entries/${activeStore}/${today}`, payload);
    setSaving(false);
    if (ok) {
      setEntries(prev => ({
        ...prev,
        [activeStore]: { ...serverEntryToLocal(data.entry, recipes), is_saved: true, dirty: false },
      }));
      flash("Đã lưu số liệu hôm nay");
    } else flash(data.message || "Lỗi lưu");
  };

  // totals
  const { totalCups, totalRevenue, totalExpense } = useMemo(() => {
    const e = entry;
    let cups = 0, rev = 0;
    recipes.forEach(r => {
      const s = e.sales[r.id] || { qty_m: 0, qty_l: 0 };
      cups += s.qty_m + s.qty_l;
      rev += s.qty_m * r.price_m + s.qty_l * r.price_l;
    });
    const exp = (e.expenses || []).reduce((s, ex) => s + (ex.amount || 0), 0);
    return { totalCups: cups, totalRevenue: rev, totalExpense: exp };
  }, [entry, recipes]);

  return (
    <div className="app-wrap">
      <aside className={`sidebar ${sideOpen ? "open" : ""}`}>
        <div className="sidebar-logo"><span className="sidebar-brand">Admin</span></div>
        <nav className="sidebar-nav">
          {Object.entries(window.ADMIN_NAV_HREF || {}).map(([label, href]) => (
            <a key={label} href={href} className={`sidebar-link ${href === "/admin/daily-entries" ? "active" : ""}`}><span>{label}</span></a>
          ))}
        </nav>
      </aside>
      {sideOpen && <div className="sidebar-backdrop" onClick={() => setSideOpen(false)} />}

      <div className="main-col">
        <div className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div style={{ flex: 1 }}>
            <div className="page-title">Nhập liệu hàng ngày</div>
            <div className="page-sub">{today} · chọn quán rồi nhập số ly bán</div>
          </div>
          <div className="topbar-user"><div className="avatar-chip">{admin.initials}</div></div>
        </div>

        <div className="page-body">
          {/* store cards */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
            {stores.map(s => {
              const e = entries[s.id] || {};
              const isActive = s.id === activeStore;
              return (
                <div key={s.id} onClick={() => setActiveStore(s.id)}
                  style={{ flex: 1, minWidth: 260, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 16, cursor: "pointer", background: "var(--panel)", border: `1.5px solid ${isActive ? "var(--brand)" : "var(--line)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: e.is_saved ? "var(--ok)" : "#E0983F", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>
                      {e.is_saved ? "✓" : "!"}
                    </div>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.name}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: e.is_saved ? "var(--ok)" : "#B4762A" }}>
                        {e.is_saved ? "Đã nhập hôm nay" : "Chưa nhập hôm nay"}
                      </div>
                    </div>
                  </div>
                  {isActive && <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "var(--brand)", padding: "5px 11px", borderRadius: 999 }}>Đang nhập</div>}
                </div>
              );
            })}
          </div>

          {/* entry form */}
          {activeStore && (
            <div className="card">
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Số ly bán — {stores.find(s => s.id === activeStore)?.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>Nhập nhanh số ly theo từng size</div>
              </div>

              {/* dish rows */}
              {recipes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 20px", color: "var(--ink-3)", fontSize: 14 }}>
                  Chưa có công thức nào — <a href="/admin/recipes" style={{ color: "var(--brand)" }}>thêm ở trang Công thức</a>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {recipes.map(r => {
                    const s = entry.sales[r.id] || { qty_m: 0, qty_l: 0 };
                    const rev = s.qty_m * r.price_m + s.qty_l * r.price_l;
                    return (
                      <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 10, alignItems: "center", padding: "12px 14px", background: "var(--hover)", borderRadius: 12 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</div>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4, fontWeight: 700 }}>Size M</div>
                          <input type="number" value={s.qty_m} min="0" onChange={e => updateSale(r.id, "M", e.target.value)}
                            className="inp" style={{ textAlign: "center" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4, fontWeight: 700 }}>Size L</div>
                          <input type="number" value={s.qty_l} min="0" onChange={e => updateSale(r.id, "L", e.target.value)}
                            className="inp" style={{ textAlign: "center" }} />
                        </div>
                        <div style={{ textAlign: "right", fontWeight: 800, fontSize: 14.5, color: "var(--brand)" }}>{fmtVnd(rev)}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* daily expenses */}
              <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>Chi phí phát sinh trong ngày</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12 }}>Đá thêm, sửa máy, đồ dùng vặt... — không phải chi phí cố định hằng tháng</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                {(entry.expenses || []).map((e, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 28px", gap: 8, alignItems: "center" }}>
                    <input value={e.description} onChange={ev => updateExpense(idx, "description", ev.target.value)} placeholder="Mô tả chi phí" className="inp" />
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="number" value={e.amount} onChange={ev => updateExpense(idx, "amount", ev.target.value)} className="inp" />
                      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>đ</span>
                    </div>
                    <button onClick={() => removeExpense(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontWeight: 700, fontSize: 15 }}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={addExpense} style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", padding: "6px 0" }}>+ Thêm chi phí</button>

              {/* summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12, marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
                {[
                  { label: "Tổng ly bán", value: `${totalCups} ly` },
                  { label: "Doanh thu", value: fmtVnd(totalRevenue), color: "var(--brand)" },
                  { label: "Chi phí phát sinh", value: fmtVnd(totalExpense), color: "var(--danger)" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase" }}>{label}</div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: color || "var(--ink)", marginTop: 4 }}>{value}</div>
                  </div>
                ))}
              </div>

              <button onClick={handleSave} disabled={saving || (!entry.dirty && entry.is_saved)}
                style={{ marginTop: 22, width: "100%", padding: 15, borderRadius: 14, background: entry.is_saved && !entry.dirty ? "var(--ok)" : "var(--brand)", color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}>
                {saving ? "Đang lưu…" : entry.is_saved && !entry.dirty ? "✓ Đã lưu số liệu hôm nay" : "Lưu số liệu hôm nay"}
              </button>
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(DailyEntriesApp));
