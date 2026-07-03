/* global */
/* FR-019 · Voucher & gift catalogue */

const REWARD_CATS = {
  voucher: { label: "Voucher giảm giá", ic: "percent" },
  drink:   { label: "Miễn phí món",     ic: "cup" },
  gift:    { label: "Quà vật phẩm",     ic: "gift" },
  buyget:  { label: "Mua X tặng Y",     ic: "cart" },
  topping: { label: "Freetopping",      ic: "spark" },
  upsize:  { label: "Upsize",           ic: "arrowup" },
};

const ADMIN_REWARDS_DATA = window.ADMIN_REWARDS_DATA || { admin: null, rewards: [], products: [] };
const REWARDS = ADMIN_REWARDS_DATA.rewards;
const REWARD_PRODUCTS = ADMIN_REWARDS_DATA.products || [];

function expStatus(iso, todayISO) {
  if (iso < todayISO) return "expired";
  const exp = new Date(iso), now = new Date(todayISO);
  const days = Math.round((exp - now) / 86400000);
  if (days <= 30) return "soon";
  return "ok";
}

Object.assign(window, { REWARDS, REWARD_CATS, REWARD_PRODUCTS, expStatus, ADMIN_REWARDS_DATA });
