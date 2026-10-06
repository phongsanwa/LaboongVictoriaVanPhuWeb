/* global React, ReactDOM, OPS_C, opsFmt, opsApi, OpsHeader, useNarrowScreen */
const { useState } = React;

const D = window.ADMIN_PAYROLL_DATA;
const C = OPS_C;
const TYPES = { probation: "Thử việc", official: "Chính thức" };
const inp = { borderWidth: 1, borderStyle: "solid", borderColor: C.field, borderRadius: 8, padding: "8px 10px", fontSize: 13, width: "100%", background: "#fff", fontFamily: "inherit", color: C.ink, outline: "none" };
const card = { background: "#fff", borderRadius: 18, border: `1px solid ${C.line}`, padding: 22, marginBottom: 18 };
const th = { fontSize: 11, fontWeight: 800, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.3px" };

function shiftMonth(ym, n) {
  const [y, m] = ym.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return t.toISOString().slice(0, 7);
}
const goMonth = ym => { window.location.search = "?month=" + ym; };
const blankWorker = () => ({ id: null, name: "", phone: "", store_id: D.stores[0]?.id ?? null, type: "probation", official_from: "", active: true });

function WorkerRow({ w, onSaved }) {
  const [f, setF] = useState(w);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const dirty = JSON.stringify(f) !== JSON.stringify(w);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const body = { ...f, official_from: f.official_from || null, phone: f.phone || null };
      const { worker } = f.id ? await opsApi("PUT", `/admin/payroll/workers/${f.id}`, body) : await opsApi("POST", "/admin/payroll/workers", body);
      onSaved(worker, !f.id);
      if (!f.id) setF(blankWorker()); else setF(worker);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div style={{ borderTop: `1px solid ${C.line2}`, padding: "10px 0", opacity: f.active ? 1 : 0.55 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 1fr 1.1fr auto auto", gap: 8, alignItems: "center", minWidth: 760 }}>
        <input value={f.name} onChange={e => set("name", e.target.value)} placeholder="Tên nhân viên" style={inp} />
        <input value={f.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="SĐT" style={inp} />
        <select value={f.store_id ?? ""} onChange={e => set("store_id", e.target.value ? Number(e.target.value) : null)} style={inp}>
          {D.stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={f.type} onChange={e => set("type", e.target.value)} style={inp}>
          {Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <div title="Ngày lên chính thức (tự đổi mức lương từ ngày này)">
          <input type="date" value={f.official_from || ""} onChange={e => set("official_from", e.target.value)} disabled={f.type === "official"} style={{ ...inp, opacity: f.type === "official" ? 0.4 : 1 }} />
        </div>
        <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={f.active} onChange={e => set("active", e.target.checked)} /> Đang làm
        </label>
        <div onClick={() => (dirty || !f.id) && !busy && f.name.trim() && save()}
          style={{ padding: "8px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap", cursor: dirty && f.name.trim() ? "pointer" : "default", background: dirty && f.name.trim() ? C.brand : C.tray, color: dirty && f.name.trim() ? "#fff" : C.ink3 }}>
          {busy ? "…" : f.id ? (dirty ? "Lưu" : "✓") : "+ Thêm"}
        </div>
      </div>
      {err && <div style={{ color: C.danger, fontSize: 12, marginTop: 4 }}>{err}</div>}
    </div>
  );
}

function PayrollApp() {
  const narrow = useNarrowScreen(700);
  const [workers, setWorkers] = useState(D.workers);
  const [open, setOpen] = useState({});
  const [rates, setRates] = useState(Object.fromEntries(D.stores.map(s => [s.id, { p: s.wage_probation, o: s.wage_official, saved: true }])));
  const total = D.rows.reduce((a, r) => ({ hours: a.hours + r.hours, base: a.base + r.base, kpi: a.kpi + r.kpi, allowance: a.allowance + r.allowance, total: a.total + r.total }), { hours: 0, base: 0, kpi: 0, allowance: 0, total: 0 });
  const [y, m] = D.month.split("-");

  const saveRates = async (sid) => {
    const r = rates[sid];
    await opsApi("POST", `/admin/payroll/rates/${sid}`, { wage_probation: Number(r.p) || 0, wage_official: Number(r.o) || 0 });
    setRates(x => ({ ...x, [sid]: { ...x[sid], saved: true } }));
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 64, background: C.bg, color: C.ink }}>
      <OpsHeader admin={D.admin} links={[{ href: "/admin/overview", label: "← Trang chủ" }, { href: "/admin/daily-entries", label: "Nhập liệu cuối ngày →" }]} />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: narrow ? "24px 16px 0" : "36px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.4px" }}>Bảng lương nhân viên</div>
            <div style={{ fontSize: 14.5, color: C.ink2, marginTop: 4 }}>Tự cộng dồn từ chấm công ở trang Nhập liệu cuối ngày · giờ × lương giờ + thưởng KPI + phụ cấp</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div onClick={() => goMonth(shiftMonth(D.month, -1))} style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 10, background: "#fff", border: `1px solid ${C.line}`, fontWeight: 800 }}>‹</div>
            <input type="month" value={D.month} onChange={e => e.target.value && goMonth(e.target.value)} style={{ ...inp, width: "auto", fontWeight: 700 }} />
            <div onClick={() => goMonth(shiftMonth(D.month, 1))} style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 10, background: "#fff", border: `1px solid ${C.line}`, fontWeight: 800 }}>›</div>
            <a href={`/admin/payroll/export?month=${D.month}`} style={{ padding: "8px 14px", borderRadius: 10, background: C.brand, color: "#fff", fontWeight: 800, fontSize: 13, textDecoration: "none" }}>Xuất Excel (CSV)</a>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 12 }}>Lương tháng {Number(m)}/{y}</div>
          {D.rows.length === 0 ? (
            <div style={{ color: C.ink3, fontSize: 13.5 }}>Chưa có ca làm nào trong tháng này — chấm công ở trang <a href="/admin/daily-entries" style={{ color: C.brand, fontWeight: 700 }}>Nhập liệu cuối ngày</a>.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 760 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr 0.6fr 0.7fr 1fr 1fr 0.9fr 1.1fr", gap: 8, padding: "8px 0", ...th }}>
                  <div>Nhân viên</div><div>Loại</div><div>Số ca</div><div>Số giờ</div><div style={{ textAlign: "right" }}>Tiền giờ</div><div style={{ textAlign: "right" }}>Thưởng KPI</div><div style={{ textAlign: "right" }}>Phụ cấp</div><div style={{ textAlign: "right" }}>Tổng nhận</div>
                </div>
                {D.rows.map(r => (
                  <div key={r.worker_id} style={{ borderTop: `1px solid ${C.line2}` }}>
                    <div onClick={() => setOpen(o => ({ ...o, [r.worker_id]: !o[r.worker_id] }))} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr 0.6fr 0.7fr 1fr 1fr 0.9fr 1.1fr", gap: 8, padding: "11px 0", cursor: "pointer", fontSize: 13.5, alignItems: "center" }}>
                      <div style={{ fontWeight: 700 }}>{open[r.worker_id] ? "▾" : "▸"} {r.name}</div>
                      <div style={{ color: C.ink2 }}>{r.type_label}</div>
                      <div>{r.shifts}</div>
                      <div>{r.hours.toLocaleString("vi-VN")}</div>
                      <div style={{ textAlign: "right" }}>{opsFmt(r.base)}</div>
                      <div style={{ textAlign: "right", color: C.brand2 }}>{opsFmt(r.kpi)}</div>
                      <div style={{ textAlign: "right" }}>{opsFmt(r.allowance)}</div>
                      <div style={{ textAlign: "right", fontWeight: 800, color: C.brand }}>{opsFmt(r.total)}</div>
                    </div>
                    {open[r.worker_id] && (
                      <div style={{ background: C.bg, borderRadius: 10, padding: "6px 12px", marginBottom: 10 }}>
                        {r.details.map((d, i) => (
                          <div key={i} style={{ display: "grid", gridTemplateColumns: "0.9fr 1.3fr 1fr 0.6fr 0.8fr 0.8fr 0.8fr 1.2fr 0.9fr", gap: 8, fontSize: 12.5, padding: "6px 0", borderTop: i ? `1px solid ${C.line2}` : "none" }}>
                            <div style={{ fontWeight: 700 }}>{d.date}</div><div style={{ color: C.ink2 }}>{d.store}</div>
                            <div>{d.time_in}–{d.time_out}</div><div>{d.hours}h</div><div>{opsFmt(d.rate)}/h</div>
                            <div style={{ color: C.brand2 }}>{d.kpi_bonus ? "+" + opsFmt(d.kpi_bonus) : "—"}</div>
                            <div>{d.allowance ? "+" + opsFmt(d.allowance) : "—"}</div>
                            <div style={{ color: C.ink3 }}>{d.note || ""}</div>
                            <div style={{ textAlign: "right", fontWeight: 700 }}>{opsFmt(d.wage_total)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr 0.6fr 0.7fr 1fr 1fr 0.9fr 1.1fr", gap: 8, padding: "12px 0", borderTop: `1.5px solid ${C.ink}`, fontWeight: 800, fontSize: 13.5 }}>
                  <div>Tổng cộng</div><div /><div /><div>{Math.round(total.hours * 100) / 100}</div>
                  <div style={{ textAlign: "right" }}>{opsFmt(total.base)}</div><div style={{ textAlign: "right" }}>{opsFmt(total.kpi)}</div>
                  <div style={{ textAlign: "right" }}>{opsFmt(total.allowance)}</div><div style={{ textAlign: "right", color: C.brand }}>{opsFmt(total.total)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 4 }}>Lương theo giờ</div>
          <div style={{ fontSize: 12, color: C.ink3, marginBottom: 12 }}>Áp dụng cho ca chấm từ nay; ca đã lưu giữ nguyên mức lương lúc đó.</div>
          {D.stores.map(s => (
            <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap", padding: "8px 0", borderTop: `1px solid ${C.line2}` }}>
              <div style={{ fontWeight: 700, minWidth: 200, paddingBottom: 8 }}>{s.name}</div>
              {[["p", "Thử việc (đ/giờ)"], ["o", "Chính thức (đ/giờ)"]].map(([k, l]) => (
                <div key={k} style={{ width: 160 }}><div style={{ ...th, marginBottom: 4 }}>{l}</div>
                  <input type="number" min="0" step="1000" value={rates[s.id][k]} onChange={e => setRates(x => ({ ...x, [s.id]: { ...x[s.id], [k]: e.target.value, saved: false } }))} style={inp} />
                </div>
              ))}
              <div onClick={() => !rates[s.id].saved && saveRates(s.id)} style={{ padding: "8px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 800, cursor: rates[s.id].saved ? "default" : "pointer", background: rates[s.id].saved ? C.tray : C.brand, color: rates[s.id].saved ? C.ink3 : "#fff" }}>{rates[s.id].saved ? "✓ Đã lưu" : "Lưu"}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 4 }}>Nhân viên</div>
          <div style={{ fontSize: 12, color: C.ink3, marginBottom: 8 }}>Thử việc có "ngày lên chính thức" sẽ tự tính lương chính thức từ ngày đó. Bỏ tick "Đang làm" khi nghỉ việc — lịch sử lương vẫn giữ.</div>
          <div style={{ overflowX: "auto" }}>
            {workers.map(w => <WorkerRow key={w.id} w={w} onSaved={nw => setWorkers(ws => ws.map(x => (x.id === nw.id ? nw : x)))} />)}
            <WorkerRow key={"new-" + workers.length} w={blankWorker()} onSaved={nw => setWorkers(ws => [...ws, nw])} />
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PayrollApp />);
