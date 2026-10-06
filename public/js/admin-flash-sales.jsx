/* global React, ReactDOM, Icon, AdminSidebar, PriceGuardBadge, LossConsent */
const { useState } = React;

const D = window.ADMIN_FLASH_DATA;
const PRODUCTS = D.products;
const WD = [[1, "T2"], [2, "T3"], [3, "T4"], [4, "T5"], [5, "T6"], [6, "T7"], [7, "CN"]];
const STATUS = {
  live: ["Đang diễn ra", "#E4402F", "#FFE9E4"], upcoming: ["Sắp diễn ra", "#B4762A", "#FCF3E4"],
  scheduled: ["Đã lên lịch", "#3D6FB4", "#E8F0FB"], ended: ["Đã kết thúc", "#8A9189", "#F1EFE7"], off: ["Đang tắt", "#8A9189", "#F1EFE7"],
};
const fmt = n => Math.round(n || 0).toLocaleString("vi-VN") + "đ";
const inp = { borderWidth: 1.5, borderStyle: "solid", borderColor: "#E5E1D6", borderRadius: 10, padding: "9px 12px", fontSize: 14, width: "100%", background: "#fff", fontFamily: "inherit", outline: "none" };
const lbl = { fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 5, display: "block" };
const csrf = () => document.querySelector('meta[name="csrf-token"]').content;
async function api(method, url, body) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": csrf() }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || Object.values(d.errors || {}).flat()[0] || "Có lỗi, thử lại.");
  return d;
}
function schedule(s) {
  const time = `${s.start_time}–${s.end_time}`;
  const d = iso => iso.split("-").reverse().join("/");
  if (s.repeat === "once") return `${d(s.start_date)} · ${time}`;
  const days = WD.filter(([k]) => s.weekdays.includes(k)).map(([, l]) => l).join(", ");
  return `Lặp ${days} · ${time} · từ ${d(s.start_date)}${s.end_date ? " đến " + d(s.end_date) : ""}`;
}

function Editor({ sale, onClose, onSaved }) {
  const [f, setF] = useState(sale ? { ...sale, end_date: sale.end_date || "" } : {
    name: "", repeat: "weekly", start_date: D.today, end_date: "", weekdays: [1, 2, 3, 4, 5, 6, 7],
    start_time: "14:00", end_time: "16:00", upcoming_hours: 2, is_active: true, items: [],
  });
  const [add, setAdd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [guard, setGuard] = useState({});
  const [consent, setConsent] = useState(false);
  const hasLoss = f.items.some(it => guard[it.product_id] === "loss");
  const tooHigh = f.items.some(it => Number(it.flash_price) >= it.price);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const setItem = (i, k, v) => setF(x => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }));
  const addItem = () => {
    const p = PRODUCTS.find(p => p.id === Number(add));
    if (!p || f.items.some(it => it.product_id === p.id)) return;
    set("items", [...f.items, { product_id: p.id, name: p.name, price: p.price, flash_price: Math.round(p.price * 0.7 / 1000) * 1000, quota: 30, per_customer: 2 }]);
    setAdd("");
  };
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const body = { ...f, end_date: f.end_date || null, upcoming_hours: Number(f.upcoming_hours) || 0,
        items: f.items.map(it => ({ product_id: it.product_id, flash_price: Number(it.flash_price) || 0, quota: it.quota === "" || it.quota == null ? null : Number(it.quota), per_customer: it.per_customer === "" || it.per_customer == null ? null : Number(it.per_customer) })) };
      const { sale: saved } = sale ? await api("PUT", `/admin/flash-sales/${sale.id}`, body) : await api("POST", "/admin/flash-sales", body);
      onSaved(saved);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 620, maxWidth: "100%", height: "100%", overflowY: "auto", background: "#fff", padding: 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{sale ? "Sửa đợt flash sale" : "Tạo đợt flash sale"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#6b7280" }}>×</button>
        </div>
        <label style={lbl}>Tên đợt (hiện cho khách)</label>
        <input value={f.name} onChange={e => set("name", e.target.value)} placeholder="VD: Giờ vàng chiều" style={inp} />

        <div style={{ display: "flex", gap: 6, margin: "16px 0 12px" }}>
          {[["weekly", "Lặp lại hằng tuần"], ["once", "Một lần"]].map(([k, l]) => (
            <div key={k} onClick={() => set("repeat", k)} style={{ padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", background: f.repeat === k ? "#0F623F" : "#F1EFE7", color: f.repeat === k ? "#fff" : "#6B756F" }}>{l}</div>
          ))}
        </div>
        {f.repeat === "weekly" && (
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Các ngày trong tuần</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {WD.map(([k, l]) => {
                const on = f.weekdays.includes(k);
                return <div key={k} onClick={() => set("weekdays", on ? f.weekdays.filter(x => x !== k) : [...f.weekdays, k].sort())} style={{ width: 44, textAlign: "center", padding: "8px 0", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", border: `1.5px solid ${on ? "#0F623F" : "#E5E1D6"}`, background: on ? "#EAF3EE" : "#fff", color: on ? "#0F623F" : "#6B756F" }}>{l}</div>;
              })}
            </div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={lbl}>{f.repeat === "once" ? "Ngày diễn ra" : "Áp dụng từ ngày"}</label><input type="date" value={f.start_date} onChange={e => set("start_date", e.target.value)} style={inp} /></div>
          {f.repeat === "weekly" && <div><label style={lbl}>Đến ngày (bỏ trống = không hạn)</label><input type="date" value={f.end_date} onChange={e => set("end_date", e.target.value)} style={inp} /></div>}
          <div><label style={lbl}>Giờ bắt đầu</label><input type="time" value={f.start_time} onChange={e => set("start_time", e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Giờ kết thúc</label><input type="time" value={f.end_time} onChange={e => set("end_time", e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Hiện "Sắp diễn ra" trước (giờ)</label><input type="number" min="0" max="72" value={f.upcoming_hours} onChange={e => set("upcoming_hours", e.target.value)} style={inp} /></div>
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 800, margin: "20px 0 8px" }}>Món flash sale</h3>
        <div style={{ fontSize: 12, color: "#8A9189", marginBottom: 8 }}>Giá flash sale thay cho giá gốc (size/topping vẫn cộng thêm). Số suất tính riêng cho mỗi phiên; đơn huỷ được hoàn suất.</div>
        {f.items.map((it, i) => (
          <div key={it.product_id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 0.8fr 0.8fr 24px", gap: 8, alignItems: "end", padding: "10px 0", borderTop: "1px solid #F2EFE6" }}>
            <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{it.name}</div><div style={{ fontSize: 12, color: "#8A9189" }}>Giá gốc {fmt(it.price)}{it.price && Number(it.flash_price) < it.price ? ` · -${Math.round((1 - it.flash_price / it.price) * 100)}%` : ""}</div>{Number(it.flash_price) >= it.price && <div style={{ fontSize: 11.5, color: "#C0392B", fontWeight: 700 }}>Giá flash phải thấp hơn giá gốc</div>}</div>
            <div><label style={{ ...lbl, fontSize: 11 }}>Giá flash</label><input type="number" min="0" step="1000" value={it.flash_price} onChange={e => setItem(i, "flash_price", e.target.value)} style={inp} /></div>
            <div><label style={{ ...lbl, fontSize: 11 }}>Số suất</label><input type="number" min="1" placeholder="∞" value={it.quota ?? ""} onChange={e => setItem(i, "quota", e.target.value)} style={inp} /></div>
            <div><label style={{ ...lbl, fontSize: 11 }}>Tối đa/khách</label><input type="number" min="1" placeholder="∞" value={it.per_customer ?? ""} onChange={e => setItem(i, "per_customer", e.target.value)} style={inp} /></div>
            <div onClick={() => set("items", f.items.filter((_, j) => j !== i))} style={{ color: "#C0552B", fontWeight: 800, cursor: "pointer", paddingBottom: 10 }}>×</div>
            <div style={{ gridColumn: "1 / -1", marginTop: -4 }}><PriceGuardBadge params={{ type: "item", product_id: it.product_id, price: Number(it.flash_price) || 0, kind: "flash" }} onStatus={st => setGuard(g => ({ ...g, [it.product_id]: st }))} /></div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <select value={add} onChange={e => setAdd(e.target.value)} style={inp}>
            <option value="">-- Chọn món để thêm --</option>
            {PRODUCTS.filter(p => !f.items.some(it => it.product_id === p.id)).map(p => <option key={p.id} value={p.id}>{p.name} ({fmt(p.price)})</option>)}
          </select>
          <button onClick={addItem} className="btn primary" style={{ whiteSpace: "nowrap" }}>+ Thêm</button>
        </div>

        <LossConsent show={hasLoss} checked={consent} onChange={setConsent} />
        {err && <div style={{ marginTop: 14, padding: "10px 14px", background: "#FBEAE3", color: "#C0552B", borderRadius: 10, fontWeight: 600, fontSize: 13.5 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button className="btn primary" disabled={busy || tooHigh || (hasLoss && !consent)} onClick={save} style={{ flex: 1 }}>{busy ? "Đang lưu…" : sale ? "Lưu thay đổi" : "Tạo đợt flash sale"}</button>
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
        </div>
      </div>
    </div>
  );
}

function FlashSalesApp() {
  const [sales, setSales] = useState(D.sales);
  const [editing, setEditing] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const replace = s => setSales(xs => (xs.some(x => x.id === s.id) ? xs.map(x => (x.id === s.id ? s : x)) : [s, ...xs]));
  const toggle = async s => replace((await api("POST", `/admin/flash-sales/${s.id}/toggle`)).sale);
  const remove = async s => { if (!confirm(`Xoá đợt "${s.name}"?`)) return; await api("DELETE", `/admin/flash-sales/${s.id}`); setSales(xs => xs.filter(x => x.id !== s.id)); };

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Flash Sale" admin={D.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div><div className="crumb">Quản lý · Khuyến mãi</div><h1>Flash Sale</h1></div>
          <div className="topbar-spacer" />
          <button className="btn primary" onClick={() => setEditing(false)}><Icon name="plus" size={16} color="#fff" /> Tạo đợt flash sale</button>
        </header>
        <div className="content">
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 16 }}>Hiển thị ngay dưới banner trang chủ, áp dụng cho đơn đặt trên website (dùng chung được với voucher).</div>
          {sales.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "var(--ink-3)" }}>Chưa có đợt flash sale nào.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
            {sales.map(s => {
              const [sl, sc, sb] = STATUS[s.status];
              return (
                <div key={s.id} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>⚡ {s.name}</div>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: sc, background: sb, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{sl}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4 }}>{schedule(s)}</div>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                    {s.items.map(it => (
                      <div key={it.product_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span>{it.name}</span>
                        <span><b style={{ color: "#E4402F" }}>{fmt(it.flash_price)}</b> <s style={{ color: "var(--ink-3)", fontSize: 11.5 }}>{fmt(it.price)}</s>{it.quota ? <span style={{ color: "var(--ink-3)", fontSize: 11.5 }}> · {it.sold_now != null ? `${it.sold_now}/` : ""}{it.quota} suất</span> : null}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 10 }}>Tổng đã bán: <b>{s.sold_total}</b> ly · {fmt(s.revenue_total)}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="btn ghost" style={{ flex: 1 }} onClick={() => setEditing(s)}>Sửa</button>
                    <button className="btn ghost" onClick={() => toggle(s)}>{s.is_active ? "Tắt" : "Bật"}</button>
                    <button className="btn ghost" style={{ color: "#C0552B" }} onClick={() => remove(s)}>Xoá</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {editing !== null && <Editor sale={editing || null} onClose={() => setEditing(null)} onSaved={s => { replace(s); setEditing(null); }} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<FlashSalesApp />);
