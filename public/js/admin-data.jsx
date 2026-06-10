/* global */
/* ---------- Tier + store meta ---------- */
const TIERS = {
  dong: { key: "dong", label: "Đồng",      cls: "tier-dong", min: 0 },
  bac:  { key: "bac",  label: "Bạc",       cls: "tier-bac",  min: 1000 },
  vang: { key: "vang", label: "Vàng",      cls: "tier-vang", min: 2500 },
  kc:   { key: "kc",   label: "Kim Cương", cls: "tier-kc",   min: 6000 },
};
const TIER_ORDER = ["dong", "bac", "vang", "kc"];

const STORES = [
  "Victoria Văn Phú", "Royal City", "Times City", "Aeon Hà Đông", "Vincom Bà Triệu",
];

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

/* ---------- transaction generator ---------- */
const EARN_ITEMS = [
  "Trà sữa trân châu đường đen", "Macchiato kem phô cheese", "Trà đào cam sả",
  "Hồng trà sữa size L", "Trà sữa khoai môn", "Sữa tươi trân châu đường đen",
  "Cà phê sữa đá", "Trà vải hạt sen",
];
const REDEEM_ITEMS = [
  "Đổi voucher giảm 30.000đ", "Đổi 1 ly trà sữa miễn phí", "Đổi topping trân châu",
  "Đổi voucher giảm 50.000đ", "Đổi upsize miễn phí",
];
function genTx(seed, count) {
  let s = (seed * 9301 + 49297) % 233280;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const out = [];
  let day = 0;
  for (let i = 0; i < count; i++) {
    day += 1 + Math.floor(rnd() * 9);
    const redeem = rnd() > 0.74 && i > 0;
    if (redeem) {
      out.push({ type: "redeem", title: REDEEM_ITEMS[Math.floor(rnd() * REDEEM_ITEMS.length)],
        meta: `${day} ngày trước · ${STORES[Math.floor(rnd() * STORES.length)]}`,
        amt: -(50 + Math.floor(rnd() * 6) * 50) });
    } else {
      const qty = 1 + Math.floor(rnd() * 3);
      out.push({ type: "earn", title: `${qty} × ${EARN_ITEMS[Math.floor(rnd() * EARN_ITEMS.length)]}`,
        meta: `${day} ngày trước · ${STORES[Math.floor(rnd() * STORES.length)]}`,
        amt: 15 + Math.floor(rnd() * 9) * 5 });
    }
  }
  return out;
}

/* ---------- customers ---------- */
const RAW = [
  ["Nguyễn Minh Anh",   "0912 845 207", "minhanh.ng@gmail.com",    7820, "Victoria Văn Phú", "on",  9],
  ["Trần Quốc Bảo",     "0987 213 668", "quocbao.tran@gmail.com",  3140, "Royal City",       "on",  6],
  ["Lê Thị Hồng Vân",   "0934 776 192", "hongvan.le@gmail.com",    1280, "Times City",       "on",  5],
  ["Phạm Gia Huy",      "0905 558 410", "giahuy.pham@gmail.com",    640, "Aeon Hà Đông",     "off", 4],
  ["Đỗ Khánh Linh",     "0978 332 905", "khanhlinh.do@gmail.com",  6450, "Vincom Bà Triệu",  "on",  8],
  ["Vũ Đức Thành",      "0911 047 583", "ducthanh.vu@gmail.com",   2210, "Victoria Văn Phú", "on",  5],
  ["Hoàng Thu Trang",   "0962 884 117", "thutrang.hg@gmail.com",   4905, "Royal City",       "on",  7],
  ["Bùi Tuấn Kiệt",     "0938 612 740", "tuankiet.bui@gmail.com",   320, "Times City",       "off", 2],
  ["Đặng Mỹ Duyên",     "0909 451 836", "myduyen.dang@gmail.com",  1760, "Aeon Hà Đông",     "on",  4],
  ["Ngô Hải Đăng",      "0986 720 159", "haidang.ngo@gmail.com",   5380, "Victoria Văn Phú", "on",  6],
  ["Dương Bảo Ngọc",    "0913 298 644", "baongoc.duong@gmail.com", 8910, "Vincom Bà Triệu",  "on", 11],
  ["Lý Thanh Phong",    "0975 145 822", "thanhphong.ly@gmail.com",  890, "Royal City",       "off", 3],
  ["Cao Diệu My",       "0902 663 471", "dieumy.cao@gmail.com",    2980, "Times City",       "on",  5],
  ["Tạ Minh Quân",      "0967 510 238", "minhquan.ta@gmail.com",   1430, "Aeon Hà Đông",     "on",  4],
  ["Phan Ngọc Hân",     "0918 774 506", "ngochan.phan@gmail.com",  3620, "Victoria Văn Phú", "on",  6],
  ["Võ Hoàng Long",     "0989 326 715", "hoanglong.vo@gmail.com",  4150, "Vincom Bà Triệu",  "on",  7],
  ["Đinh Thúy Hằng",    "0907 882 340", "thuyhang.dinh@gmail.com",  560, "Times City",       "off", 2],
  ["Hồ Anh Tuấn",       "0973 419 087", "anhtuan.ho@gmail.com",    6720, "Royal City",       "on",  9],
];
const JOINS = [
  "2023-04-12","2023-07-28","2024-01-15","2024-03-09","2022-11-03","2024-05-21",
  "2023-02-17","2025-01-30","2024-08-11","2023-09-25","2022-06-14","2025-03-08",
  "2023-12-02","2024-06-19","2023-05-07","2022-10-22","2025-02-14","2023-08-30",
];

function tierFor(pts) {
  let t = "dong";
  for (const k of TIER_ORDER) if (pts >= TIERS[k].min) t = k;
  return t;
}

const CUSTOMERS = RAW.map((r, i) => {
  const [name, phone, email, points, store, status, visits] = r;
  return {
    id: "KH" + String(1024 + i),
    name, phone, email, points, store, status, visits,
    tier: tierFor(points),
    joined: JOINS[i],
    spent: visits * (45000 + (i * 7919) % 60000),
    tx: genTx(i + 3, 5 + (i % 3)),
  };
});

Object.assign(window, { TIERS, TIER_ORDER, STORES, CUSTOMERS, avColor, initials, fmtVND, fmtDate, tierFor });
