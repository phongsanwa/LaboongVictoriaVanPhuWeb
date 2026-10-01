/* global */
/* Laboong · Thực đơn */

const CATS = [
  { key: "milktea", label: "Trà sữa", ic: "cup" },
  { key: "fruit",   label: "Trà trái cây", ic: "plant" },
  { key: "coffee",  label: "Cà phê", ic: "coin" },
  { key: "special", label: "Đá xay & Macchiato", ic: "flame" },
  { key: "topping", label: "Topping", ic: "plus" },
];

/* price in đồng */
const MENU = [
  // milktea
  { id: "mt1", cat: "milktea", name: "Trà sữa trân châu đường đen", desc: "Trà sữa béo ngậy, trân châu đường đen dẻo thơm", price: 45000, grad: "linear-gradient(150deg,#6B4A2B,#9B7150)", tags: ["hot"] },
  { id: "mt2", cat: "milktea", name: "Hồng trà sữa", desc: "Hồng trà đậm vị, sữa tươi thanh nhẹ", price: 40000, grad: "linear-gradient(150deg,#A9743F,#C99A6A)", tags: [] },
  { id: "mt3", cat: "milktea", name: "Trà sữa khoai môn", desc: "Khoai môn xay mịn, vị bùi tự nhiên", price: 42000, grad: "linear-gradient(150deg,#8B6FB0,#B79CD6)", tags: ["new"] },
  { id: "mt4", cat: "milktea", name: "Sữa tươi trân châu đường đen", desc: "Sữa tươi nguyên chất, trân châu nóng", price: 50000, grad: "linear-gradient(150deg,#5C4327,#8A6843)", tags: ["hot"] },
  // fruit
  { id: "ft1", cat: "fruit", name: "Trà đào cam sả", desc: "Trà đào thơm, cam tươi và sả thanh mát", price: 39000, grad: "linear-gradient(150deg,#FF8A3D,#FFB85C)", tags: ["veg"] },
  { id: "ft2", cat: "fruit", name: "Trà vải hạt sen", desc: "Vải ngọt mọng cùng hạt sen bùi", price: 42000, grad: "linear-gradient(150deg,#F2598A,#FF8FB3)", tags: [] },
  { id: "ft3", cat: "fruit", name: "Trà dâu tằm", desc: "Dâu tằm chua ngọt, màu hồng tự nhiên", price: 43000, grad: "linear-gradient(150deg,#C2477B,#E06A9C)", tags: ["new", "veg"] },
  { id: "ft4", cat: "fruit", name: "Trà ổi hồng", desc: "Ổi ruột hồng ép tươi, vị thanh dịu", price: 41000, grad: "linear-gradient(150deg,#E0518A,#F285AC)", tags: ["veg"] },
  // coffee
  { id: "cf1", cat: "coffee", name: "Cà phê sữa đá", desc: "Cà phê phin truyền thống, sữa đặc béo", price: 29000, grad: "linear-gradient(150deg,#3E2A1A,#6B4A2B)", tags: [] },
  { id: "cf2", cat: "coffee", name: "Bạc xỉu", desc: "Nhiều sữa, ít cà phê, vị nhẹ êm", price: 32000, grad: "linear-gradient(150deg,#6B4A2B,#A07A52)", tags: [] },
  { id: "cf3", cat: "coffee", name: "Cà phê muối", desc: "Lớp kem muối béo mặn hài hoà", price: 35000, grad: "linear-gradient(150deg,#4A3422,#7C5839)", tags: ["hot"] },
  // special
  { id: "sp1", cat: "special", name: "Macchiato kem phô mai", desc: "Lớp kem phô mai mặn ngọt phủ trên trà", price: 48000, grad: "linear-gradient(150deg,#0F623F,#1AA86A)", tags: ["hot"] },
  { id: "sp2", cat: "special", name: "Đá xay socola", desc: "Socola đá xay mịn, kem tươi phủ trên", price: 52000, grad: "linear-gradient(150deg,#4A3422,#6B4A2B)", tags: [] },
  { id: "sp3", cat: "special", name: "Đá xay trà xanh", desc: "Trà xanh matcha đá xay, vị đắng dịu", price: 52000, grad: "linear-gradient(150deg,#3E9B5F,#6FBF8A)", tags: ["new", "veg"] },
  // topping
  { id: "tp1", cat: "topping", name: "Trân châu đường đen", desc: "Trân châu dẻo, ngấm đường đen", price: 8000, grad: "linear-gradient(150deg,#5C4327,#8A6843)", tags: [] },
  { id: "tp2", cat: "topping", name: "Thạch phô mai", desc: "Thạch phô mai mềm mịn", price: 10000, grad: "linear-gradient(150deg,#E0B84A,#F2D277)", tags: [] },
  { id: "tp3", cat: "topping", name: "Kem phô mai", desc: "Lớp kem phô mai béo mặn", price: 12000, grad: "linear-gradient(150deg,#0F623F,#1AA86A)", tags: [] },
  { id: "tp4", cat: "topping", name: "Pudding trứng", desc: "Pudding mềm tan, vị trứng thơm", price: 10000, grad: "linear-gradient(150deg,#E8973A,#F2B96B)", tags: [] },
];

const TAG_META = { hot: { l: "Best", ic: "flame" }, veg: { l: "Healthy", ic: "plant" }, new: { l: "Mới", ic: "sparkle2" } };

/* customization options */
const SUGAR_OPTS = ["0%", "30%", "50%", "70%", "100%"];
const ICE_OPTS = ["0%", "30%", "50%", "70%", "100%"];
const DEFAULT_SUGAR = "70%";
const DEFAULT_ICE = "70%";
/* size cốc — phụ phí cộng vào giá món */
const SIZE_OPTS = [
  { key: "M", label: "Size M", extra: 0 },
  { key: "L", label: "Size L", extra: 6000 },
  { key: "XL", label: "Size XL", extra: 12000 },
];
const DEFAULT_SIZE = "M";
/* topping add-ons (derived from topping category) */
const TOPPING_ADDONS = MENU.filter(m => m.cat === "topping").map(m => ({ id: m.id, name: m.name, price: m.price }));

/* ===== Variant groups (quản lý ở Admin · Variant) =====
   type: "level" = % lựa chọn không phụ phí; "size"/"addon" = có phụ phí (extra) */
const VARIANT_GROUPS = [
  { key: "sugar", label: "Lượng đường", ic: "coin", type: "level", required: true,
    options: SUGAR_OPTS.map((s, i) => ({ id: "sg" + i, label: s, extra: 0, available: true, def: s === DEFAULT_SUGAR })) },
  { key: "ice", label: "Lượng đá", ic: "flame", type: "level", required: true,
    options: ICE_OPTS.map((s, i) => ({ id: "ic" + i, label: s, extra: 0, available: true, def: s === DEFAULT_ICE })) },
  { key: "size", label: "Size cốc", ic: "cup", type: "size", required: true,
    options: SIZE_OPTS.map((s, i) => ({ id: "sz" + i, label: s.label, extra: s.extra, available: true, def: s.key === DEFAULT_SIZE })) },
  { key: "topping", label: "Topping", ic: "plus", type: "addon", required: false,
    options: TOPPING_ADDONS.map((t, i) => ({ id: "tp" + i, label: t.name, extra: t.price, available: true, def: false })) },
];

const STORE = "Victoria Văn Phú";
const PER_POINT = 10000;

/* mã khuyến mãi nhập tay (luôn dùng được cho demo) */
const PROMOS = {
  "LABOONG10": { name: "Giảm 10% toàn đơn", type: "percent", value: 10, min: 0, max: 30000 },
  "WELCOME20": { name: "Giảm 20.000đ cho khách mới", type: "amount", value: 20000, min: 50000 },
  "FREESHIP":  { name: "Miễn phí giao hàng", type: "amount", value: 15000, min: 0 },
};

/* đọc voucher giảm tiền từ ví (localStorage của trang Đổi quà) */
function parseVoucherDiscount(v) {
  const m = (v.name || "").match(/giảm\s+([\d.]+)\s*đ/i);
  if (!m) return null; // chỉ áp dụng voucher dạng giảm tiền
  const value = parseInt(m[1].replace(/\./g, ""), 10);
  const minM = (v.fine || "").match(/Đơn từ\s+([\d.]+)/i);
  const min = minM ? parseInt(minM[1].replace(/\./g, ""), 10) : 0;
  return { code: v.code, name: v.name, type: "amount", value, min, source: "voucher" };
}
function calcDiscount(c, subtotal) {
  if (!c) return 0;
  if (subtotal < (c.min || 0)) return 0;
  if (c.type === "amount") return Math.min(c.value, subtotal);
  if (c.type === "percent") { let d = Math.floor(subtotal * c.value / 100); if (c.max) d = Math.min(d, c.max); return d; }
  return 0;
}

/* stub for demo mode — in LIVE mode, addresses come from PHP data */
function loadAddresses() { return []; }

Object.assign(window, { CATS, MENU, TAG_META, STORE, PER_POINT, SUGAR_OPTS, ICE_OPTS, DEFAULT_SUGAR, DEFAULT_ICE, SIZE_OPTS, DEFAULT_SIZE, TOPPING_ADDONS, VARIANT_GROUPS, PROMOS, parseVoucherDiscount, calcDiscount, loadAddresses });
