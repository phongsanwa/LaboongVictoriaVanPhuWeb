/* global React, ReactDOM, Icon, AdminSidebar */
const { useState, useMemo } = React;

const D = window.PRICE_GUARD_DATA;
const fmt = n => (n == null ? "—" : Math.round(n).toLocaleString("vi-VN") + "đ");
const inp = { borderWidth: 1.5, borderStyle: "solid", borderColor: "#E5E1D6", borderRadius: 10, padding: "9px 12px", fontSize: 14, width: "100%", background: "#fff", fontFamily: "inherit", outline: "none" };
const lbl = { fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 5, display: "block" };
const card = { background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #ECE8DC", marginBottom: 18 };
const ST = { loss: ["#C0392B", "#FDECEA", "Lỗ"], thin: ["#9A6B00", "#FFF6DB", "Mỏng lãi"], ok: ["#0F623F", "#EAF3EE", "Có lãi"] };
const Pill = ({ s }) => <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11.5, fontWeight: 800, color: ST[s][0], background: ST[s][1] }}>{ST[s][2]}</span>;
const csrf = () => document.querySelector('meta[name="csrf-token"]').content;

function Floors() {
  const [q, setQ] = useState("");
  const rows = D.floors.filter(r => r.name.toLowerCase().includes(q.toLowerCase()));
  const cell = (e, color) => (e.known ? <b style={{ color }}>{fmt(e[color === "#C0392B" ? "floor_cost" : "floor_profit"])}</b> : <span style={{ color: "#B0B4AE" }}>—</span>);
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Giá sàn từng món (bán qua Website)</h2>
          <div style={{ fontSize: 12.5, color: "#6B756F", marginTop: 4 }}>
            <span style={{ color: "#C0392B", fontWeight: 700 }}>Sàn hoà vốn</span> = chỉ đủ tiền nguyên liệu + phí thương hiệu {D.royalty}%.{" "}
            <span style={{ color: "#9A6B00", fontWeight: 700 }}>Sàn có lãi</span> = thêm chi phí cố định {fmt(D.fixed_per_cup)}/ly và lãi tối thiểu {D.settings.min_margin_pct}%.
          </div>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm món…" style={{ ...inp, width: 220 }} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#6B756F", fontSize: 12 }}>
              <th style={{ padding: 8 }}>Món</th><th>Giá bán</th><th>Vốn M</th><th>Hoà vốn M</th><th>Có lãi M</th><th>Vốn L</th><th>Hoà vốn L</th><th>Có lãi L</th><th>Hiện tại</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderTop: "1px solid #F2EFE6" }}>
                <td style={{ padding: 8 }}>
                  <div style={{ fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: r.recipe ? "#8A9189" : "#C0392B" }}>{r.recipe ? `CT: ${r.recipe}` : "Chưa có công thức"}</div>
                </td>
                <td>{fmt(r.price)}</td>
                <td>{r.m.known ? fmt(r.m.cogs) : "—"}</td><td>{cell(r.m, "#C0392B")}</td><td>{cell(r.m, "#9A6B00")}</td>
                <td>{r.l.known ? fmt(r.l.cogs) : "—"}</td><td>{cell(r.l, "#C0392B")}</td><td>{cell(r.l, "#9A6B00")}</td>
                <td>{r.m.known ? <Pill s={r.m.status} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Calculator({ settings }) {
  const known = D.floors.filter(r => r.m.known);
  const [f, setF] = useState({ product: known[0]?.id || "", size: "M", channel: "web", qty: 2, flash: "", voucherType: "amount", voucher: 0, ship: 0, points: 0 });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const p = D.floors.find(r => r.id === Number(f.product));
  const r = useMemo(() => {
    if (!p || !p.m.known) return null;
    const qty = Math.max(1, Number(f.qty) || 1);
    const cogs = (f.size === "L" ? p.l.cogs : p.m.cogs) * qty;
    const flashOn = f.flash !== "" && Number(f.flash) < p.price;
    const unit = flashOn ? Number(f.flash) || 0 : p.price;
    const gross = unit * qty;
    const voucher = f.voucherType === "pct" ? gross * (Number(f.voucher) || 0) / 100 : Number(f.voucher) || 0;
    const points = (Number(f.points) || 0);
    const paid = Math.max(0, gross - voucher - points);
    const feesPct = D.royalty + (Number(settings.commission[f.channel]) || 0);
    const fees = paid * feesPct / 100;
    const ship = Number(f.ship) || 0;
    const fixed = D.fixed_per_cup * qty;
    const before = paid - fees - cogs - ship;
    const profit = before - fixed;
    const margin = paid > 0 ? profit / paid * 100 : -100;
    const min = flashOn ? settings.flash_min_margin_pct : settings.min_margin_pct;
    return { flashTooHigh: f.flash !== "" && !flashOn, qty, list: p.price * qty, gross, voucher, points, paid, fees, feesPct, cogs, ship, fixed, before, profit, margin, min,
      status: before < 0 ? "loss" : margin < min ? "thin" : "ok" };
  }, [f, p, settings]);
  const line = (l, v, neg, bold) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontWeight: bold ? 800 : 500, borderTop: bold ? "1px solid #ECE8DC" : "none" }}>
      <span>{l}</span><span style={{ color: neg ? "#C0392B" : "inherit" }}>{neg ? "−" : ""}{fmt(v)}</span>
    </div>
  );
  return (
    <div style={card}>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Máy tính lãi khi cộng dồn khuyến mãi</h2>
      <div style={{ fontSize: 12.5, color: "#6B756F", marginBottom: 14 }}>Thử một đơn: giá flash + voucher + đổi điểm + bù ship cùng lúc thì còn lãi bao nhiêu.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        <div style={{ gridColumn: "span 2" }}><label style={lbl}>Món</label>
          <select value={f.product} onChange={e => set("product", e.target.value)} style={inp}>{known.map(x => <option key={x.id} value={x.id}>{x.name} ({fmt(x.price)})</option>)}</select></div>
        <div><label style={lbl}>Size</label><select value={f.size} onChange={e => set("size", e.target.value)} style={inp}><option>M</option><option>L</option></select></div>
        <div><label style={lbl}>Số ly</label><input type="number" min="1" value={f.qty} onChange={e => set("qty", e.target.value)} style={inp} /></div>
        <div><label style={lbl}>Kênh bán</label><select value={f.channel} onChange={e => set("channel", e.target.value)} style={inp}>{Object.entries(D.channels).map(([k, v]) => <option key={k} value={k}>{v} ({settings.commission[k] || 0}%)</option>)}</select></div>
        <div><label style={lbl}>Giá flash / ly (trống = giá gốc)</label><input type="number" step="1000" value={f.flash} onChange={e => set("flash", e.target.value)} style={inp} />
          {r && r.flashTooHigh && <div style={{ fontSize: 11.5, color: "#C0392B", marginTop: 4, fontWeight: 600 }}>Giá flash phải thấp hơn giá gốc {fmt(p.price)}. Đang tính theo giá gốc.</div>}</div>
        <div><label style={lbl}>Voucher</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="number" min="0" value={f.voucher} onChange={e => set("voucher", e.target.value)} style={inp} />
            <select value={f.voucherType} onChange={e => set("voucherType", e.target.value)} style={{ ...inp, width: 70 }}><option value="amount">đ</option><option value="pct">%</option></select>
          </div></div>
        <div><label style={lbl}>Trừ bằng điểm (đ)</label><input type="number" min="0" step="1000" value={f.points} onChange={e => set("points", e.target.value)} style={inp} /></div>
        <div><label style={lbl}>Quán bù ship (đ)</label><input type="number" min="0" step="1000" value={f.ship} onChange={e => set("ship", e.target.value)} style={inp} /></div>
      </div>
      {r && (
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          <div style={{ fontSize: 13.5 }}>
            {line(`Giá gốc ${r.qty} ly`, r.list)}
            {r.gross !== r.list && line("Giảm do flash sale", r.list - r.gross, true)}
            {r.voucher > 0 && line("Voucher", r.voucher, true)}
            {r.points > 0 && line("Đổi điểm", r.points, true)}
            {line("Khách trả", r.paid, false, true)}
            {line(`Phí thương hiệu + hoa hồng (${r.feesPct}%)`, r.fees, true)}
            {line("Nguyên liệu + bao bì", r.cogs, true)}
            {r.ship > 0 && line("Bù ship", r.ship, true)}
            {line("Còn sau nguyên liệu", r.before, false, true)}
            {line("Chi phí cố định (mặt bằng, lương…)", r.fixed, true)}
            {line("Lãi thật", r.profit, false, true)}
          </div>
          <div style={{ background: ST[r.status][1], color: ST[r.status][0], borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{r.status === "loss" ? "LỖ cả tiền nguyên liệu" : r.status === "thin" ? `Chưa đạt lãi tối thiểu ${r.min}%` : "Đạt lãi mục tiêu"}</div>
            <div style={{ fontSize: 30, fontWeight: 800, margin: "4px 0" }}>{fmt(r.profit)}</div>
            <div style={{ fontSize: 13 }}>Biên lãi {r.margin.toFixed(1)}% · mục tiêu {r.min}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Settings({ settings, onSaved }) {
  const [f, setF] = useState(settings);
  const [msg, setMsg] = useState(null);
  const num = (k, l) => <div><label style={lbl}>{l}</label><input type="number" min="0" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} style={inp} /></div>;
  const save = async () => {
    setMsg(null);
    const r = await fetch("/admin/price-guard/settings", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": csrf() }, body: JSON.stringify(f) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg(d.message || "Lỗi lưu");
    onSaved(d.settings); setMsg("Đã lưu. Tải lại trang để cập nhật bảng giá sàn.");
  };
  return (
    <div style={card}>
      <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 800 }}>Ngưỡng cảnh báo</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        {num("min_margin_pct", "Lãi tối thiểu (%)")}
        {num("flash_min_margin_pct", "Lãi tối thiểu flash sale (%)")}
        {num("reward_max_pct", "Quà đổi điểm tối đa (% doanh thu)")}
        {Object.entries(D.channels).map(([k, v]) => (
          <div key={k}><label style={lbl}>Hoa hồng {v} (%)</label><input type="number" min="0" value={f.commission[k] ?? 0} onChange={e => setF({ ...f, commission: { ...f.commission, [k]: e.target.value } })} style={inp} /></div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#8A9189", marginTop: 8 }}>Phí thương hiệu lấy từ Cài đặt cửa hàng (hiện {D.royalty}%). Chi phí cố định/ly tính từ 30 ngày nhập liệu cuối ngày gần nhất.</div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <button className="btn primary" onClick={save}>Lưu ngưỡng</button>
        {msg && <span style={{ fontSize: 13, fontWeight: 600 }}>{msg}</span>}
      </div>
    </div>
  );
}

function LossOrders() {
  const rows = D.loss_orders;
  return (
    <div style={card}>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Đơn lỗ / mỏng lãi (30 ngày)</h2>
      <div style={{ fontSize: 12.5, color: "#6B756F", marginBottom: 10 }}>Đơn website có lãi dưới {D.settings.min_margin_pct}% sau khi trừ giảm giá, nguyên liệu, phí và chi phí cố định.</div>
      {rows.length === 0 ? <div style={{ color: "#0F623F", fontWeight: 700, fontSize: 13.5 }}>Không có đơn nào dưới ngưỡng.</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr style={{ textAlign: "left", color: "#6B756F", fontSize: 12 }}><th style={{ padding: 8 }}>Đơn</th><th>Ngày</th><th>Khách trả</th><th>Vốn NL</th><th>Lãi</th><th>Khuyến mãi</th><th></th></tr></thead>
            <tbody>
              {rows.map(o => (
                <tr key={o.code} style={{ borderTop: "1px solid #F2EFE6" }}>
                  <td style={{ padding: 8, fontWeight: 700 }}>{o.code}</td><td>{o.date}</td><td>{fmt(o.paid)}</td><td>{fmt(o.cogs)}{o.unknown_cost ? "*" : ""}</td>
                  <td style={{ color: o.profit < 0 ? "#C0392B" : "inherit", fontWeight: 700 }}>{fmt(o.profit)} ({o.margin_pct}%)</td>
                  <td style={{ fontSize: 12 }}>{o.discounts.join(", ") || "—"}</td><td><Pill s={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11.5, color: "#8A9189", marginTop: 6 }}>* có món chưa có công thức, vốn có thể thấp hơn thực tế.</div>
        </div>
      )}
    </div>
  );
}

function PriceGuardApp() {
  const [sideOpen, setSideOpen] = useState(false);
  const [settings, setSettings] = useState(D.settings);
  return (
    <div className="shell">
      <AdminSidebar activeLabel="Cân giá & lãi" admin={D.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div><div className="crumb">Quản lý · Khuyến mãi</div><h1>Cân giá & lãi</h1></div>
        </header>
        <div className="content">
          <Calculator settings={settings} />
          <Floors />
          <LossOrders />
          <Settings settings={settings} onSaved={setSettings} />
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PriceGuardApp />);
