/* global React, ReactDOM, Icon, fmt, CATS, MENU, TAG_META, STORE, PER_POINT, CustomizeSheet, NAV_URLS, PROMOS, parseVoucherDiscount, calcDiscount, loadAddresses, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo, useRef } = React;

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

/* ─── LIVE / demo mode ─────────────────────────────────────────── */
const LIVE     = !!window.MENU_PAGE_DATA;
const LIVE_D   = window.MENU_PAGE_DATA || {};

function getLiveCats()      { return LIVE ? LIVE_D.cats          : (typeof CATS !== 'undefined' ? CATS : []); }
function getLiveMenu()      { return LIVE ? LIVE_D.menu          : (typeof MENU !== 'undefined' ? MENU : []); }
function getLiveTagMeta()   { return LIVE ? LIVE_D.tagMeta       : (typeof TAG_META !== 'undefined' ? TAG_META : {}); }
function getLiveStore()     { return LIVE ? LIVE_D.store         : (typeof STORE !== 'undefined' ? STORE : 'Laboong'); }
function getLivePerPoint()  { return LIVE ? LIVE_D.perPoint      : (typeof PER_POINT !== 'undefined' ? PER_POINT : 10000); }
function getLivePromos()    { return LIVE ? LIVE_D.promos        : (typeof PROMOS !== 'undefined' ? PROMOS : {}); }
function getLiveAddresses() { return LIVE ? (LIVE_D.addresses || []) : (typeof loadAddresses !== 'undefined' ? loadAddresses() : []); }
function getLiveStores()        { return LIVE ? (LIVE_D.stores        || []) : []; }
function getLiveStoreId()       { return LIVE ? (LIVE_D.storeId       ?? null) : null; }
function getLiveShippingTiers()  { return LIVE ? (LIVE_D.shippingTiers  || []) : []; }
function getLiveShippingPromos() { return LIVE ? (LIVE_D.shippingPromos || []) : []; }
function getLiveOrderPromos()    { return LIVE ? (LIVE_D.orderPromos    || []) : []; }

const GEO_CACHE_KEY  = 'laboong_geo_v1';
const CART_STATE_KEY = 'laboong_cart_v2';

function loadCartState() {
  try {
    const raw = localStorage.getItem(CART_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function saveCartState(lines, note) {
  try {
    localStorage.setItem(CART_STATE_KEY, JSON.stringify({ lines, note }));
  } catch (e) { /* ignore */ }
}

function clearCartState() {
  try { localStorage.removeItem(CART_STATE_KEY); } catch (e) { /* ignore */ }
}

function getMapboxToken() { return window.MENU_PAGE_DATA?.mapboxToken || ''; }

async function geocodeAddress(text) {
  try {
    const cache = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
    if (cache[text]) return cache[text];
  } catch(e) { /* ignore */ }

  const q   = encodeURIComponent(text);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json`
    + `?country=VN&language=vi&limit=1&access_token=${getMapboxToken()}`;
  const res  = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const data = await res.json();
  if (!data.features?.length) return null;
  const [lng, lat] = data.features[0].center;
  const loc = { lat, lng };
  try {
    const cache = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
    cache[text] = loc;
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch(e) { /* ignore */ }
  return loc;
}

function distRangeLabel(km) {
  return km < 1 ? 'dưới 1km' : `trên ${Math.floor(km)}km`;
}

function calcShippingFee(distKm, tiers) {
  if (!tiers.length) return 0;
  const sorted = [...tiers].sort((a, b) => a.min_km - b.min_km);
  for (const t of sorted) {
    if (distKm >= t.min_km && (t.max_km === null || distKm < t.max_km)) return t.fee;
  }
  return sorted[sorted.length - 1].fee;
}

function haversineDist(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* In LIVE mode, build variant groups from PHP data.
   In demo mode, derive from static VARIANT_GROUPS if defined, else use an
   empty array (the customize sheet is hidden for demo-mode topping items). */
function getLiveVariantGroups() {
  if (LIVE) return LIVE_D.variantGroups || [];
  return typeof VARIANT_GROUPS !== 'undefined' ? VARIANT_GROUPS : [];
}

/* ─── Voucher discount calculation ─────────────────────────────── */
function calcVoucherDiscount(v, base) {
  if (!v) return 0;
  if (base < (v.min_purchase || 0)) return 0;
  if (v.discount_type === 'percentage') {
    let d = Math.floor(base * v.discount_value / 100);
    if (v.max_discount) d = Math.min(d, v.max_discount);
    return d;
  }
  return Math.min(v.discount_value, base);
}

function calcShipPromoDiscount(p, shipFee, subtotal, dist) {
  if (!p || shipFee === 0) return 0;
  if (subtotal < p.min_order_amount) return 0;
  if (p.max_km !== null && dist !== null && dist > p.max_km) return 0;
  if (p.discount_type === 'free')    return shipFee;
  if (p.discount_type === 'percent') return Math.floor(shipFee * p.discount_value / 100);
  return Math.min(p.discount_value, shipFee);
}

function calcOrderPromoDiscount(p, subtotal) {
  if (!p) return 0;
  if (subtotal < (p.min_purchase || 0)) return 0;
  if (p.type === 'percent') {
    let d = Math.floor(subtotal * p.value / 100);
    if (p.max_discount) d = Math.min(d, p.max_discount);
    return d;
  }
  return Math.min(p.value, subtotal);
}

/* ─── Line item helpers ─────────────────────────────────────────── */
function lineKey(l) {
  if (l.selections) {
    const parts = Object.entries(l.selections)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${Array.isArray(v) ? [...v].sort().join(',') : (v ?? '-')}`)
      .join('|');
    return `${l.id}|${parts}`;
  }
  /* legacy demo line format */
  const tops = (l.toppings || []).map(t => t.id).sort().join(",");
  return `${l.id}|z${l.size || "-"}|s${l.sugar || "-"}|i${l.ice || "-"}|t${tops}`;
}

function optsText(l, variantGroups) {
  if (l.selections && variantGroups && variantGroups.length) {
    const parts = [];
    variantGroups.forEach(g => {
      const val = l.selections[g.key];
      if (val === undefined || val === null) return;
      if (Array.isArray(val)) {
        if (val.length) {
          const names = val.map(id => g.options.find(o => o.id === id)?.label || id);
          parts.push(names.join(', '));
        }
      } else {
        const opt     = g.options.find(o => o.id === val);
        const defOpt  = g.options.find(o => o.def);
        if (opt && opt.id !== defOpt?.id) parts.push(`${g.label}: ${opt.label}`);
      }
    });
    return parts.join(' · ');
  }
  /* legacy demo */
  const parts = [];
  if (l.size && l.size !== "M") parts.push(`Size ${l.size}`);
  if (l.sugar) parts.push(`Đường ${l.sugar}`);
  if (l.ice) parts.push(`Đá ${l.ice}`);
  if (l.toppings && l.toppings.length) parts.push(l.toppings.map(t => t.name).join(", "));
  return parts.join(" · ");
}

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);

  const [liveCats,          ] = useState(getLiveCats);
  const [liveMenu,          ] = useState(getLiveMenu);
  const [liveTagMeta,       ] = useState(getLiveTagMeta);
  const [liveStore,         ] = useState(getLiveStore);
  const [livePerPoint,      ] = useState(getLivePerPoint);
  const [variantGroups,     ] = useState(getLiveVariantGroups);

  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState(() => liveCats[0]?.key || "");
  const [lines, setLines] = useState(() => loadCartState()?.lines || []);
  const [customize, setCustomize] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderErr, setOrderErr] = useState("");
  const [actualPts, setActualPts] = useState(0);
  const [note, setNote] = useState(() => loadCartState()?.note || "");

  /* ─── discount state ─── */
  const [orderVoucher,      setOrderVoucher]      = useState(null); // personal ORDER voucher from wallet
  const [selectedOrderPromo,setSelectedOrderPromo]= useState(null); // ORDER promo from Quản lý khuyến mãi
  const [shippingVoucher,   setShippingVoucher]   = useState(null); // personal SHIPPING voucher from wallet
  const [selectedShipPromo, setSelectedShipPromo] = useState(null); // ShippingPromotion rule
  const [cartVouchers,    setCartVouchers]    = useState({ order: [], shipping: [], redemptions: [] }); // fetched from server
  const [couponView,      setCouponView]      = useState(false);
  const [couponErr,       setCouponErr]       = useState("");
  const [vouchersLoading, setVouchersLoading] = useState(false);

  const [addresses, setAddresses] = useState(getLiveAddresses);
  const [addrId, setAddrId] = useState(null);
  const [addrView, setAddrView] = useState(false);
  const [liveStores,        ] = useState(getLiveStores);
  const [liveShippingTiers,  ] = useState(getLiveShippingTiers);
  const [liveShippingPromos, ] = useState(getLiveShippingPromos);
  const [liveOrderPromos,    ] = useState(getLiveOrderPromos);
  const [selectedStoreId, setSelectedStoreId] = useState(getLiveStoreId);
  const [storeView,  setStoreView]  = useState(false);
  const [storeViewMode, setStoreViewMode] = useState("pickup"); // "pickup" | "delivery"
  const [userLoc,    setUserLoc]    = useState(null);
  const [addrGeoCache, setAddrGeoCache] = useState({});
  const grpRefs = useRef({});

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  /* persist cart to localStorage */
  useEffect(() => {
    if (lines.length === 0 && !note) {
      clearCartState();
    } else {
      saveCartState(lines, note);
    }
  }, [lines, note]);

  /* set default address */
  useEffect(() => {
    const def = addresses.find(a => a.def) || addresses[0];
    setAddrId(def ? def.id : "pickup");
  }, []);  // eslint-disable-line

  useEffect(() => {
    const h = e => { if (e.key === "Escape") { setCustomize(null); setDrawer(false); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  /* geocode delivery address when selected */
  useEffect(() => {
    if (!selectedAddr || addrId === 'pickup') return;
    const id = selectedAddr.id;
    if (addrGeoCache[id]) return;
    // Use saved coordinates from profile map if available
    if (selectedAddr.lat && selectedAddr.lng) {
      setAddrGeoCache(c => ({ ...c, [id]: { geocoding: false, lat: selectedAddr.lat, lng: selectedAddr.lng } }));
      return;
    }
    setAddrGeoCache(c => ({ ...c, [id]: { geocoding: true, lat: null, lng: null } }));
    geocodeAddress(selectedAddr.text)
      .then(loc => setAddrGeoCache(c => ({ ...c, [id]: loc ? { geocoding: false, ...loc } : { geocoding: false, lat: null, lng: null } })))
      .catch(()  => setAddrGeoCache(c => ({ ...c, [id]: { geocoding: false, lat: null, lng: null } })));
  }, [addrId]); // eslint-disable-line

  /* request geolocation once storeView opens */
  useEffect(() => {
    if (!storeView || userLoc || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 6000 }
    );
  }, [storeView]); // eslint-disable-line

  /* fetch cart vouchers when coupon view opens */
  useEffect(() => {
    if (!couponView || !LIVE) return;
    setVouchersLoading(true);
    fetch('/cart/vouchers', {
      headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '' },
    })
      .then(r => r.json())
      .then(data => setCartVouchers({ order: data.order || [], shipping: data.shipping || [], redemptions: data.redemptions || [] }))
      .catch(() => {})
      .finally(() => setVouchersLoading(false));
  }, [couponView]); // eslint-disable-line

  const addLine = (line) => {
    const key = lineKey(line);
    setLines(ls => {
      const i = ls.findIndex(l => l.key === key);
      if (i >= 0) { const next = [...ls]; next[i] = { ...next[i], qty: next[i].qty + line.qty }; return next; }
      return [...ls, { ...line, key }];
    });
    setCustomize(null);
  };

  const changeQty = (key, delta) => setLines(ls => ls.flatMap(l => {
    if (l.key !== key) return [l];
    const nq = l.qty + delta;
    return nq <= 0 ? [] : [{ ...l, qty: nq }];
  }));

  /* simple add for topping-category items (no customize sheet) */
  const addSimple = (m, delta) => {
    const key = `${m.id}|simple`;
    setLines(ls => {
      const i = ls.findIndex(l => l.key === key);
      if (i >= 0) {
        const nq = ls[i].qty + delta;
        const next = [...ls];
        if (nq <= 0) { next.splice(i, 1); return next; }
        next[i] = { ...next[i], qty: nq };
        return next;
      }
      if (delta <= 0) return ls;
      const effectivePrice = m.salePrice != null ? m.salePrice : m.price;
      return [...ls, { key, id: m.id, name: m.name, base: effectivePrice, origPrice: m.salePrice != null ? m.price : null, grad: m.grad, img: m.img || null, cat: m.cat, unit: effectivePrice, qty: delta }];
    });
  };

  const filtered = useMemo(() => {
    if (!q.trim()) return liveMenu;
    const s = q.toLowerCase();
    return liveMenu.filter(m => m.name.toLowerCase().includes(s) || (m.desc || '').toLowerCase().includes(s));
  }, [q, liveMenu]);

  const byCat = useMemo(() =>
    liveCats.map(c => ({ ...c, items: filtered.filter(m => m.cat === c.key) })).filter(c => c.items.length),
  [filtered, liveCats]);

  const qtyOfItem = (id) => lines.filter(l => l.id === id).reduce((s, l) => s + l.qty, 0);
  const count    = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);

  const selectedAddr  = addrId === "pickup" ? null : addresses.find(a => a.id === addrId);
  const selectedStore = liveStores.find(s => s.id === selectedStoreId) || liveStores[0] || null;

  /* shipping info: geocode delivery address, compute distance + fee */
  const geoInfo = useMemo(() => {
    if (!selectedAddr || addrId === 'pickup') return null;
    const cached = addrGeoCache[selectedAddr.id];
    if (!cached) return { geocoding: false, dist: null, fee: 0 };
    if (cached.geocoding) return { geocoding: true, dist: null, fee: 0 };
    if (!cached.lat || !selectedStore?.lat || !selectedStore?.lng) return { geocoding: false, dist: null, fee: 0 };
    const dist = haversineDist(cached.lat, cached.lng, selectedStore.lat, selectedStore.lng);
    const fee  = calcShippingFee(dist, liveShippingTiers);
    return { geocoding: false, dist, fee };
  }, [addrId, addrGeoCache, selectedStore, liveShippingTiers]); // eslint-disable-line

  const shipFee = geoInfo?.fee ?? 0;
  const dist    = geoInfo?.dist ?? null;

  const orderDiscount   = orderVoucher
    ? calcVoucherDiscount(orderVoucher, subtotal)
    : calcOrderPromoDiscount(selectedOrderPromo, subtotal);
  const shipDiscount    = shippingVoucher
    ? calcVoucherDiscount(shippingVoucher, shipFee)
    : calcShipPromoDiscount(selectedShipPromo, shipFee, subtotal, dist);
  const totalDiscount   = orderDiscount + shipDiscount;
  const payable         = Math.max(0, subtotal - orderDiscount + shipFee - shipDiscount);
  const earnPts       = Math.floor(payable / livePerPoint);

  /* Clear order voucher/promo if subtotal drops below min */
  useEffect(() => {
    if (orderVoucher && subtotal < (orderVoucher.min_purchase || 0)) setOrderVoucher(null);
    if (selectedOrderPromo && subtotal < (selectedOrderPromo.min_purchase || 0)) setSelectedOrderPromo(null);
  }, [subtotal]); // eslint-disable-line

  /* Clear selectedShipPromo if it becomes ineligible */
  useEffect(() => {
    if (!selectedShipPromo) return;
    if (subtotal < selectedShipPromo.min_order_amount) { setSelectedShipPromo(null); return; }
    if (selectedShipPromo.max_km !== null && dist !== null && dist > selectedShipPromo.max_km) setSelectedShipPromo(null);
  }, [subtotal, dist]); // eslint-disable-line

  const applyOrderVoucher = (v) => {
    if (subtotal < (v.min_purchase || 0)) { setCouponErr(`Áp dụng cho đơn từ ${fmt(v.min_purchase)}đ`); return; }
    setOrderVoucher(v); setSelectedOrderPromo(null); setCouponErr(""); setCouponView(false);
  };

  const applyOrderPromo = (p) => {
    if (subtotal < (p.min_purchase || 0)) { setCouponErr(`Áp dụng cho đơn từ ${fmt(p.min_purchase)}đ`); return; }
    setSelectedOrderPromo(p); setOrderVoucher(null); setCouponErr(""); setCouponView(false);
  };

  const applyShippingVoucher = (v) => {
    setShippingVoucher(v); setSelectedShipPromo(null); setCouponErr(""); setCouponView(false);
  };

  const applyShipPromo = (p) => {
    setSelectedShipPromo(p); setShippingVoucher(null); setCouponErr(""); setCouponView(false);
  };

  const clearShipDiscount = () => { setShippingVoucher(null); setSelectedShipPromo(null); };

  const jumpCat = (key) => {
    setActiveCat(key);
    const el = grpRefs.current[key];
    if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 124; window.scrollTo({ top: y, behavior: "smooth" }); }
  };

  const reset = () => {
    clearCartState();
    setLines([]); setPlaced(false); setDrawer(false); setNote(""); setOrderErr("");
    setOrderVoucher(null); setSelectedOrderPromo(null); setShippingVoucher(null); setSelectedShipPromo(null);
    setCouponView(false); setCouponErr("");
    setStoreView(false); setAddrView(false);
    setActualPts(0);
  };

  const checkout = async () => {
    if (placing) return;
    setOrderErr("");

    if (!LIVE) { setActualPts(earnPts); setPlaced(true); return; }

    setPlacing(true);
    try {
      const res = await fetch(LIVE_D.urls?.placeOrder, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          lines: lines.map(l => ({ id: l.id, qty: l.qty, selections: l.selections || null })),
          note: note || null,
          voucher_id:          orderVoucher?.id       || null,
          order_promo_id:      selectedOrderPromo?.id || null,
          shipping_voucher_id: shippingVoucher?.id    || null,
          ship_promo_id:       selectedShipPromo?.id  || null,
          store_id: selectedStoreId || null,
          shipping_fee: shipFee || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Có lỗi xảy ra');
      setActualPts(json.points_earned ?? earnPts);
      setPlaced(true);
    } catch (e) {
      setOrderErr(e.message);
    } finally {
      setPlacing(false);
    }
  };

  const addrIcon = (label) => label === "Công ty" ? "building" : label === "Khác" ? "pin" : "home";
  const pickupLabel   = selectedStore ? selectedStore.name : ('Laboong ' + liveStore);

  const sortedStores = useMemo(() => {
    if (!userLoc) return liveStores;
    return [...liveStores].sort((a, b) => {
      const da = (a.lat && a.lng) ? haversineDist(userLoc.lat, userLoc.lng, a.lat, a.lng) : Infinity;
      const db = (b.lat && b.lng) ? haversineDist(userLoc.lat, userLoc.lng, b.lat, b.lng) : Infinity;
      return da - db;
    });
  }, [liveStores, userLoc]); // eslint-disable-line

  /* helper: render a voucher card in coupon view */
  const VoucherCard = ({ v, onApply, isSelected, base }) => {
    const disc = calcVoucherDiscount(v, base);
    const ok = disc > 0 || base === 0;
    const notEnough = (v.min_purchase || 0) > base;
    return (
      <button className={"vopt" + (isSelected ? " on" : "")} disabled={notEnough} onClick={() => onApply(v)}>
        <span className="vi" style={{ background: isSelected ? "var(--brand)" : "linear-gradient(135deg,#FF8A5B,#FF6FA5)" }}>
          <Icon name="ticket" size={20} color="#fff" />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="vn">{v.name}</div>
          <div className="vd">
            {v.discount_type === 'percentage'
              ? `Giảm ${v.discount_value}%` + (v.max_discount ? ` (tối đa ${fmt(v.max_discount)}đ)` : '')
              : `Giảm ${fmt(v.discount_value)}đ`}
            {v.min_purchase ? ` · Đơn từ ${fmt(v.min_purchase)}đ` : ''}
          </div>
          {v.valid_until && <div className="vd" style={{ color: "var(--ink-3)" }}>HSD: {v.valid_until}</div>}
        </div>
        <span className="vgo">
          {notEnough
            ? `Còn thiếu ${fmt((v.min_purchase || 0) - base)}đ`
            : isSelected
              ? <><Icon name="check" size={14} /> Đang dùng</>
              : <>Dùng <Icon name="chev" size={14} /></>}
        </span>
      </button>
    );
  };

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <a className="back" href={NAV_URLS.home} title="Quay lại"><Icon name="arrowleft" size={20} /></a>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="hdr-title">Thực đơn</div>
            <div className="hdr-sub">Đặt món & tích điểm ngay</div>
          </div>
          <a className="hdr-store" href={NAV_URLS.store}><span className="pin"><Icon name="pin" size={15} color="currentColor" /></span> {liveStore}</a>
        </div>
      </header>

      <main className="app">
        <div className="intro">
          <h1>Hôm nay uống gì? 🧋</h1>
          <p>Chọn món yêu thích — mỗi {fmt(livePerPoint)}đ tích 1 điểm.</p>
        </div>

        <div className="searchbar">
          <Icon name="search" size={19} color="var(--ink-3)" />
          <input placeholder="Tìm món: trà sữa, cà phê, đào…" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        <div className="cats">
          {liveCats.map(c => {
            const n = liveMenu.filter(m => m.cat === c.key).length;
            return (
              <button key={c.key} className={"cat" + (activeCat === c.key ? " on" : "")} onClick={() => jumpCat(c.key)}>
                <Icon name={c.ic} size={15} color="currentColor" /> {c.label} <span className="cc">{n}</span>
              </button>
            );
          })}
        </div>

        {byCat.length === 0 && (
          <div className="items"><div className="empty"><div className="ei"><Icon name="search" size={26} /></div>Không tìm thấy món nào khớp "{q}".</div></div>
        )}

        {byCat.map(c => (
          <section key={c.key} ref={el => grpRefs.current[c.key] = el}>
            <div className="grp-h"><span className="gi"><Icon name={c.ic} size={18} color="currentColor" /></span> {c.label}</div>
            <div className="items">
              {c.items.map(m => {
                const qty       = qtyOfItem(m.id);
                const isTopping = m.cat === "topping";
                return (
                  <div className="item" key={m.id}>
                    <div className="item-thumb" style={{ background: m.grad }}>
                      {m.img
                        ? <img src={m.img} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span className="ti"><Icon name="cup" size={34} color="#fff" /></span>
                      }
                      {qty > 0 && <span className="item-qty-badge">{qty}</span>}
                    </div>
                    <div className="item-body">
                      {m.tags && m.tags.length > 0 && (
                        <div className="item-tags">
                          {m.tags.map(t => {
                            const meta = liveTagMeta[t];
                            if (!meta) return null;
                            return <span key={t} className={"tg " + t}><Icon name={meta.ic} size={10} color="currentColor" /> {meta.l}</span>;
                          })}
                        </div>
                      )}
                      <div className="item-name">{m.name}</div>
                      <div className="item-desc">{m.desc}</div>
                      <div className="item-foot">
                        <div className="item-price-wrap">
                          {m.salePrice != null ? (
                            <>
                              <span className="item-price tnum" style={{ textDecoration: "line-through", color: "var(--ink-3)", fontSize: 12, fontWeight: 500 }}>{fmt(m.price)}đ</span>
                              <span className="item-price tnum" style={{ color: "var(--danger)", fontWeight: 800 }}>{fmt(m.salePrice)}đ</span>
                              <span style={{ fontSize: 11, fontWeight: 800, background: "var(--danger)", color: "#fff", borderRadius: 5, padding: "1px 6px", marginLeft: 2 }}>{m.promoLabel}</span>
                            </>
                          ) : (
                            <span className="item-price tnum">{fmt(m.price)}đ</span>
                          )}
                        </div>
                        {isTopping
                          ? (qty === 0
                              ? <button className="add-btn" onClick={() => addSimple(m, 1)} aria-label="Thêm"><Icon name="plus" size={18} color="#fff" /></button>
                              : <div className="stepper">
                                  <button onClick={() => addSimple(m, -1)}><Icon name="minus" size={16} color="currentColor" /></button>
                                  <span className="qn">{qty}</span>
                                  <button onClick={() => addSimple(m, 1)}><Icon name="plus" size={16} color="currentColor" /></button>
                                </div>)
                          : <button className="add-btn" onClick={() => setCustomize(m.salePrice != null ? { ...m, price: m.salePrice, origPrice: m.price } : m)} aria-label="Tuỳ chỉnh & thêm"><Icon name="plus" size={18} color="#fff" /></button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* customize sheet */}
      {customize && (
        <CustomizeSheet
          item={customize}
          variantGroups={variantGroups}
          onClose={() => setCustomize(null)}
          onAdd={addLine}
        />
      )}

      {/* sticky cart bar */}
      {count > 0 && !drawer && !customize && (
        <div className="cartbar" onClick={() => setDrawer(true)}>
          <div className="cb-ic"><Icon name="bag" size={22} color="#fff" /><span className="cb-badge">{count}</span></div>
          <div className="cb-info">
            <div className="cb-count">{count} món · +{fmt(earnPts)} điểm</div>
            <div className="cb-total tnum">{fmt(payable)}đ</div>
          </div>
          <button className="cb-go">Xem giỏ <Icon name="arrow" size={16} color="var(--brand-deep)" /></button>
        </div>
      )}

      {/* cart drawer */}
      {drawer && (
        <div className="scrim" onClick={() => setDrawer(false)}>
          <div className="cart" onClick={e => e.stopPropagation()}>
            {placed ? (
              <div className="ok-wrap">
                <div className="ok-ring"><div className="ck"><Icon name="check" size={28} color="#fff" /></div></div>
                <h3>Đặt hàng thành công! 🎉</h3>
                <p>{selectedAddr ? <>Đơn của bạn sẽ được giao đến<br /><b>{selectedAddr.text}</b></> : <>Đơn của bạn đang được pha chế tại<br /><b>{pickupLabel}</b>.</>}</p>
                <div className="ok-earn">
                  <span className="oi"><Icon name="coin" size={22} color="#fff" /></span>
                  <div><div className="ot">Bạn vừa tích được</div><div className="ov">+{fmt(actualPts)} điểm</div></div>
                </div>
                <button className="ok-btn" onClick={reset}>Đặt thêm món khác</button>
              </div>
            ) : couponView ? (
              <>
                <div className="cp-h">
                  <button className="cp-back" onClick={() => { setCouponView(false); setCouponErr(""); }}><Icon name="arrowleft" size={18} /></button>
                  <h3>Voucher của bạn</h3>
                </div>
                <div className="cp-b">
                  {vouchersLoading ? (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--ink-3)", fontSize: 13 }}>Đang tải voucher…</div>
                  ) : (<>
                    {/* ORDER vouchers + order promos from admin */}
                    <div className="cp-sec">Voucher giảm đơn hàng</div>
                    {cartVouchers.order.length === 0 && liveOrderPromos.length === 0 ? (
                      <div className="cp-empty">
                        Chưa có voucher giảm đơn. Tích điểm và đổi quà tại{" "}
                        <a href="/profile#rewards" style={{ color: "var(--brand)", fontWeight: 600 }}>Đổi quà</a>!
                      </div>
                    ) : (
                      <div className="vlist">
                        {/* Personal ORDER vouchers from wallet */}
                        {cartVouchers.order.map(v => (
                          <VoucherCard key={v.id} v={v} onApply={applyOrderVoucher}
                            isSelected={orderVoucher?.id === v.id} base={subtotal} />
                        ))}
                        {/* Admin-created order promos from Quản lý khuyến mãi */}
                        {liveOrderPromos.map(p => {
                          const notEnough  = subtotal < (p.min_purchase || 0);
                          const saving     = calcOrderPromoDiscount(p, subtotal);
                          const isSelected = selectedOrderPromo?.id === p.id;
                          return (
                            <button key={p.id}
                              className={"vopt" + (isSelected ? " on" : "")}
                              disabled={notEnough}
                              onClick={() => applyOrderPromo(p)}
                            >
                              <span className="vi" style={{ background: isSelected ? "var(--brand)" : "linear-gradient(135deg,#FF8A5B,#FF6FA5)" }}>
                                <Icon name="ticket" size={20} color="#fff" />
                              </span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="vn">{p.name}</div>
                                <div className="vd">
                                  {p.badge}
                                  {p.max_discount ? ` (tối đa ${fmt(p.max_discount)}đ)` : ''}
                                  {p.min_purchase > 0 ? ` · Đơn từ ${fmt(p.min_purchase)}đ` : ''}
                                </div>
                                {p.valid_until && <div className="vd" style={{ color: "var(--ink-3)" }}>HSD: {p.valid_until}</div>}
                                {notEnough && (
                                  <div style={{ fontSize: 11, color: "var(--hot)", marginTop: 2 }}>
                                    Còn thiếu {fmt((p.min_purchase || 0) - subtotal)}đ
                                  </div>
                                )}
                              </div>
                              {!notEnough && saving > 0 && (
                                <span className="vgo" style={{ color: "var(--pink)" }}>
                                  {isSelected
                                    ? <><Icon name="check" size={14} /> Đang dùng</>
                                    : <>−{fmt(saving)}đ <Icon name="chev" size={14} /></>}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Redeemed gifts */}
                    {cartVouchers.redemptions.length > 0 && (<>
                      <div className="cp-sec">Quà Đã Đổi</div>
                      <div className="vlist">
                        {cartVouchers.redemptions.map(r => {
                          const typeLabel = {
                            discount_voucher: 'Voucher giảm giá',
                            free_item:        'Sản phẩm miễn phí',
                            tier_upgrade:     'Nâng hạng',
                            other:            'Quà tặng',
                          }[r.reward_type] ?? 'Quà tặng';
                          const typeColor = {
                            discount_voucher: 'linear-gradient(135deg,#FF8A5B,#FF6FA5)',
                            free_item:        'linear-gradient(135deg,#0F623F,#1AA86A)',
                            tier_upgrade:     'linear-gradient(135deg,#6B4FA0,#9B7FD0)',
                            other:            'linear-gradient(135deg,#7A4A28,#B87045)',
                          }[r.reward_type] ?? 'linear-gradient(135deg,#7A4A28,#B87045)';
                          return (
                            <div key={r.id} className="vopt" style={{ cursor: 'default', opacity: 1 }}>
                              {r.image_url ? (
                                <img src={r.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                              ) : (
                                <span className="vi" style={{ background: typeColor }}>
                                  <Icon name="gift" size={20} color="#fff" />
                                </span>
                              )}
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="vn">{r.name}</div>
                                <div className="vd">{typeLabel} · {r.points_spent} điểm</div>
                                {r.expires_at && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>HSD: {r.expires_at}</div>}
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: r.status === 'approved' ? '#0F623F20' : '#FFA50020', color: r.status === 'approved' ? 'var(--brand)' : '#E07000', whiteSpace: 'nowrap' }}>
                                {r.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>)}

                    {/* SHIPPING vouchers + promo rules — always show */}
                    <div className="cp-sec">Voucher giảm phí ship</div>
                    {shipFee === 0 && addrId === "pickup" && (
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8, padding: "0 2px" }}>
                        Chọn giao hàng và nhập địa chỉ để áp dụng ưu đãi phí ship.
                      </div>
                    )}
                    {cartVouchers.shipping.length === 0 && liveShippingPromos.length === 0 ? (
                      <div className="cp-empty">Bạn chưa có voucher giảm phí ship.</div>
                    ) : (
                      <div className="vlist">
                        {/* Personal shipping vouchers from wallet */}
                        {cartVouchers.shipping.map(v => (
                          <VoucherCard key={v.id} v={v} onApply={applyShippingVoucher}
                            isSelected={shippingVoucher?.id === v.id} base={shipFee} />
                        ))}
                        {/* Admin shipping promo rules — selectable */}
                        {liveShippingPromos.map(p => {
                          const ineligibleAmt = subtotal < p.min_order_amount;
                          const ineligibleKm  = p.max_km !== null && dist !== null && dist > p.max_km;
                          const notEligible   = ineligibleAmt || ineligibleKm;
                          const saving        = calcShipPromoDiscount(p, shipFee, subtotal, dist);
                          const isSelected    = selectedShipPromo?.id === p.id;
                          return (
                            <button key={p.id}
                              className={"vopt" + (isSelected ? " on" : "")}
                              disabled={notEligible}
                              onClick={() => applyShipPromo(p)}
                            >
                              <span className="vi" style={{ background: isSelected ? "var(--brand)" : "linear-gradient(135deg,#1E8FA8,#4FC3D9)" }}>
                                <Icon name="truck" size={20} color="#fff" />
                              </span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="vn">{p.name}</div>
                                <div className="vd">
                                  {p.badge}
                                  {p.min_order_amount > 0 ? ` · Đơn từ ${fmt(p.min_order_amount)}đ` : ''}
                                  {p.max_km !== null ? ` · Trong ${p.max_km}km` : ''}
                                </div>
                                {notEligible && (
                                  <div style={{ fontSize: 11, color: "var(--hot)", marginTop: 2 }}>
                                    {ineligibleAmt ? `Đơn tối thiểu ${fmt(p.min_order_amount)}đ` : `Chỉ trong bán kính ${p.max_km}km`}
                                  </div>
                                )}
                              </div>
                              {!notEligible && saving > 0 && (
                                <span style={{ color: "var(--brand)", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
                                  −{fmt(saving)}đ
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>)}
                </div>
              </>
            ) : storeView ? (
              <>
                <div className="cp-h">
                  <button className="cp-back" onClick={() => setStoreView(false)}><Icon name="arrowleft" size={18} /></button>
                  <h3>Chọn chi nhánh</h3>
                </div>
                <div className="cp-b">
                  {!userLoc && (
                    <div style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--bg-2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--ink-3)" }}>
                      <Icon name="pin" size={14} color="currentColor" />
                      Cho phép vị trí để xem khoảng cách tới từng chi nhánh.
                    </div>
                  )}
                  <div className="vlist">
                    {sortedStores.map(s => {
                      const dist = (userLoc && s.lat && s.lng)
                        ? haversineDist(userLoc.lat, userLoc.lng, s.lat, s.lng)
                        : null;
                      const distLabel = dist !== null
                        ? (dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`)
                        : null;
                      return (
                        <button key={s.id}
                          className={"aopt" + (selectedStoreId === s.id ? " on" : "")}
                          onClick={() => { setSelectedStoreId(s.id); if (storeViewMode === "pickup") setAddrId("pickup"); setStoreView(false); }}>
                          <span className="ai"><Icon name="pin" size={19} color="currentColor" /></span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="albl">
                              <span className="atag">{s.name}</span>
                              {distLabel && <span className="adef" style={{ color: "var(--brand)" }}>{distLabel}</span>}
                            </div>
                            <div className="atext">{s.address}</div>
                            <div className="atext" style={{ color: "var(--ink-3)" }}>{s.open?.slice(0,5)} – {s.close?.slice(0,5)}</div>
                          </div>
                          <span className="aradio" />
                        </button>
                      );
                    })}
                    {sortedStores.length === 0 && (
                      <div className="cp-empty">Không có chi nhánh nào đang hoạt động.</div>
                    )}
                  </div>
                </div>
              </>
            ) : addrView ? (
              <>
                <div className="cp-h">
                  <button className="cp-back" onClick={() => setAddrView(false)}><Icon name="arrowleft" size={18} /></button>
                  <h3>Chọn nơi nhận hàng</h3>
                </div>
                <div className="cp-b">
                  <div className="cp-sec">Giao đến địa chỉ</div>
                  <div className="vlist">
                    {addresses.map(a => (
                      <button key={a.id} className={"aopt" + (addrId === a.id ? " on" : "")} onClick={() => { setAddrId(a.id); setAddrView(false); }}>
                        <span className="ai"><Icon name={addrIcon(a.label)} size={19} color="currentColor" /></span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="albl"><span className="atag">{a.label}</span>{a.def && <span className="adef">Mặc định</span>}</div>
                          <div className="atext">{a.text}</div>
                        </div>
                        <span className="aradio" />
                      </button>
                    ))}
                    {addresses.length === 0 && <div className="cp-empty">Bạn chưa có địa chỉ nào. Thêm địa chỉ trong mục Hồ sơ.</div>}
                  </div>

                  <div className="cp-sec">Hoặc</div>
                  <button className={"aopt pickup" + (addrId === "pickup" ? " on" : "")}
                    onClick={() => { setAddrId("pickup"); setAddrView(false); if (liveStores.length > 1) { setStoreViewMode("pickup"); setStoreView(true); } }}>
                    <span className="ai"><Icon name="bag" size={19} color="currentColor" /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="albl"><span className="atag">Nhận tại quầy</span></div>
                      <div className="atext">{pickupLabel}</div>
                    </div>
                    <span className="aradio" />
                  </button>

                  <a className="manage-addr" href={NAV_URLS.profile}><Icon name="plus2" size={15} color="currentColor" /> Quản lý địa chỉ trong Hồ sơ</a>
                </div>
              </>
            ) : (<>
              <div className="cart-h">
                <div>
                  <h3>Giỏ hàng</h3>
                  <div className="ch-sub">{liveStore} · {count} món</div>
                </div>
                <button className="cart-x" onClick={() => setDrawer(false)}><Icon name="close" size={18} /></button>
              </div>
              {count === 0 ? (
                <div className="cart-empty"><div className="cei"><Icon name="bag" size={26} /></div>Giỏ hàng trống. Hãy chọn món bạn thích nhé!</div>
              ) : (<>
                <div className="cart-b">
                  <button className="deliv" onClick={() => selectedAddr ? setAddrView(true) : (liveStores.length > 1 ? setStoreView(true) : setAddrView(true))}>
                    <span className="di"><Icon name={selectedAddr ? addrIcon(selectedAddr.label) : "pin"} size={19} color="currentColor" /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {selectedAddr ? (<>
                        <div className="dl">Giao đến <span className="dtag">{selectedAddr.label}</span>{selectedAddr.def && <span className="dtag" style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}>Mặc định</span>}</div>
                        <div className="dt">{selectedAddr.text}</div>
                        {liveStores.length > 0 && (
                          <div className="dt" style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                            <Icon name="pin" size={12} color="var(--ink-3)" />
                            <span style={{ color: "var(--ink-3)", fontSize: 12.5 }}>Từ</span>
                            <button onClick={e => { e.stopPropagation(); setStoreViewMode("delivery"); setStoreView(true); }} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--brand)", textDecoration: "underline", textDecorationStyle: "dashed", textUnderlineOffset: 3 }}>
                              {selectedStore ? selectedStore.name : "Chọn chi nhánh"}
                            </button>
                          </div>
                        )}
                      </>) : (<>
                        <div className="dl">Nhận tại quầy</div>
                        <div className="dt">{pickupLabel}</div>
                      </>)}
                    </div>
                    <span className="dchev"><Icon name="chev" size={18} /></span>
                  </button>
                  {lines.map(l => (
                    <div className="crow" key={l.key}>
                      <div className="cthumb" style={{ background: l.grad }}>
                        {l.img
                          ? <img src={l.img} alt={l.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                          : <Icon name="cup" size={22} color="#fff" />
                        }
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="cn">{l.name}</div>
                        {optsText(l, variantGroups) && <div className="copts">{optsText(l, variantGroups)}</div>}
                        <div className="cp">
                          {l.origPrice != null && (
                            <span style={{ textDecoration: "line-through", color: "var(--ink-3)", fontSize: 11, marginRight: 5 }}>{fmt(l.origPrice)}đ</span>
                          )}
                          {fmt(l.unit)}đ
                        </div>
                      </div>
                      <div className="cstep">
                        <button onClick={() => changeQty(l.key, -1)}><Icon name="minus" size={15} color="currentColor" /></button>
                        <span className="qn">{l.qty}</span>
                        <button onClick={() => changeQty(l.key, 1)}><Icon name="plus" size={15} color="currentColor" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="cart-note">
                    <input placeholder="Ghi chú cho quán (giao tận bàn, ít đá…)" value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                </div>
                <div className="cart-f">
                  {/* Applied vouchers row or trigger */}
                  {(orderVoucher || selectedOrderPromo || shippingVoucher || selectedShipPromo) ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
                      {orderVoucher && (
                        <div className="coupon-applied">
                          <span className="cai"><Icon name="ticket" size={17} color="#fff" /></span>
                          <div style={{ minWidth: 0 }}>
                            <div className="can">{orderVoucher.name}</div>
                            <div className="cac">{orderVoucher.code}</div>
                          </div>
                          <span className="cav">−{fmt(orderDiscount)}đ</span>
                          <button className="cax" onClick={() => setOrderVoucher(null)} title="Bỏ voucher"><Icon name="close" size={16} /></button>
                        </div>
                      )}
                      {selectedOrderPromo && (
                        <div className="coupon-applied">
                          <span className="cai"><Icon name="ticket" size={17} color="#fff" /></span>
                          <div style={{ minWidth: 0 }}>
                            <div className="can">{selectedOrderPromo.name}</div>
                            <div className="cac">Khuyến mãi đơn hàng</div>
                          </div>
                          <span className="cav">−{fmt(orderDiscount)}đ</span>
                          <button className="cax" onClick={() => setSelectedOrderPromo(null)} title="Bỏ khuyến mãi"><Icon name="close" size={16} /></button>
                        </div>
                      )}
                      {(shippingVoucher || selectedShipPromo) && (
                        <div className="coupon-applied" style={{ background: "var(--brand-soft)" }}>
                          <span className="cai" style={{ background: "var(--brand)" }}><Icon name="truck" size={17} color="#fff" /></span>
                          <div style={{ minWidth: 0 }}>
                            <div className="can">{shippingVoucher ? shippingVoucher.name : selectedShipPromo.name}</div>
                            <div className="cac">Giảm phí ship</div>
                          </div>
                          <span className="cav" style={{ color: "var(--brand-ink)" }}>−{fmt(shipDiscount)}đ</span>
                          <button className="cax" onClick={clearShipDiscount} title="Bỏ ưu đãi"><Icon name="close" size={16} /></button>
                        </div>
                      )}
                      <button className="coupon-trigger" style={{ marginTop: 2 }}
                        onClick={() => { setCouponView(true); setCouponErr(""); }}>
                        <span className="cti"><Icon name="plus" size={15} color="currentColor" /></span>
                        Thêm / đổi voucher
                        <span className="ctchev"><Icon name="chev" size={17} /></span>
                      </button>
                    </div>
                  ) : (
                    <button className="coupon-trigger" onClick={() => { setCouponView(true); setCouponErr(""); }}>
                      <span className="cti"><Icon name="ticket" size={17} color="currentColor" /></span>
                      Áp mã giảm giá / Voucher
                      <span className="ctchev"><Icon name="chev" size={17} /></span>
                    </button>
                  )}
                  <div className="csum"><span>Tạm tính</span><span className="v tnum">{fmt(subtotal)}đ</span></div>
                  {orderDiscount > 0 && <div className="csum" style={{ color: "var(--pink)" }}><span>{selectedOrderPromo ? selectedOrderPromo.name : "Giảm đơn hàng"}</span><span className="v tnum" style={{ color: "var(--pink)" }}>−{fmt(orderDiscount)}đ</span></div>}
                  {geoInfo?.dist != null && (
                    <div className="csum" style={{ color: "var(--ink-3)", fontSize: 13 }}>
                      <span>Khoảng cách</span>
                      <span className="v">{distRangeLabel(geoInfo.dist)}</span>
                    </div>
                  )}
                  {geoInfo?.geocoding && (
                    <div className="csum" style={{ color: "var(--ink-3)", fontSize: 13 }}>
                      <span>Phí giao hàng</span><span className="v">Đang tính…</span>
                    </div>
                  )}
                  {!geoInfo?.geocoding && geoInfo !== null && (
                    <div className="csum" style={{ color: geoInfo.dist == null ? "var(--ink-3)" : geoInfo.fee === 0 ? "var(--brand)" : "var(--ink-1)" }}>
                      <span>Phí giao hàng</span>
                      <span className="v tnum">
                        {geoInfo.dist == null ? "Chưa xác định" : geoInfo.fee === 0 ? "Miễn phí" : `${fmt(geoInfo.fee)}đ`}
                      </span>
                    </div>
                  )}
                  {shipDiscount > 0 && (
                    <div className="csum" style={{ color: "var(--brand)" }}>
                      <span>{selectedShipPromo ? selectedShipPromo.name : "Giảm phí ship"}</span>
                      <span className="v tnum" style={{ color: "var(--brand)" }}>−{fmt(shipDiscount)}đ</span>
                    </div>
                  )}
                  <div className="csum earn"><span>Điểm tích được</span><span className="v">+{fmt(earnPts)} điểm</span></div>
                  <div className="csum total"><span>Tổng cộng</span><span className="v tnum">{fmt(payable)}đ</span></div>
                  {orderErr && <div className="cp-err" style={{ marginBottom: 6 }}><Icon name="alert" size={14} color="var(--hot)" /> {orderErr}</div>}
                  <button className="checkout" disabled={placing} onClick={checkout}>
                    {placing ? <span>Đang đặt…</span> : <><Icon name="check" size={18} color="#fff" /> Đặt hàng · {fmt(payable)}đ</>}
                  </button>
                </div>
              </>)}
            </>)}
          </div>
        </div>
      )}

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F", "#07432A"], ["#005A36", "#003D24"], ["#7A4A28", "#56331A"], ["#6B4FA0", "#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
