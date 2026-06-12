/* global */
const ADMIN_POINTS_DATA = window.ADMIN_POINTS_DATA || {
  admin: { name: "Quản trị viên", email: "", initials: "QT" },
  customers: [],
  ledger: [],
  stats: { issued: 0, redeemed: 0, remaining: 0, count: 0 },
};

const NOW = new Date();

const LEDGER = ADMIN_POINTS_DATA.ledger.map(e => ({ ...e, ts: new Date(e.ts) }));

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

Object.assign(window, { ADMIN_POINTS_DATA, LEDGER, fmtTs, TYPE_META, ADJUST_REASONS, NOW });
