/* global */
/* FR-019 · Voucher & gift catalogue */

const REWARD_CATS = {
  voucher: { label: "Voucher giảm giá", ic: "percent" },
  drink:   { label: "Đồ uống miễn phí", ic: "cup" },
  gift:    { label: "Quà tặng", ic: "gift" },
  upgrade: { label: "Nâng cấp / Topping", ic: "spark" },
};

/* thumbnail = gradient + icon (no external images needed) */
const REWARDS_SEED = [
  { name: "Voucher giảm 30.000đ",        cat: "voucher", points: 300,  qty: 500, redeemed: 312, used: 268, expiry: "2026-08-31", status: "on",  grad: "linear-gradient(135deg,#FF8A5B,#FF6FA5)" },
  { name: "Voucher giảm 50.000đ",        cat: "voucher", points: 500,  qty: 300, redeemed: 184, used: 150, expiry: "2026-08-31", status: "on",  grad: "linear-gradient(135deg,#F2598A,#C2477B)" },
  { name: "Trà sữa size L miễn phí",     cat: "drink",   points: 450,  qty: 400, redeemed: 357, used: 330, expiry: "2026-07-15", status: "on",  grad: "linear-gradient(135deg,#0F623F,#1AA86A)" },
  { name: "Combo 2 ly Macchiato",        cat: "drink",   points: 800,  qty: 200, redeemed: 96,  used: 80,  expiry: "2026-07-31", status: "on",  grad: "linear-gradient(135deg,#1E8FA8,#4FC3D9)" },
  { name: "Upsize miễn phí mọi đơn",     cat: "upgrade", points: 120,  qty: 1000,redeemed: 642, used: 590, expiry: "2026-09-30", status: "on",  grad: "linear-gradient(135deg,#C99A2E,#E0B84A)" },
  { name: "Thêm topping trân châu",      cat: "upgrade", points: 80,   qty: 800, redeemed: 511, used: 488, expiry: "2026-09-30", status: "on",  grad: "linear-gradient(135deg,#A9743F,#C99A6A)" },
  { name: "Ly giữ nhiệt Laboong",        cat: "gift",    points: 2500, qty: 150, redeemed: 88,  used: 88,  expiry: "2026-12-31", status: "on",  grad: "linear-gradient(135deg,#6B4FA0,#9B7FD4)" },
  { name: "Túi tote canvas Laboong",     cat: "gift",    points: 1800, qty: 120, redeemed: 47,  used: 40,  expiry: "2026-12-31", status: "on",  grad: "linear-gradient(135deg,#3E7CB1,#6FB1E0)" },
  { name: "Voucher giảm 100.000đ",       cat: "voucher", points: 1000, qty: 100, redeemed: 100, used: 92,  expiry: "2026-06-30", status: "on",  grad: "linear-gradient(135deg,#D4584B,#F2826F)" },
  { name: "Bộ sticker Laboong",          cat: "gift",    points: 200,  qty: 600, redeemed: 233, used: 210, expiry: "2026-10-31", status: "off", grad: "linear-gradient(135deg,#5A8F7B,#7FB8A0)" },
  { name: "Trà đào cam sả miễn phí",     cat: "drink",   points: 400,  qty: 300, redeemed: 300, used: 295, expiry: "2026-05-31", status: "off", grad: "linear-gradient(135deg,#E08A2B,#F2B14A)" },
  { name: "Voucher sinh nhật 70.000đ",   cat: "voucher", points: 700,  qty: 250, redeemed: 61,  used: 44,  expiry: "2027-01-31", status: "on",  grad: "linear-gradient(135deg,#9B4DA0,#C77FD4)" },
];

let _rid = 4000;
const REWARDS = REWARDS_SEED.map((r) => ({ id: "RW" + (++_rid), ...r }));

function expStatus(iso, todayISO) {
  if (iso < todayISO) return "expired";
  const exp = new Date(iso), now = new Date(todayISO);
  const days = Math.round((exp - now) / 86400000);
  if (days <= 30) return "soon";
  return "ok";
}

Object.assign(window, { REWARDS, REWARD_CATS, expStatus });
