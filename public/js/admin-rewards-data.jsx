/* global */
/* FR-019 · Voucher & gift catalogue */

const REWARD_CATS = {
  voucher: { label: "Voucher giảm giá", ic: "percent" },
  drink:   { label: "Đồ uống miễn phí", ic: "cup" },
  gift:    { label: "Quà tặng", ic: "gift" },
  upgrade: { label: "Nâng cấp / Topping", ic: "spark" },
};

const ADMIN_REWARDS_DATA = window.ADMIN_REWARDS_DATA || { admin: null, rewards: [] };
const REWARDS = ADMIN_REWARDS_DATA.rewards;

function expStatus(iso, todayISO) {
  if (iso < todayISO) return "expired";
  const exp = new Date(iso), now = new Date(todayISO);
  const days = Math.round((exp - now) / 86400000);
  if (days <= 30) return "soon";
  return "ok";
}

Object.assign(window, { REWARDS, REWARD_CATS, expStatus, ADMIN_REWARDS_DATA });
