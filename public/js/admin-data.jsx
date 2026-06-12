/* global */
const ADMIN_CUSTOMERS_DATA = window.ADMIN_CUSTOMERS_DATA || {
  admin: { name: "Quản trị viên", email: "", initials: "QT" },
  tiers: [],
  stores: [],
  customers: [],
  stats: { total: 0, active: 0, newThisMonth: 0, points: 0 },
};

/* ---------- Tier + store meta ---------- */
const TIERS = {};
ADMIN_CUSTOMERS_DATA.tiers.forEach(t => {
  TIERS[t.key] = { key: t.key, label: t.label, cls: t.cls, min: t.minPoints, color: t.color };
});
const TIER_ORDER = ADMIN_CUSTOMERS_DATA.tiers.slice().sort((a, b) => a.level - b.level).map(t => t.key);

const STORES = ADMIN_CUSTOMERS_DATA.stores;

const AV_COLORS = [
  "linear-gradient(140deg,#0F623F,#1AA86A)",
  "linear-gradient(140deg,#FF8A5B,#FF6FA5)",
  "linear-gradient(140deg,#C99A2E,#E0B84A)",
  "linear-gradient(140deg,#1E8FA8,#4FC3D9)",
  "linear-gradient(140deg,#6B4FA0,#9B7FD4)",
  "linear-gradient(140deg,#3E7CB1,#6FB1E0)",
];
function avColor(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}
function initials(name) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[p.length - 1]?.[0] || "")).toUpperCase();
}
function fmtVND(n) { return n.toLocaleString("vi-VN") + "đ"; }
function fmtDate(iso) { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }

/* ---------- customers ---------- */
const CUSTOMERS = ADMIN_CUSTOMERS_DATA.customers;

Object.assign(window, { TIERS, TIER_ORDER, STORES, CUSTOMERS, avColor, initials, fmtVND, fmtDate });
