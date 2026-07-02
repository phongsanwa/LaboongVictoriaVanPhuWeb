/* global React */
const { useState, useEffect, useRef, useMemo } = React;

/* ---------------- Icons (simple line set) ---------------- */
function Icon({ name, size = 20, stroke = 2.1, color = "currentColor", fill = "none" }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill, stroke: color,
    strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    qr: <><rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><path d="M14 14h3v3M21 14v3M14 21h7M17 17v4" stroke={color}/></>,
    scan: <><path d="M4 7V5.5A1.5 1.5 0 0 1 5.5 4H7M17 4h1.5A1.5 1.5 0 0 1 20 5.5V7M20 17v1.5a1.5 1.5 0 0 1-1.5 1.5H17M7 20H5.5A1.5 1.5 0 0 1 4 18.5V17"/><path d="M3.5 12h17"/></>,
    pin: <><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></>,
    phone: <path d="M5 4h3l1.6 4-2 1.4a12 12 0 0 0 5 5l1.4-2 4 1.6V20a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z"/>,
    nav: <><path d="M3 11 21 3l-8 18-2.2-7.8z"/></>,
    gift: <><rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M3.5 13h17M12 9v11"/><path d="M12 9S10.5 4.8 8 5c-2 .2-1.8 4 0 4h4ZM12 9s1.5-4.2 4-4c2 .2 1.8 4 0 4h-4Z"/></>,
    star: <path d="m12 3 2.5 5.4 5.9.7-4.4 4 1.2 5.8L12 16l-5.2 2.9L8 13.1l-4.4-4 5.9-.7z" fill={color} stroke="none"/>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6"/>,
    chev: <path d="m9 6 6 6-6 6"/>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
    coin: <><circle cx="12" cy="12" r="8.2"/><path d="M12 7.5v9M9.6 9.6c0-1.1 1.1-1.7 2.4-1.7s2.4.6 2.4 1.7-1.1 1.6-2.4 1.6-2.4.6-2.4 1.7 1.1 1.7 2.4 1.7 2.4-.6 2.4-1.7"/></>,
    cup: <><path d="M7 8h10l-1.1 11.6a1.5 1.5 0 0 1-1.5 1.4H9.6a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M6.3 8h11.4"/><path d="M13.6 8 16 3.6"/></>,
    home: <><path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/></>,
    grid: <><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></>,
    user: <><circle cx="12" cy="8.5" r="3.6"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.2"/></>,
    spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>,
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></>,
    filter: <path d="M4 5h16l-6.4 7.6V19l-3.2 1.6v-8z"/>,
    download: <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/></>,
    sort: <path d="M8 4v16M8 20l-3-3M8 4l3 3M16 20V4M16 4l3 3M16 20l-3-3"/>,
    chevdown: <path d="m6 9 6 6 6-6"/>,
    chevup: <path d="m6 15 6-6 6 6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    dots: <><circle cx="12" cy="5" r="1.4" fill={color} stroke="none"/><circle cx="12" cy="12" r="1.4" fill={color} stroke="none"/><circle cx="12" cy="19" r="1.4" fill={color} stroke="none"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="m3.5 7 8.5 6 8.5-6"/></>,
    cal: <><rect x="3.5" y="5" width="17" height="16" rx="2.2"/><path d="M3.5 9.5h17M8 3.5v4M16 3.5v4"/></>,
    users: <><circle cx="9" cy="8" r="3.3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.3 3.3 0 0 1 0 6.1M17.5 20a5.5 5.5 0 0 0-2.4-4.5"/></>,
    receipt: <><path d="M5 3.5h14v17l-2.5-1.5L14 20.5 11.5 19 9 20.5 6.5 19 5 20.5z"/><path d="M8.5 8h7M8.5 12h7"/></>,
    gear: <><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19"/></>,
    logout: <><path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14"/><path d="M17 8l4 4-4 4M9 12h12"/></>,
    edit: <path d="M16.5 4.5 19.5 7.5 8 19l-4 1 1-4z"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    minus: <path d="M5 12h14"/>,
    check: <path d="m5 12.5 4.5 4.5L19 6.5"/>,
    chart: <><path d="M4 20V4M20 20H4"/><path d="M8 16v-4M12 16V8M16 16v-6"/></>,
    ext: <><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></>,
    trash: <><path d="M4 7h16M9 7V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2V7M6 7l1 12.2A1.5 1.5 0 0 0 8.5 20.6h7A1.5 1.5 0 0 0 17 19.2L18 7M10 11v6M14 11v6"/></>,
    image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/><circle cx="9" cy="9.5" r="1.6"/><path d="m4.5 17 4.5-4.3 3.2 3 3-2.8 4 3.6"/></>,
    eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></>,
    eyeoff: <><path d="M3 3l18 18M10.6 6.2A8.6 8.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3.3 3.9M6.3 7.8A16 16 0 0 0 2.5 12S6 18 12 18a8.7 8.7 0 0 0 3.3-.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
    box: <><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/></>,
    clock: <><circle cx="12" cy="12" r="8.2"/><path d="M12 7.5V12l3 2"/></>,
    ticket: <><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4z"/><path d="M14 6v12" strokeDasharray="2 2.4"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></>,
    alert: <><path d="M12 3 1.5 21h21z"/><path d="M12 10v5M12 18v.2"/></>,
    percent: <><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/><path d="M19 5 5 19"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/></>,
    rocket: <><path d="M5 15c-1.5 1-2 4-2 4s3-.5 4-2a2.1 2.1 0 0 0-2-2Z"/><path d="M9 13c-1-3 1-8 6.5-9.5C17 3 18 4 18 5.5 16.5 11 11.5 13 9 13Z"/><path d="M9 13l2 2"/><circle cx="14.5" cy="7.5" r="1.3"/></>,
    bellpush: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/><path d="M18 3.5 20.5 6M20.5 3.5 18 6" stroke={color}/></>,
    target: <><circle cx="12" cy="12" r="8.3"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.2" fill={color} stroke="none"/></>,
    calrange: <><rect x="3" y="5" width="18" height="16" rx="2.2"/><path d="M3 9.5h18M8 3v4M16 3v4M7.5 14h4M7.5 17.5h7"/></>,
    multiply: <><circle cx="12" cy="12" r="8.3"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/></>,
    mega: <><path d="M4 10v4a1.5 1.5 0 0 0 1.5 1.5H7l1 4h2l-1-4 8 3.5A1 1 0 0 0 18.5 18V6A1 1 0 0 0 17 5.1L7 9H5.5A1.5 1.5 0 0 0 4 10.5z"/><path d="M21 10v4"/></>,
    play: <path d="M7 5.5 18 12 7 18.5z" fill={color} stroke="none"/>,
    pause: <><rect x="7" y="5.5" width="3.5" height="13" rx="1" fill={color} stroke="none"/><rect x="13.5" y="5.5" width="3.5" height="13" rx="1" fill={color} stroke="none"/></>,
    send: <><path d="M21 4 3 11l6 2.5L11.5 20 21 4Z"/><path d="m9 13.5 4-4"/></>,
    sparkle2: <path d="M12 4l1.8 4.7 4.7 1.8-4.7 1.8L12 17l-1.8-4.7L5.5 10.5l4.7-1.8z" fill={color} stroke="none"/>,
    arrowleft: <path d="M19 12H5M11 6l-6 6 6 6"/>,
    shield: <><path d="M12 3 5 6v5.5c0 4 2.9 7.4 7 8.5 4.1-1.1 7-4.5 7-8.5V6z"/><path d="m9 12 2 2 4-4"/></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
    key: <><circle cx="8" cy="15" r="4"/><path d="M11 12 20 3M17 6l2 2M14 9l2 2"/></>,
    del: <><path d="M21 5H9.5a2 2 0 0 0-1.5.7L3 12l5 6.3a2 2 0 0 0 1.5.7H21a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 21 5Z"/><path d="m12 9.5 5 5M17 9.5l-5 5"/></>,
    refresh: <><path d="M20 11A8 8 0 0 0 6 6.5L3.5 9M4 13a8 8 0 0 0 14 4.5L20.5 15"/><path d="M3.5 4v5h5M20.5 20v-5h-5"/></>,
    print: <><path d="M7 9V3.5h10V9"/><rect x="4.5" y="9" width="15" height="7" rx="1.5"/><path d="M7 14h10v6.5H7z"/></>,
    camera: <><rect x="3" y="7" width="18" height="13" rx="2.4"/><circle cx="12" cy="13.5" r="3.4"/><path d="M8.5 7l1.2-2.3a1 1 0 0 1 .9-.5h2.8a1 1 0 0 1 .9.5L16.5 7"/></>,
    swap: <><path d="M7 4 3.5 7.5 7 11M3.5 7.5H17M17 20l3.5-3.5L17 13M20.5 16.5H7"/></>,
    heart: <path d="M12 20s-7-4.6-7-9.4A4 4 0 0 1 12 7.5 4 4 0 0 1 19 10.6c0 4.8-7 9.4-7 9.4Z"/>,
    heartfill: <path d="M12 20s-7-4.6-7-9.4A4 4 0 0 1 12 7.5 4 4 0 0 1 19 10.6c0 4.8-7 9.4-7 9.4Z" fill={color} stroke={color}/>,
    trash: <><path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7"/><path d="M10 11v6M14 11v6"/></>,
    building: <><rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2M9 14.5h2M13 14.5h2M10 20.5v-3h4v3"/></>,
    plus2: <path d="M12 5v14M5 12h14"/>,
    share: <><circle cx="6" cy="12" r="2.4"/><circle cx="17" cy="6" r="2.4"/><circle cx="17" cy="18" r="2.4"/><path d="m8.1 10.9 6.8-3.8M8.1 13.1l6.8 3.8"/></>,
    globe: <><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.3 3.8 8.5s-1.3 6.2-3.8 8.5C9.5 18.2 8.2 15.2 8.2 12S9.5 5.8 12 3.5Z"/></>,
    link: <><path d="M10 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L11 7.5"/><path d="M14 10.5a3.5 3.5 0 0 0-5 0L6.5 13a3.5 3.5 0 0 0 5 5L13 16.5"/></>,
    palette: <><path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-.5-.2-.9-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-3.9-4-6.7-9-6.7Z"/><circle cx="7.5" cy="11.5" r="1.1" fill={color} stroke="none"/><circle cx="12" cy="8" r="1.1" fill={color} stroke="none"/><circle cx="16.5" cy="11.5" r="1.1" fill={color} stroke="none"/></>,
    wifi: <><path d="M5 11.5a10 10 0 0 1 14 0M7.7 14.5a6 6 0 0 1 8.6 0"/><circle cx="12" cy="18" r="1.1" fill={color} stroke="none"/></>,
    car: <><path d="M5 16v2.5M19 16v2.5M4 16h16"/><path d="M5.5 16 6.8 9.5A2 2 0 0 1 8.8 8h6.4a2 2 0 0 1 2 1.5L18.5 16a1.5 1.5 0 0 1-1.5 1.3H7a1.5 1.5 0 0 1-1.5-1.3Z"/><path d="M8 12.5h8M8 16h.01M16 16h.01"/></>,
    chair: <><path d="M6 4v7h12V4M6 11l-1 9M18 11l1 9M5 15h14"/></>,
    bike: <><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17 10 8h4l2 4M9 8h5M13 8l3 9"/></>,
    walk: <><circle cx="13" cy="4.5" r="1.6"/><path d="M11 9 8 11M11 9l3 1 1 4M14 14l-2 6M14 14l3 3M11 13l-1 7"/></>,
    cake: <><path d="M4 17h16v2.5A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5z"/><path d="M4 17c0-3 1.5-4 4-4h8c2.5 0 4 1 4 4"/><path d="M12 13V9M9 9V7M15 9V7"/><path d="M7 7c0-1.1.9-2 2-2s2 .9 2 2M13 7c0-1.1.9-2 2-2s2 .9 2 2"/></>,
    bag: <><path d="M6 2 3.5 5.5v15A1.5 1.5 0 0 0 5 22h14a1.5 1.5 0 0 0 1.5-1.5v-15L18 2z"/><path d="M3.5 5.5h17M16 10a4 4 0 0 1-8 0"/></>,
    truck: <><rect x="1.5" y="5" width="13" height="11" rx="1.5"/><path d="M14.5 8.5H19l2.5 3v5h-7z"/><circle cx="5" cy="18.5" r="2"/><circle cx="18" cy="18.5" r="2"/><path d="M3 16.5h19"/></>,
  };
  return <svg {...p} style={{ display: "block", flex: "none" }}>{paths[name] || null}</svg>;
}

/* ---------------- Pseudo-QR generator ---------------- */
function makeQR(seed = 7, n = 29) {
  // deterministic PRNG
  let s = seed * 2654435761 % 2147483647;
  const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
  const g = Array.from({ length: n }, () => Array(n).fill(false));
  const finder = (r, c) => {
    for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
      const rr = r + i, cc = c + j;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const edge = i === 0 || i === 6 || j === 0 || j === 6;
      const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      const inb = i >= 0 && i <= 6 && j >= 0 && j <= 6;
      g[rr][cc] = inb ? (edge || core) : false;
    }
  };
  // random fill
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r][c] = rnd() > 0.52;
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  // timing-ish + clear center for logo
  const m = Math.floor(n / 2);
  for (let r = m - 3; r <= m + 3; r++) for (let c = m - 3; c <= m + 3; c++) g[r][c] = false;
  return g;
}

/* real QR encoding when `value` is given, falls back to the pseudo-QR otherwise */
function realQR(value) {
  if (!window.qrcode) return null;
  try {
    const qr = window.qrcode(0, "H");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
  } catch (e) {
    return null;
  }
}

function QRCanvas({ value }) {
  const fallback = useRef(makeQR(42)).current;
  const grid = useMemo(() => (value ? realQR(value) : null) || fallback, [value]);
  const n = grid.length;
  return (
    <div className="qr-canvas" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}>
      {grid.flatMap((row, r) => row.map((on, c) =>
        <i key={r + "-" + c} style={{ background: on ? "var(--brand-deep)" : "transparent", borderRadius: on ? 1.5 : 0 }} />
      ))}
    </div>
  );
}

/* ---------------- helpers ---------------- */
function fmt(n) { return n.toLocaleString("vi-VN"); }

/* ---------------- Shared navigation map ---------------- */
const NAV_URLS = {
  // customer
  register: "/register",
  login: "/login",
  home: "/",
  menu: "/menu",
  orderHistory: "/orders/history",
  points: "/points",
  catalog: "/rewards",
  wallet: "/rewards/wallet",
  history: "/points",
  profile: "/profile",
  store: "/store",
  pos: "/pos/points",
  // admin
  adminHome: "/admin",
  adminCustomers: "/admin/customers",
  adminPoints: "/admin/points",
  adminRewards: "/admin/rewards",
  adminCampaigns: "/admin/campaigns",
  adminCheckin: "/admin/checkin",
  adminOrders: "/admin/orders",
  adminShipping: "/admin/shipping",
  adminPromotions: "/admin/promotions",
  adminMenu: "/admin/menu",
  adminVariants: "/admin/variants",
  adminStores: "/admin/stores",
  adminRoles: "/admin/roles",
  adminSettings: "/admin/settings",
};
const ADMIN_NAV_HREF = {
  "Tổng quan": NAV_URLS.adminHome,
  "Khách hàng": NAV_URLS.adminCustomers,
  "Điểm & giao dịch": NAV_URLS.adminPoints,
  "Đơn hàng": NAV_URLS.adminOrders,
  "Phí ship": NAV_URLS.adminShipping,
  "Đổi quà": NAV_URLS.adminRewards,
  "Chiến dịch": NAV_URLS.adminCampaigns,
  "Điểm danh": NAV_URLS.adminCheckin,
  "Thực đơn": NAV_URLS.adminMenu,
  "Khuyến mãi": NAV_URLS.adminPromotions,
  "Variant / Tuỳ chọn": NAV_URLS.adminVariants,
  "Cửa hàng": NAV_URLS.adminStores,
  "Phân quyền": NAV_URLS.adminRoles,
  "Cài đặt": NAV_URLS.adminSettings,
};
function adminHref(label) { return ADMIN_NAV_HREF[label] || "#"; }

Object.assign(window, { Icon, QRCanvas, makeQR, fmt, NAV_URLS, ADMIN_NAV_HREF, adminHref });
