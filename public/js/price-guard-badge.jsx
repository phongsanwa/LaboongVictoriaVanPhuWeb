/* global React */
// Shared profit warning used by the promotion, flash sale, reward and shipping editors.
// <PriceGuardBadge params={{type:'item', product_id, price, kind:'flash'}} onStatus={s => ...} />
const PG_STYLE = {
  loss: ["#C0392B", "#FDECEA", "Lỗ nguyên liệu"],
  thin: ["#9A6B00", "#FFF6DB", "Chưa đủ lãi"],
  ok:   ["#0F623F", "#EAF3EE", "Có lãi"],
};
const pgFmt = n => Math.round(n || 0).toLocaleString("vi-VN") + "đ";

function usePriceGuard(params) {
  const [res, setRes] = React.useState(null);
  const key = JSON.stringify(params);
  React.useEffect(() => {
    if (!params) { setRes(null); return; }
    const t = setTimeout(() => {
      fetch("/admin/price-guard/check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content },
        body: key,
      }).then(r => (r.ok ? r.json() : null)).then(setRes).catch(() => setRes(null));
    }, 350);
    return () => clearTimeout(t);
  }, [key]);
  return res;
}

function PriceGuardBadge({ params, onStatus }) {
  const r = usePriceGuard(params);
  React.useEffect(() => { onStatus && onStatus(r && r.known ? r.status : null); }, [r && r.status, r && r.known]);
  if (!r) return null;
  if (!r.known) return <div style={{ fontSize: 11.5, color: "#8A9189", marginTop: 4 }}>Chưa có công thức để tính lãi</div>;
  const [c, bg, base] = PG_STYLE[r.status];
  const label = params.type === "reward" && r.status !== "ok" ? (r.status === "loss" ? "Quà quá đắt" : "Quà hơi đắt") : base;
  let detail;
  if (params.type === "reward") detail = `Chi phí ${pgFmt(r.cost)} = ${r.pct}% doanh thu tích điểm (ngưỡng ${r.max_pct}%)`;
  else if (params.type === "items") detail = r.status === "ok" ? `${r.checked} món đều đạt lãi` : `${r.loss} món lỗ, ${r.thin} món mỏng lãi · ` + r.worst.map(w => `${w.name} ${pgFmt(w.price)} (sàn có lãi ${pgFmt(w.floor_profit)})`).join("; ");
  else if (params.type === "order") detail = `Lãi ${pgFmt(r.profit)} (${r.margin_pct}%) trên đơn ${pgFmt(r.paid)}`;
  else detail = `Lãi ${pgFmt(r.profit)}/ly (${r.margin_pct}%) · sàn hoà vốn ${pgFmt(r.floor_cost)} · sàn có lãi ${pgFmt(r.floor_profit)}`;
  return (
    <div style={{ marginTop: 4, padding: "4px 8px", borderRadius: 8, background: bg, color: c, fontSize: 11.5, fontWeight: 600, lineHeight: 1.4 }}>
      <b>{label}</b> · {detail}
    </div>
  );
}

// Checkbox shown when any badge reports a loss; save stays disabled until ticked.
function LossConsent({ show, checked, onChange }) {
  if (!show) return null;
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, padding: "10px 12px", background: "#FDECEA", color: "#C0392B", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      Có mức giá dưới giá vốn nguyên liệu. Tôi đồng ý chạy lỗ.
    </label>
  );
}

Object.assign(window, { PriceGuardBadge, LossConsent, usePriceGuard });
