/* global React, Icon */
/*
 * In hoá đơn (máy in nhiệt 58/80mm) và tem dán ly (máy in tem) từ màn hình lên đơn.
 * In qua trình duyệt: dựng trang in trong iframe ẩn rồi gọi print(). Cài đặt máy in lưu
 * riêng trên từng máy (localStorage) vì mỗi máy bán hàng có thể nối máy in khác nhau.
 */
const { useState: useStatePr } = React;

const PRINT_KEY = "lb_pos_print_v1";
const PRINT_DEFAULTS = {
  receiptWidth: 80,      // khổ giấy hoá đơn (mm): 80 hoặc 58
  receiptCopies: 1,
  labelW: 50, labelH: 30, // khổ tem (mm)
  autoReceipt: true,     // tự in hoá đơn sau khi lưu đơn
  autoLabel: true,       // tự in tem sau khi lưu đơn
  labelPrice: false,     // in giá trên tem
  footer: "Cảm ơn quý khách! Hẹn gặp lại 🧋",
};
const LABEL_PRESETS = [[50, 30], [40, 30], [40, 25], [35, 25], [50, 40], [60, 40]];

function loadPrintSettings() {
  try { return { ...PRINT_DEFAULTS, ...(JSON.parse(localStorage.getItem(PRINT_KEY) || "{}") || {}) }; }
  catch (e) { return { ...PRINT_DEFAULTS }; }
}
function savePrintSettings(s) {
  try { localStorage.setItem(PRINT_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const vnd = (n) => Math.round(n || 0).toLocaleString("vi-VN");

/* "Size L · Đường: 50% · Đá: 70%" */
function printOpts(it) {
  return [it.size, ...(it.levels || []).map(l => `${l.label}: ${l.value}`)].filter(Boolean).join(" · ");
}
function printTops(it) {
  return (it.toppings || []).map(t => t.qty > 1 ? `${t.name} x${t.qty}` : t.name).join(", ");
}
function channelLine(order) {
  return order.channel_label + (order.external_code ? ` · ${order.external_code}` : "");
}
const PAY_LABEL = { cash: "Tiền mặt", bank: "Chuyển khoản", app: "Thanh toán qua app" };

/* ─── Hoá đơn ─── */
function receiptHtml(order, s) {
  const w = Number(s.receiptWidth) === 58 ? 58 : 80;
  const inner = w === 58 ? 48 : 72;          // vùng in thực tế của giấy 58/80mm
  const fs = w === 58 ? 11 : 12.5;
  const st = order.store || {};
  const cups = order.items.reduce((n, it) => n + it.qty, 0);
  const lines = order.items.map(it => {
    const opts = printOpts(it), tops = printTops(it);
    return `<div class="it">
      <div class="b">${esc(it.name)}</div>
      ${opts ? `<div class="o">${esc(opts)}</div>` : ""}
      ${tops ? `<div class="o">+ ${esc(tops)}</div>` : ""}
      ${it.note ? `<div class="o">* ${esc(it.note)}</div>` : ""}
      <table><tr><td>${it.qty} x ${vnd(it.unit_price)}</td><td class="rt b">${vnd(it.line_total)}</td></tr></table>
    </div>`;
  }).join("");
  const one = `<div class="r">
    <div class="c big">LABOONG</div>
    ${st.name ? `<div class="c b">${esc(st.name)}</div>` : ""}
    ${st.address ? `<div class="c sm">${esc(st.address)}</div>` : ""}
    ${st.phone ? `<div class="c sm">ĐT: ${esc(st.phone)}</div>` : ""}
    <hr />
    <div class="c huge">#${order.queue_no}</div>
    <div class="c ch">${esc(channelLine(order))}</div>
    <div class="c sm">${esc(order.date)} ${esc(order.time)}${order.cashier ? " · TN: " + esc(order.cashier) : ""}</div>
    ${order.status === "cancelled" ? `<div class="c ch">*** ĐÃ HUỶ ***</div>` : ""}
    <hr />
    ${lines}
    <hr />
    <table>
      <tr><td>Tổng số ly</td><td class="rt">${cups}</td></tr>
      <tr class="tot"><td>TỔNG CỘNG</td><td class="rt">${vnd(order.total)}đ</td></tr>
      <tr><td>Thanh toán</td><td class="rt">${esc(PAY_LABEL[order.payment_method] || "")}</td></tr>
    </table>
    ${order.note ? `<div class="o" style="margin-top:4px">Ghi chú: ${esc(order.note)}</div>` : ""}
    <hr />
    ${s.footer ? `<div class="c">${esc(s.footer)}</div>` : ""}
  </div>`;
  const copies = Math.max(1, Math.min(3, Number(s.receiptCopies) || 1));
  return `<!doctype html><html><head><meta charset="utf-8"><title>Hoá đơn #${order.queue_no}</title><style>
    @page { margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: ${fs}px; line-height: 1.35; }
    .r { width: ${inner}mm; margin: 0 auto; padding: 2mm 0 8mm; }
    .r + .r { page-break-before: always; }
    .c { text-align: center; } .b { font-weight: 700; } .sm { font-size: ${fs - 1.5}px; }
    .big { font-size: ${fs + 8}px; font-weight: 800; letter-spacing: 1px; }
    .huge { font-size: ${fs + 16}px; font-weight: 800; line-height: 1.1; }
    .ch { font-size: ${fs + 3}px; font-weight: 800; }
    .o { font-size: ${fs - 1}px; padding-left: 2mm; }
    .it { padding: 1.2mm 0; }
    hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: .3mm 0; vertical-align: top; }
    .rt { text-align: right; white-space: nowrap; }
    .tot td { font-size: ${fs + 4}px; font-weight: 800; padding-top: 1mm; }
  </style></head><body>${Array(copies).fill(one).join("")}</body></html>`;
}

/* ─── Tem dán ly: mỗi ly một tem ─── */
function labelsHtml(order, s) {
  const W = Math.max(20, Number(s.labelW) || 50), H = Math.max(15, Number(s.labelH) || 30);
  const k = Math.min(W / 50, H / 30);       // phóng chữ theo khổ tem
  const px = (n) => (n * k).toFixed(1) + "px";
  const cups = [];
  order.items.forEach(it => { for (let i = 0; i < it.qty; i++) cups.push(it); });
  const total = cups.length;
  const body = cups.map((it, i) => {
    const opts = printOpts(it), tops = printTops(it);
    return `<div class="l">
      <div class="t"><span>#${order.queue_no} · ${esc(order.channel_label)}</span><span>${i + 1}/${total}</span></div>
      ${order.external_code ? `<div class="code">${esc(order.external_code)}</div>` : ""}
      <div class="n">${esc(it.name)}</div>
      ${opts ? `<div class="o">${esc(opts)}</div>` : ""}
      ${tops ? `<div class="o">+ ${esc(tops)}</div>` : ""}
      ${it.note ? `<div class="o b">* ${esc(it.note)}</div>` : ""}
      <div class="f"><span>${esc(order.time)} ${esc(order.date.slice(0, 5))}</span><span>${s.labelPrice ? vnd(it.unit_price) + "đ · " : ""}LABOONG</span></div>
    </div>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Tem #${order.queue_no}</title><style>
    @page { size: ${W}mm ${H}mm; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { font-family: Arial, Helvetica, sans-serif; }
    .l { width: ${W}mm; height: ${H}mm; padding: 1.4mm 2mm; overflow: hidden; display: flex; flex-direction: column; page-break-after: always; box-sizing: border-box; }
    .l:last-child { page-break-after: auto; }
    .t { display: flex; justify-content: space-between; font-size: ${px(9.5)}; font-weight: 800; }
    .code { font-size: ${px(9)}; font-weight: 700; }
    .n { font-size: ${px(12.5)}; font-weight: 800; line-height: 1.15; margin-top: .5mm; max-height: 2.3em; overflow: hidden; }
    .o { font-size: ${px(9)}; line-height: 1.2; }
    .b { font-weight: 700; }
    .f { margin-top: auto; display: flex; justify-content: space-between; font-size: ${px(8)}; font-weight: 700; }
  </style></head><body>${body}</body></html>`;
}

/* In một trang HTML qua iframe ẩn. Trả về khi hộp thoại in đóng (hoặc sau tối đa vài giây). */
function printHtml(html) {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(frame);
    let finished = false;
    const done = () => { if (finished) return; finished = true; resolve(); setTimeout(() => frame.remove(), 60000); };
    frame.onload = () => {
      const w = frame.contentWindow;
      try {
        w.addEventListener("afterprint", done);
        setTimeout(() => { w.focus(); w.print(); setTimeout(done, 1500); }, 150);
      } catch (e) { done(); }
    };
    frame.srcdoc = html;
  });
}

const SAMPLE_ORDER = {
  queue_no: 8, channel: "grab", channel_label: "GrabFood", external_code: "GF-123456789", status: "done",
  total: 118000, payment_method: "app", note: "Giao nhanh giúp mình", time: "14:05", date: "03/11/2026", cashier: "Thu ngân",
  store: { name: "Laboong Victoria Văn Phú", address: "S2.03 KĐT Văn Phú, Hà Đông", phone: "0243 555 0101" },
  items: [
    { name: "Trà sữa trân châu đường đen", qty: 2, unit_price: 59000, line_total: 118000, size: "Size L", levels: [{ label: "Đường", value: "50%" }, { label: "Đá", value: "70%" }], toppings: [{ name: "Trân châu", qty: 1 }], note: "ít ngọt" },
  ],
};

/* ─── Hộp thoại cài đặt máy in ─── */
function PrinterSettings({ onClose, onSaved }) {
  const [s, setS] = useStatePr(loadPrintSettings);
  const set = (k, v) => setS(x => ({ ...x, [k]: v }));
  const preset = `${s.labelW}x${s.labelH}`;
  const save = () => { savePrintSettings(s); onSaved && onSaved(s); onClose(); };
  return (
    <div className="dlg-scrim" onClick={onClose}>
      <div className="dlg" onClick={e => e.stopPropagation()}>
        <h3><Icon name="print" size={20} /> Cài đặt máy in</h3>
        <p className="hint">Lưu riêng trên máy này. Khi in, chọn đúng máy in trong hộp thoại in của trình duyệt.</p>

        <div className="fld"><label>Khổ giấy hoá đơn (máy in nhiệt)</label>
          <div className="seg">
            {[80, 58].map(w => <button key={w} className={Number(s.receiptWidth) === w ? "on" : ""} onClick={() => set("receiptWidth", w)}>{w}mm</button>)}
          </div>
        </div>
        <div className="fld"><label>Số liên hoá đơn</label>
          <div className="seg">
            {[1, 2, 3].map(n => <button key={n} className={Number(s.receiptCopies) === n ? "on" : ""} onClick={() => set("receiptCopies", n)}>{n} liên</button>)}
          </div>
        </div>
        <div className="fld"><label>Khổ tem dán ly (rộng × cao, mm)</label>
          <select value={LABEL_PRESETS.some(([w, h]) => `${w}x${h}` === preset) ? preset : "custom"}
            onChange={e => { if (e.target.value !== "custom") { const [w, h] = e.target.value.split("x").map(Number); setS(x => ({ ...x, labelW: w, labelH: h })); } }}>
            {LABEL_PRESETS.map(([w, h]) => <option key={w + "x" + h} value={`${w}x${h}`}>{w} × {h} mm</option>)}
            <option value="custom">Khổ khác…</option>
          </select>
          <div className="row">
            <input type="number" min="20" max="120" value={s.labelW} onChange={e => set("labelW", Number(e.target.value))} aria-label="Rộng (mm)" />
            <input type="number" min="15" max="120" value={s.labelH} onChange={e => set("labelH", Number(e.target.value))} aria-label="Cao (mm)" />
          </div>
        </div>
        <label className="chk"><input type="checkbox" checked={s.autoReceipt} onChange={e => set("autoReceipt", e.target.checked)} /> Tự in hoá đơn khi lưu đơn</label>
        <label className="chk"><input type="checkbox" checked={s.autoLabel} onChange={e => set("autoLabel", e.target.checked)} /> Tự in tem khi lưu đơn</label>
        <label className="chk"><input type="checkbox" checked={s.labelPrice} onChange={e => set("labelPrice", e.target.checked)} /> In giá trên tem</label>
        <div className="fld"><label>Dòng cuối hoá đơn</label>
          <input value={s.footer} maxLength={120} onChange={e => set("footer", e.target.value)} />
        </div>
        <div className="row" style={{ marginBottom: 10 }}>
          <button className="btn ghost sm" onClick={() => printHtml(receiptHtml(SAMPLE_ORDER, s))}><Icon name="receipt" size={16} /> In thử hoá đơn</button>
          <button className="btn ghost sm" onClick={() => printHtml(labelsHtml(SAMPLE_ORDER, s))}><Icon name="ticket" size={16} /> In thử tem</button>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
          <button className="btn" onClick={save}><Icon name="check" size={18} color="#fff" /> Lưu</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { loadPrintSettings, receiptHtml, labelsHtml, printHtml, PrinterSettings, printOpts, printTops });
