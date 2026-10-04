/* global React, ReactDOM, OPS_C, opsFmt, opsApi, OpsHeader, useNarrowScreen */
const { useState, useRef, useEffect } = React;

const D = window.ADMIN_DAILY_DATA;
const C = OPS_C;
const RECIPES = D.recipes;
const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const inp = { border: `1px solid ${C.field}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, width: "100%", background: "#fff", fontFamily: "inherit", color: C.ink, outline: "none" };

function longDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]}, ${d} tháng ${m}, ${y}`;
}

function toLocal(entry) {
  const sales = Object.fromEntries(RECIPES.map(r => [r.id, { M: 0, L: 0 }]));
  (entry?.sales || []).forEach(s => { if (sales[s.recipe_id]) sales[s.recipe_id] = { M: s.qty_m, L: s.qty_l }; });
  return { sales, expenses: (entry?.expenses || []).map(e => ({ description: e.description || "", amount: e.amount })), saved: !!entry?.is_saved, dirty: false };
}

function DailyEntriesApp() {
  const narrow = useNarrowScreen(640);
  const [entries, setEntries] = useState(() => Object.fromEntries(D.stores.map(s => [s.id, toLocal(D.entries[s.id])])));
  const [active, setActive] = useState(() => {
    const firstMissing = D.stores.find(s => !D.entries[s.id]?.is_saved);
    return (firstMissing || D.stores[0])?.id;
  });
  const [mode, setMode] = useState("manual");
  const [imp, setImp] = useState({ status: "empty" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const anyDirty = Object.values(entries).some(e => e.dirty);
  useEffect(() => {
    const warn = e => { if (anyDirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);

  if (!D.stores.length || !RECIPES.length) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.ink }}>
        <OpsHeader admin={D.admin} links={[{ href: "/admin/overview", label: "← Trang chủ" }]} />
        <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Chưa thể nhập liệu</div>
          <div style={{ color: C.ink2, fontSize: 14 }}>
            {!D.stores.length ? <>Cần có ít nhất một cửa hàng đang hoạt động — thêm ở <a href="/admin/store-settings" style={{ color: C.brand, fontWeight: 700 }}>Cài đặt cửa hàng</a>.</>
              : <>Cần có ít nhất một món — tạo ở <a href="/admin/recipes" style={{ color: C.brand, fontWeight: 700 }}>Công thức món</a> (kèm giá bán size M/L).</>}
          </div>
        </div>
      </div>
    );
  }

  const entry = entries[active];
  const store = D.stores.find(s => s.id === active);
  const patch = fn => setEntries(es => ({ ...es, [active]: { ...fn(es[active]), dirty: true, saved: false } }));

  const setQty = (rid, size, v) => patch(e => ({ ...e, sales: { ...e.sales, [rid]: { ...e.sales[rid], [size]: Math.max(0, Math.floor(Number(v) || 0)) } } }));
  const setExpense = (i, field, v) => patch(e => ({ ...e, expenses: e.expenses.map((x, j) => (j === i ? { ...x, [field]: field === "amount" ? Math.max(0, Number(v) || 0) : v } : x)) }));

  const switchStore = id => { setActive(id); setImp({ status: "empty" }); setError(null); };

  const upload = async (file) => {
    if (!file) return;
    setImp({ status: "loading", file: file.name });
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(D.urls.import, { method: "POST", body: form, headers: { Accept: "application/json", "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || Object.values(data.errors || {}).flat()[0] || "Không đọc được file.");
      patch(e => {
        const sales = { ...e.sales };
        data.matched.forEach(m => { if (sales[m.recipe_id]) sales[m.recipe_id] = { M: m.qty_m, L: m.qty_l }; });
        return { ...e, sales };
      });
      setImp({ status: "done", ...data });
    } catch (err) {
      setImp({ status: "error", message: err.message });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    if (saving || (entry.saved && !entry.dirty)) return;
    setSaving(true); setError(null);
    try {
      const data = await opsApi("POST", D.urls.save.replace("__STORE__", active).replace("__DATE__", D.today), {
        date: D.today,
        is_saved: true,
        sales: RECIPES.map(r => ({ recipe_id: r.id, qty_m: entry.sales[r.id].M, qty_l: entry.sales[r.id].L })),
        expenses: entry.expenses.filter(x => x.description.trim() || x.amount > 0).map(x => ({ description: x.description.trim(), amount: x.amount })),
      });
      setEntries(es => ({ ...es, [active]: toLocal(data.entry) }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  let cups = 0, revenue = 0;
  const rows = RECIPES.map(r => {
    const q = entry.sales[r.id];
    const rev = q.M * r.price_m + q.L * r.price_l;
    cups += q.M + q.L; revenue += rev;
    return { r, q, rev };
  });
  const expenseTotal = entry.expenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const isSaved = entry.saved && !entry.dirty;
  const seg = on => ({ padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", background: on ? "#fff" : "transparent", color: on ? C.brand : C.ink2 });
  const qtyInput = { ...inp, padding: "8px 10px", fontSize: 14, textAlign: "center" };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 80, background: C.bg, color: C.ink }}>
      <OpsHeader admin={D.admin} links={[{ href: "/admin/overview", label: "← Trang chủ" }]} />

      <div style={{ maxWidth: 820, margin: "0 auto", padding: narrow ? "24px 16px 0" : "36px 24px 0" }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.4px" }}>Nhập liệu cuối ngày</div>
          <div style={{ fontSize: 14.5, color: C.ink2, marginTop: 4 }}>{longDate(D.today)} · chọn quán rồi nhập số ly bán — chỉ mất chưa đến 2 phút</div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 26 }}>
          {D.stores.map(s => {
            const e = entries[s.id];
            const ok = e.saved && !e.dirty;
            const on = s.id === active;
            return (
              <div key={s.id} onClick={() => switchStore(s.id)} style={{ flex: 1, minWidth: narrow ? "100%" : 260, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 16, cursor: "pointer", background: "#fff", border: `1.5px solid ${on ? C.brand : C.line}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: ok ? C.brand2 : "#E0983F", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>{ok ? "✓" : "!"}</div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 12.5, color: ok ? C.brand2 : "#B4762A", fontWeight: 600 }}>{ok ? "Đã nhập hôm nay" : e.dirty ? "Có thay đổi chưa lưu" : "Chưa nhập hôm nay"}</div>
                  </div>
                </div>
                {on && <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: C.brand, padding: "5px 11px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0, marginLeft: 8 }}>Đang nhập</div>}
              </div>
            );
          })}
        </div>

        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${C.line}`, padding: narrow ? 18 : 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Số ly bán — {store.name}</div>
              <div style={{ fontSize: 12.5, color: C.ink3, marginTop: 4 }}>Nhập nhanh số ly theo từng size, hoặc import file bán hàng từ máy POS</div>
            </div>
            <div style={{ display: "flex", gap: 6, background: C.tray, padding: 4, borderRadius: 10, flexShrink: 0 }}>
              <div onClick={() => setMode("manual")} style={seg(mode === "manual")}>Nhập tay</div>
              <div onClick={() => setMode("import")} style={seg(mode === "import")}>Import file POS</div>
            </div>
          </div>

          {mode === "import" && (
            <div style={{ marginTop: 18 }}>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: "none" }} onChange={e => upload(e.target.files[0])} />
              {(imp.status === "empty" || imp.status === "error") && (
                <div onClick={() => fileRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files[0]); }}
                  style={{ border: `1.5px dashed ${dragOver ? C.brand : "#C9C2AE"}`, background: dragOver ? C.okBg : "transparent", borderRadius: 16, padding: "32px 20px", textAlign: "center", cursor: "pointer" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Kéo thả hoặc bấm để chọn file POS</div>
                  <div style={{ fontSize: 12, color: C.ink3 }}>Hỗ trợ .csv, .xlsx xuất từ KiotViet, Sapo, hoặc máy POS khác — cần có cột tên món và số lượng</div>
                </div>
              )}
              {imp.status === "error" && <div style={{ marginTop: 10, fontSize: 12.5, color: C.danger, background: "#FBEAE3", borderRadius: 10, padding: "10px 14px", fontWeight: 600 }}>⚠ {imp.message}</div>}
              {imp.status === "loading" && (
                <div style={{ border: `1.5px solid ${C.line}`, borderRadius: 16, padding: "28px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink2 }}>Đang đọc file "{imp.file}"...</div>
                </div>
              )}
              {imp.status === "done" && (
                <>
                  <div style={{ border: "1px solid #D7EADF", background: "#F0F7F3", borderRadius: 14, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800 }}>✓ Đã import "{imp.file}"</div>
                      <div style={{ fontSize: 12, color: C.brand2, fontWeight: 600, marginTop: 2 }}>Khớp {imp.matched_names}/{imp.total_names} món theo tên — số liệu đã điền vào bảng bên dưới, kiểm tra rồi bấm Lưu</div>
                    </div>
                    <div onClick={() => setImp({ status: "empty" })} style={{ fontSize: 12, fontWeight: 700, color: C.ink2, cursor: "pointer", background: "#fff", padding: "6px 12px", borderRadius: 20 }}>Chọn file khác</div>
                  </div>
                  {imp.unmatched.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "#B4762A", background: C.warnBg, borderRadius: 10, padding: "10px 14px", lineHeight: 1.5 }}>
                      ⚠ Không khớp được {imp.unmatched.map(n => `"${n}"`).join(", ")} trong file với món trong hệ thống — vui lòng kiểm tra lại tên món hoặc nhập tay dòng này.
                    </div>
                  )}
                  {imp.unsized_cups > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: C.ink3, lineHeight: 1.5 }}>{imp.unsized_cups} ly trong file không ghi size nên được tính vào size L.</div>
                  )}
                </>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
            {rows.map(({ r, q, rev }) => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr 1fr" : "1.6fr 1fr 1fr 1fr", gap: 10, alignItems: "center", padding: "12px 14px", background: C.bg, borderRadius: 12 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, gridColumn: narrow ? "1 / -1" : "auto" }}>
                  {r.name}
                  {(!r.price_m || !r.price_l) && <div style={{ fontSize: 11, color: "#B4762A", fontWeight: 600, marginTop: 2 }}>Chưa có giá bán {!r.price_m && !r.price_l ? "M/L" : !r.price_m ? "M" : "L"} — đặt ở <a href="/admin/recipes" style={{ color: "#B4762A" }}>Công thức món</a></div>}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.ink3, marginBottom: 4, fontWeight: 700 }}>Size M</div>
                  <input type="number" min="0" inputMode="numeric" value={q.M} onChange={e => setQty(r.id, "M", e.target.value)} style={qtyInput} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.ink3, marginBottom: 4, fontWeight: 700 }}>Size L</div>
                  <input type="number" min="0" inputMode="numeric" value={q.L} onChange={e => setQty(r.id, "L", e.target.value)} style={qtyInput} />
                </div>
                <div style={{ textAlign: "right", fontWeight: 800, fontSize: 14.5, color: C.brand, alignSelf: "end", paddingBottom: 8 }}>{opsFmt(rev)}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 10px", fontSize: 13.5, fontWeight: 800 }}>Chi phí phát sinh trong ngày</div>
          <div style={{ fontSize: 12, color: C.ink3, marginBottom: 12 }}>Đá thêm, sửa máy, đồ dùng vặt... — không phải chi phí cố định hằng tháng</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {entry.expenses.map((x, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 28px", gap: 8, alignItems: "center" }}>
                <input value={x.description} onChange={e => setExpense(i, "description", e.target.value)} placeholder="Mô tả chi phí" style={inp} />
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="number" min="0" step="1000" value={x.amount} onChange={e => setExpense(i, "amount", e.target.value)} style={inp} />
                  <span style={{ fontSize: 12, color: C.ink3 }}>đ</span>
                </div>
                <div onClick={() => patch(e => ({ ...e, expenses: e.expenses.filter((_, j) => j !== i) }))} title="Bỏ khoản này" style={{ cursor: "pointer", textAlign: "center", color: C.danger, fontWeight: 700, fontSize: 15 }}>×</div>
              </div>
            ))}
            <div onClick={() => patch(e => ({ ...e, expenses: [...e.expenses, { description: "", amount: 0 }] }))} style={{ fontSize: 13, fontWeight: 700, color: C.brand, cursor: "pointer", padding: "6px 0", display: "inline-block" }}>+ Thêm chi phí</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12, marginTop: 22, paddingTop: 20, borderTop: "1px solid #F0EDE5" }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, textTransform: "uppercase" }}>Tổng ly bán</div>
              <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>{cups.toLocaleString("vi-VN")} ly</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, textTransform: "uppercase" }}>Doanh thu</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.brand, marginTop: 4 }}>{opsFmt(revenue)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, textTransform: "uppercase" }}>Chi phí phát sinh</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.danger, marginTop: 4 }}>{opsFmt(expenseTotal)}</div>
            </div>
          </div>

          {error && <div style={{ marginTop: 18, padding: "12px 16px", borderRadius: 12, background: "#FBEAE3", color: C.danger, fontSize: 13.5, fontWeight: 600 }}>{error}</div>}

          <div onClick={save} style={{ marginTop: 22, textAlign: "center", padding: 15, borderRadius: 14, background: isSaved ? C.brand2 : C.brand, color: "#fff", fontWeight: 800, fontSize: 15, cursor: isSaved || saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Đang lưu…" : isSaved ? "✓ Đã lưu số liệu hôm nay" : "Lưu số liệu hôm nay"}
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<DailyEntriesApp />);
