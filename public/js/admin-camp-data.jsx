/* global */
/* FR-020 · Campaigns & promotions */

const CAMP_TYPES = {
  x2:       { label: "Tích x2 điểm",  short: "x2 điểm",   ic: "coin",     grad: "linear-gradient(135deg,#0F623F,#1AA86A)", color: "#0F623F" },
  discount: { label: "Giảm giá %",    short: "Giảm %",    ic: "percent",  grad: "linear-gradient(135deg,#FF8A5B,#FF6FA5)", color: "#E0518A" },
  voucher:  { label: "Tặng voucher",  short: "Voucher",   ic: "ticket",   grad: "linear-gradient(135deg,#C99A2E,#E0B84A)", color: "#C99A2E" },
  birthday: { label: "Sinh nhật",     short: "Sinh nhật", ic: "cake",     grad: "linear-gradient(135deg,#E91E8C,#FF6B6B)",  color: "#E91E8C" },
};

const CAMP_STATUS = {
  running:   { label: "Đang chạy",   cls: "cs-run" },
  scheduled: { label: "Đã lên lịch", cls: "cs-sched" },
  ended:     { label: "Đã kết thúc", cls: "cs-end" },
  draft:     { label: "Bản nháp",    cls: "cs-draft" },
};

const ADMIN_CAMPAIGNS_DATA = window.ADMIN_CAMPAIGNS_DATA || { admin: null, campaigns: [], audiences: {}, rewards: [] };
const CAMPAIGNS = ADMIN_CAMPAIGNS_DATA.campaigns;
const AUDIENCES = ADMIN_CAMPAIGNS_DATA.audiences;
const CAMP_REWARDS = ADMIN_CAMPAIGNS_DATA.rewards;

Object.assign(window, { CAMP_TYPES, AUDIENCES, CAMP_STATUS, CAMPAIGNS, CAMP_REWARDS, ADMIN_CAMPAIGNS_DATA });
