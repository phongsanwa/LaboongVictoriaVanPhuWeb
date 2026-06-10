/* global CUSTOMERS, STORES */
/* Build a flat transaction ledger from customer activity + manual adjustments. */

const NOW = new Date(2026, 5, 8, 16, 30); // 08/06/2026

function parseDays(meta) {
  const m = /(\d+)\s*ng/.exec(meta);
  return m ? parseInt(m[1], 10) : 1;
}
function storeOf(meta) {
  const parts = meta.split("·");
  return parts.length > 1 ? parts[parts.length - 1].trim() : STORES[0];
}

let _seq = 4830;
function gid() { return "GD" + (_seq--); }

const ADJUST_SEED = [
  { ci: 3,  pts:  200, reason: "Đền bù khiếu nại đơn hàng", note: "Đơn giao trễ 40 phút", days: 2,  staff: "Thu Hà" },
  { ci: 0,  pts:  100, reason: "Tặng điểm sinh nhật",       note: "",                       days: 5,  staff: "Hệ thống" },
  { ci: 7,  pts: -150, reason: "Trừ điểm do hoàn đơn",      note: "Khách hủy đơn #88213",   days: 6,  staff: "Quốc Bảo" },
  { ci: 10, pts:  500, reason: "Bù điểm do lỗi hệ thống",   note: "Sự cố quét QR 03/06",    days: 8,  staff: "Thu Hà" },
  { ci: 4,  pts:  300, reason: "Tặng điểm sinh nhật",       note: "",                       days: 12, staff: "Hệ thống" },
  { ci: 14, pts:  -80, reason: "Điều chỉnh sau kiểm kê",    note: "Sai lệch tích điểm",     days: 15, staff: "Minh Quân" },
];

function buildLedger() {
  const rows = [];
  // from customer activity
  CUSTOMERS.forEach((c) => {
    c.tx.forEach((x, j) => {
      const days = parseDays(x.meta);
      const ts = new Date(NOW.getTime() - days * 86400000 - (j * 137 + (c.name.length * 53)) % 86400000);
      rows.push({
        id: gid(),
        cust: { name: c.name, id: c.id, tier: c.tier },
        type: x.type, // earn | redeem
        desc: x.title,
        reason: null,
        source: x.type === "redeem" ? "Đổi quà tại quầy" : storeOf(x.meta),
        staff: null,
        ts, points: x.amt,
      });
    });
  });
  // manual adjustments
  ADJUST_SEED.forEach((a) => {
    const c = CUSTOMERS[a.ci];
    const ts = new Date(NOW.getTime() - a.days * 86400000 - 3600000 * (a.ci % 9));
    rows.push({
      id: gid(),
      cust: { name: c.name, id: c.id, tier: c.tier },
      type: "adjust",
      desc: a.pts > 0 ? "Cộng điểm thủ công" : "Trừ điểm thủ công",
      reason: a.reason, note: a.note,
      source: "Điều chỉnh thủ công",
      staff: a.staff,
      ts, points: a.pts,
    });
  });
  rows.sort((a, b) => b.ts - a.ts);
  return rows;
}

const LEDGER = buildLedger();

function fmtTs(ts) {
  const p = (n) => String(n).padStart(2, "0");
  const sameDay = ts.toDateString() === NOW.toDateString();
  const yest = new Date(NOW.getTime() - 86400000).toDateString() === ts.toDateString();
  const t = `${p(ts.getHours())}:${p(ts.getMinutes())}`;
  if (sameDay) return `Hôm nay · ${t}`;
  if (yest) return `Hôm qua · ${t}`;
  return `${p(ts.getDate())}/${p(ts.getMonth() + 1)}/${ts.getFullYear()} · ${t}`;
}

const TYPE_META = {
  earn:   { label: "Tích điểm",  cls: "type-earn",   ic: "plus" },
  redeem: { label: "Tiêu điểm",  cls: "type-redeem", ic: "gift" },
  adjust: { label: "Điều chỉnh", cls: "type-adjust", ic: "edit" },
};

const ADJUST_REASONS = [
  "Đền bù khiếu nại đơn hàng",
  "Tặng điểm sinh nhật",
  "Bù điểm do lỗi hệ thống",
  "Điều chỉnh sau kiểm kê",
  "Trừ điểm do hoàn đơn",
  "Khác",
];

Object.assign(window, { LEDGER, fmtTs, TYPE_META, ADJUST_REASONS, NOW });
