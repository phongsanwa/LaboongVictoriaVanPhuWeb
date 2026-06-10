/* global */
/* FR-020 · Campaigns & promotions */

const CAMP_TYPES = {
  x2:      { label: "Tích x2 điểm",   short: "x2 điểm",   ic: "coin",      grad: "linear-gradient(135deg,#0F623F,#1AA86A)", color: "#0F623F" },
  discount:{ label: "Giảm giá %",     short: "Giảm %",    ic: "percent",   grad: "linear-gradient(135deg,#FF8A5B,#FF6FA5)", color: "#E0518A" },
  voucher: { label: "Tặng voucher",   short: "Voucher",   ic: "ticket",    grad: "linear-gradient(135deg,#C99A2E,#E0B84A)", color: "#C99A2E" },
};

const AUDIENCES = {
  all:  { label: "Tất cả khách hàng", ic: "users",  size: 1820 },
  new:  { label: "Khách hàng mới",    ic: "sparkle2", size: 245 },
  dong: { label: "Hạng Đồng",         ic: "star",   size: 612 },
  bac:  { label: "Hạng Bạc",          ic: "star",   size: 530 },
  vang: { label: "Hạng Vàng",         ic: "star",   size: 318 },
  kc:   { label: "Hạng Kim Cương",    ic: "star",   size: 115 },
};

const CAMP_STATUS = {
  running:   { label: "Đang chạy",   cls: "cs-run" },
  scheduled: { label: "Đã lên lịch", cls: "cs-sched" },
  ended:     { label: "Đã kết thúc", cls: "cs-end" },
  draft:     { label: "Bản nháp",    cls: "cs-draft" },
};

const CAMPAIGNS_SEED = [
  { name: "Thứ 4 nhân đôi điểm", type: "x2", audience: "all", start: "2026-06-01", end: "2026-06-30",
    condition: "Áp dụng mọi đơn vào thứ 4 hàng tuần", status: "running",
    reach: 1820, opened: 1240, converted: 486, pushSent: true },
  { name: "Chào hè giảm 25%", type: "discount", value: 25, audience: "all", start: "2026-06-05", end: "2026-06-20",
    condition: "Đơn từ 99.000đ, tối đa giảm 50.000đ", status: "running",
    reach: 1820, opened: 1502, converted: 712, pushSent: true },
  { name: "Tặng voucher sinh nhật", type: "voucher", audience: "all", start: "2026-01-01", end: "2026-12-31",
    condition: "Tự động tặng voucher 70k trong tháng sinh nhật", status: "running",
    reach: 1820, opened: 980, converted: 410, pushSent: true },
  { name: "Hạng Vàng x2 cuối tuần", type: "x2", audience: "vang", start: "2026-06-14", end: "2026-06-16",
    condition: "Chỉ áp dụng cho hạng Vàng, T7 & CN", status: "scheduled",
    reach: 318, opened: 0, converted: 0, pushSent: false },
  { name: "Chào mừng khách mới", type: "voucher", audience: "new", start: "2026-05-01", end: "2026-07-31",
    condition: "Tặng voucher 30k cho lần mua đầu tiên", status: "running",
    reach: 245, opened: 198, converted: 156, pushSent: true },
  { name: "Kim Cương ưu đãi 30%", type: "discount", value: 30, audience: "kc", start: "2026-07-01", end: "2026-07-15",
    condition: "Đặc quyền hạng Kim Cương, không giới hạn đơn", status: "scheduled",
    reach: 115, opened: 0, converted: 0, pushSent: false },
  { name: "Flash Sale 8/5 giảm 40%", type: "discount", value: 40, audience: "all", start: "2026-05-08", end: "2026-05-08",
    condition: "Trong ngày 8/5, áp dụng toàn menu", status: "ended",
    reach: 1780, opened: 1610, converted: 905, pushSent: true },
  { name: "Tích x3 dịp khai trương", type: "x2", audience: "all", start: "2026-08-01", end: "2026-08-07",
    condition: "Nhân 3 điểm tuần khai trương chi nhánh mới", status: "draft",
    reach: 1820, opened: 0, converted: 0, pushSent: false },
];

let _cid = 700;
const CAMPAIGNS = CAMPAIGNS_SEED.map(c => ({ id: "CMP" + (++_cid), ...c }));

Object.assign(window, { CAMP_TYPES, AUDIENCES, CAMP_STATUS, CAMPAIGNS });
