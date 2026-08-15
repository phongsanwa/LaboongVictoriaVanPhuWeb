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

async function geocodeAddress(text) {
  try {
    const cache = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
    if (cache[text]) return cache[text];
  } catch(e) { /* ignore */ }

  const maps = window.google?.maps;
  if (!maps) return null;
  const loc = await new Promise(resolve => {
    new maps.Geocoder().geocode({ address: text + ', Việt Nam', region: 'VN' }, (results, status) => {
      if (status === 'OK' && results?.length) {
        const l = results[0].geometry.location;
        resolve({ lat: l.lat(), lng: l.lng() });
      } else resolve(null);
    });
  });
  if (loc) {
    try {
      const cache = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
      cache[text] = loc;
      localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
    } catch(e) { /* ignore */ }
  }
  return loc;
}

/* Gợi ý địa chỉ khi gõ (Google Places AutocompleteService) */
async function fetchAddressSuggestions(text) {
  const maps = window.google?.maps;
  if (!maps?.places?.AutocompleteService || text.trim().length < 3) return [];
  return new Promise(resolve => {
    new maps.places.AutocompleteService().getPlacePredictions(
      { input: text, componentRestrictions: { country: 'vn' } },
      (predictions) => {
        if (!predictions?.length) { resolve([]); return; }
        resolve(predictions.slice(0, 5).map(p => ({
          text: p.description.replace(/,?\s*Việt Nam$/i, "").trim(),
          placeId: p.place_id,
        })));
      }
    );
  });
}

async function geocodePlaceId(placeId) {
  const maps = window.google?.maps;
  if (!maps) return null;
  return new Promise(resolve => {
    new maps.Geocoder().geocode({ placeId }, (results, status) => {
      if (status === 'OK' && results?.length) {
        const l = results[0].geometry.location;
        resolve({ lat: l.lat(), lng: l.lng() });
      } else resolve(null);
    });
  });
}

/* Khoảng cách ĐƯỜNG BỘ (xe máy) từ cửa hàng → địa chỉ giao, qua Google
   Distance Matrix (travelMode DRIVING — đi theo đường thực tế, không phải
   đường chim bay). Cache theo cặp toạ độ; trả null nếu API lỗi/chưa bật
   (khi đó dùng Haversine dự phòng). */
const ROUTE_DIST_CACHE_KEY = 'lb_route_dist_v1';
async function roadDistanceKm(origin, dest) {
  const key = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}|${dest.lat.toFixed(5)},${dest.lng.toFixed(5)}`;
  try {
    const cache = JSON.parse(localStorage.getItem(ROUTE_DIST_CACHE_KEY) || '{}');
    if (typeof cache[key] === 'number') return cache[key];
  } catch (e) { /* ignore */ }

  const maps = window.google?.maps;
  if (!maps?.DistanceMatrixService) return null;
  const km = await new Promise(resolve => {
    new maps.DistanceMatrixService().getDistanceMatrix({
      origins:      [new maps.LatLng(origin.lat, origin.lng)],
      destinations: [new maps.LatLng(dest.lat, dest.lng)],
      travelMode:   maps.TravelMode.DRIVING, // đường bộ — sát quãng đường xe máy thực tế
      unitSystem:   maps.UnitSystem.METRIC,
    }, (res, status) => {
      const el = res?.rows?.[0]?.elements?.[0];
      if (status === 'OK' && el?.status === 'OK' && el.distance?.value >= 0) {
        resolve(el.distance.value / 1000);
      } else {
        console.warn('DistanceMatrix không khả dụng (' + (el?.status || status) + ') — dùng khoảng cách đường chim bay');
        resolve(null);
      }
    });
  });
  if (km !== null) {
    try {
      const cache = JSON.parse(localStorage.getItem(ROUTE_DIST_CACHE_KEY) || '{}');
      cache[key] = km;
      localStorage.setItem(ROUTE_DIST_CACHE_KEY, JSON.stringify(cache));
    } catch (e) { /* ignore */ }
  }
  return km;
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

/* Filter global variantGroups to only the options a specific product has.
   item.variants = { SIZE: { M: {extra, available}, L: {...} }, TOPPING: {...} } */
function getProductVariantGroups(item, variantGroups) {
  // A product with no variant rows serializes as [] (empty JSON array) — fall
  // back to the global groups instead of hiding every option.
  if (!item.variants || Object.keys(item.variants).length === 0) return variantGroups;
  return variantGroups.map(g => {
    const productOpts = item.variants[g.key];
    if (!productOpts) return null; // product has no variants of this type
    const options = g.options
      .filter(o => productOpts[o.id] !== undefined)
      .map(o => ({ ...o, extra: productOpts[o.id].extra, available: productOpts[o.id].available, def: false }));
    if (options.length === 0) return null;
    // Re-apply default selection
    const availOpts = options.filter(o => o.available);
    const defaultId = g.options.find(o => o.def)?.id;
    if (defaultId && options.some(o => o.id === defaultId)) {
      options.forEach(o => { o.def = o.id === defaultId; });
    } else if (g.required && availOpts.length > 0) {
      options.forEach(o => { o.def = o.id === availOpts[0].id; });
    }
    return { ...g, options };
  }).filter(Boolean);
}

/* ─── Voucher discount calculation ─────────────────────────────── */
/* Tổng tiền topping khách đã chọn trong giỏ (voucher Freetopping chỉ áp khi > 0) */
function cartToppingTotal(cartLines) {
  const groups = getLiveVariantGroups().filter(g => g.type === 'addon');
  if (!groups.length) return 0;
  let total = 0;
  (cartLines || []).forEach(l => {
    if (!l.selections) return;
    groups.forEach(g => {
      const sel = l.selections[g.key];
      if (!Array.isArray(sel)) return;
      sel.forEach(id => {
        const opt = g.options.find(o => o.id === id);
        if (opt) total += (opt.extra || 0) * l.qty;
      });
    });
  });
  return total;
}

/* Miễn phí món BẤT KỲ (scope=any, có thể giới hạn size): danh sách đơn giá
   từng món đủ điều kiện (giá món trừ tiền topping), sắp xếp tăng dần.
   Món chưa chọn size được coi là size mặc định. */
function freeAnyEligibleUnits(v, cartLines) {
  const groups    = getLiveVariantGroups();
  const sizeGroup = groups.find(g => g.type === 'size');
  // Mặc định = option đánh dấu def, không có thì lấy size không phụ thu (0đ)
  const defaultSize = sizeGroup
    ? (sizeGroup.options.find(o => o.def)?.id ?? sizeGroup.options.find(o => !o.extra)?.id ?? null)
    : null;
  const addonGroups = groups.filter(g => g.type === 'addon');
  const units = [];
  (cartLines || []).forEach(l => {
    if (v.free_item_size && sizeGroup) {
      const lineSize = (l.selections && l.selections[sizeGroup.key]) || defaultSize;
      if (lineSize !== v.free_item_size) return;
    }
    let topPerUnit = 0;
    if (l.selections) {
      addonGroups.forEach(g => {
        const sel = l.selections[g.key];
        if (!Array.isArray(sel)) return;
        sel.forEach(id => {
          const opt = g.options.find(o => o.id === id);
          if (opt) topPerUnit += opt.extra || 0;
        });
      });
    }
    const unit = Math.max(0, (l.unit || 0) - topPerUnit);
    for (let i = 0; i < l.qty; i++) units.push(unit);
  });
  units.sort((a, b) => a - b);
  return units;
}

/* Mua X tặng Y: giỏ đủ X+Y món thì được trừ tiền Y món rẻ nhất */
function calcBuyGetDiscount(v, cartLines) {
  const buyQty  = Math.max(1, v.buy_quantity || 2);
  const freeQty = Math.max(1, v.free_item_quantity || 1);
  const units = [];
  (cartLines || []).forEach(l => { for (let i = 0; i < l.qty; i++) units.push(l.unit || 0); });
  if (units.length < buyQty + freeQty) return 0;
  units.sort((a, b) => a - b);
  return units.slice(0, freeQty).reduce((s, u) => s + u, 0);
}

function calcVoucherDiscount(v, base, cartLines) {
  if (!v) return 0;
  if (base < (v.min_purchase || 0)) return 0;
  if (v.discount_type === 'buy_get') return calcBuyGetDiscount(v, cartLines);
  if (v.discount_type === 'free_item') {
    if (v.free_item_scope === 'any') {
      // Miễn phí món bất kỳ (giới hạn size nếu có): trừ N món rẻ nhất đủ điều kiện
      const units = freeAnyEligibleUnits(v, cartLines);
      if (!units.length) return 0;
      const freeQty = Math.max(1, v.free_item_quantity || 1);
      return Math.min(units.slice(0, freeQty).reduce((s, u) => s + u, 0), base);
    }
    if (!v.free_item_product_id) {
      // Voucher Freetopping: chỉ áp khi trong món CÓ topping, và không giảm
      // quá số tiền topping thực tế trong giỏ
      const tops = cartToppingTotal(cartLines);
      if (tops <= 0) return 0;
      return Math.min(v.discount_value, tops, base);
    }
    const productCartId = 'p' + v.free_item_product_id;
    const cartLine = cartLines && cartLines.find(l => l.id === productCartId);
    if (!cartLine) return 0;
    // Cap at how many of the product the customer actually has in cart × unit price
    const unitPrice   = cartLine.unit || 0;
    const inCartValue = unitPrice > 0 ? cartLine.qty * unitPrice : v.discount_value;
    return Math.min(v.discount_value, inCartValue, base);
  }
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
          // Mảng có thể lặp id (số lượng topping) → gộp thành "Tên x2"
          const counts = {};
          val.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
          const names = Object.entries(counts).map(([id, n]) => {
            const label = g.options.find(o => o.id === id)?.label || id;
            return n > 1 ? `${label} x${n}` : label;
          });
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
  /* quick-add address form (right inside the cart) */
  const [addrFormOpen,   setAddrFormOpen]   = useState(false);
  const [addrFormName,   setAddrFormName]   = useState(LIVE_D.customerName || "");
  /* SĐT nhận hàng — mặc định SĐT tài khoản, khách sửa được cho đơn giao */
  const [deliveryPhone,  setDeliveryPhone]  = useState(LIVE_D.customerPhone || "");
  const [phoneEditing,   setPhoneEditing]   = useState(false);
  const [phoneDraft,     setPhoneDraft]     = useState(LIVE_D.customerPhone || "");
  const [phoneErr,       setPhoneErr]       = useState("");
  const [addrFormText,   setAddrFormText]   = useState("");
  const [addrFormSaving, setAddrFormSaving] = useState(false);
  const [addrFormErr,    setAddrFormErr]    = useState("");
  const [addrSuggests,   setAddrSuggests]   = useState([]);
  const [addrFormCoords, setAddrFormCoords] = useState(null); // {lat,lng} khi chọn từ gợi ý
  const addrSuggestTimer = useRef(null);

  const onAddrFormTextChange = (value) => {
    setAddrFormText(value); setAddrFormErr(""); setAddrFormCoords(null);
    if (addrSuggestTimer.current) clearTimeout(addrSuggestTimer.current);
    if (value.trim().length < 3) { setAddrSuggests([]); return; }
    addrSuggestTimer.current = setTimeout(async () => {
      const list = await fetchAddressSuggestions(value);
      setAddrSuggests(list);
    }, 350);
  };

  const pickAddrSuggest = async (s) => {
    setAddrFormText(s.text); setAddrSuggests([]); setAddrFormErr("");
    const loc = await geocodePlaceId(s.placeId);
    if (loc) setAddrFormCoords(loc);
  };
  const [liveStores,        ] = useState(getLiveStores);
  const [liveShippingTiers,  ] = useState(getLiveShippingTiers);
  const [liveShippingPromos, ] = useState(getLiveShippingPromos);
  const [liveOrderPromos,    ] = useState(getLiveOrderPromos);
  // Chỉ tự chọn sẵn khi CHỈ CÓ 1 chi nhánh; nhiều chi nhánh thì để trống, khách phải tự bấm chọn "Giao từ".
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    const stores = getLiveStores();
    return stores.length === 1 ? stores[0].id : null;
  });
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

  /* "Đặt lại" từ trang lịch sử đơn hàng — dựng lại giỏ theo GIÁ HIỆN TẠI */
  useEffect(() => {
    let payload = null;
    try { payload = JSON.parse(localStorage.getItem('laboong_reorder') || 'null'); } catch (e) { /* ignore */ }
    if (!payload?.items?.length) return;
    try { localStorage.removeItem('laboong_reorder'); } catch (e) { /* ignore */ }

    const added = [];
    payload.items.forEach(it => {
      const m = liveMenu.find(x => x.id === it.id);
      if (!m || m.available === false) return; // món đã bị xoá / hết hàng
      const basePrice = m.salePrice != null ? m.salePrice : m.price;

      // Giữ lại lựa chọn cũ nhưng chỉ những option còn tồn tại & còn bán
      let extra = 0;
      let sel = null;
      if (it.selections && m.variants) {
        sel = {};
        Object.entries(it.selections).forEach(([gk, val]) => {
          const opts = m.variants[gk];
          if (!opts) { sel[gk] = val; return; } // nhóm không theo món (đường/đá)
          if (Array.isArray(val)) {
            const keep = val.filter(n => opts[n] && opts[n].available !== false);
            keep.forEach(n => { extra += opts[n].extra || 0; });
            sel[gk] = keep;
          } else if (val && opts[val] && opts[val].available !== false) {
            extra += opts[val].extra || 0;
            sel[gk] = val;
          }
        });
      } else if (it.selections) {
        sel = it.selections;
      }

      added.push({
        id: m.id, name: m.name, base: basePrice,
        origPrice: m.salePrice != null ? m.price : null,
        grad: m.grad, img: m.img || null, cat: m.cat,
        selections: sel, unit: basePrice + extra, qty: it.qty || 1,
      });
    });

    if (added.length) {
      setLines(ls => {
        const next = [...ls];
        added.forEach(line => {
          const key = lineKey(line);
          const i = next.findIndex(l => l.key === key);
          if (i >= 0) next[i] = { ...next[i], qty: next[i].qty + line.qty };
          else next.push({ ...line, key });
        });
        return next;
      });
      setDrawer(true);
    }
  }, []); // eslint-disable-line

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
  /* Kiểu ShopeeFood: Tạm tính hiện GIÁ GỐC, phần gạch giá tách thành dòng
     "Khuyến mãi gạch giá". origUnit = unit + (giá gốc − giá đã gạch). */
  const origSubtotal = lines.reduce((s, l) => s + (l.unit + (l.origPrice != null ? l.origPrice - l.base : 0)) * l.qty, 0);
  const saleSavings  = Math.max(0, origSubtotal - subtotal);

  const selectedAddr  = addrId === "pickup" ? null : addresses.find(a => a.id === addrId);
  // Không mặc định chi nhánh khi có nhiều cửa hàng — khách phải tự chọn (chỉ 1 cửa hàng mới auto).
  const selectedStore = liveStores.find(s => s.id === selectedStoreId) || (liveStores.length === 1 ? liveStores[0] : null);

  /* Khoảng cách đường bộ (xe máy) cửa hàng → địa chỉ giao qua Distance
     Matrix; undefined = đang tính, null = API lỗi (dùng Haversine dự phòng) */
  const [routeDists, setRouteDists] = useState({});
  const cachedGeo = (selectedAddr && addrId !== 'pickup') ? addrGeoCache[selectedAddr.id] : null;
  const routeKey = (cachedGeo?.lat && selectedStore?.lat && selectedStore?.lng)
    ? `${cachedGeo.lat.toFixed(5)},${cachedGeo.lng.toFixed(5)}|${selectedStore.lat.toFixed(5)},${selectedStore.lng.toFixed(5)}`
    : null;
  useEffect(() => {
    if (!routeKey || routeDists[routeKey] !== undefined) return;
    let alive = true;
    roadDistanceKm({ lat: selectedStore.lat, lng: selectedStore.lng }, { lat: cachedGeo.lat, lng: cachedGeo.lng })
      .then(km => { if (alive) setRouteDists(d => ({ ...d, [routeKey]: km })); })
      .catch(() => { if (alive) setRouteDists(d => ({ ...d, [routeKey]: null })); });
    return () => { alive = false; };
  }, [routeKey]); // eslint-disable-line

  /* shipping info: geocode delivery address, compute distance + fee */
  const geoInfo = useMemo(() => {
    if (!selectedAddr || addrId === 'pickup') return null;
    const cached = addrGeoCache[selectedAddr.id];
    if (!cached) return { geocoding: false, dist: null, fee: 0 };
    if (cached.geocoding) return { geocoding: true, dist: null, fee: 0 };
    if (!cached.lat || !selectedStore?.lat || !selectedStore?.lng) return { geocoding: false, dist: null, fee: 0 };
    // Ưu tiên khoảng cách ĐƯỜNG BỘ (xe máy); chưa có/lỗi thì tạm dùng đường chim bay
    const routeKm = routeKey ? routeDists[routeKey] : undefined;
    const dist = (typeof routeKm === 'number')
      ? routeKm
      : haversineDist(cached.lat, cached.lng, selectedStore.lat, selectedStore.lng);
    const fee  = calcShippingFee(dist, liveShippingTiers);
    return { geocoding: false, dist, fee };
  }, [addrId, addrGeoCache, selectedStore, liveShippingTiers, routeDists, routeKey]); // eslint-disable-line

  const shipFee = geoInfo?.fee ?? 0;
  const dist    = geoInfo?.dist ?? null;

  /* Quà tích điểm (voucher) và Voucher giảm đơn hàng (promo) cộng dồn được */
  const voucherDiscount = orderVoucher ? calcVoucherDiscount(orderVoucher, subtotal, lines) : 0;
  const promoDiscount   = selectedOrderPromo ? calcOrderPromoDiscount(selectedOrderPromo, subtotal) : 0;
  const orderDiscount   = Math.min(subtotal, voucherDiscount + promoDiscount);
  const shipDiscount    = shippingVoucher
    ? calcVoucherDiscount(shippingVoucher, shipFee)
    : calcShipPromoDiscount(selectedShipPromo, shipFee, subtotal, dist);
  const totalDiscount   = orderDiscount + shipDiscount;
  const payable         = Math.max(0, subtotal - orderDiscount + shipFee - shipDiscount);
  // Điểm thưởng chỉ tính trên tiền hàng (sau giảm giá), KHÔNG tính phí ship.
  const earnBase        = Math.max(0, subtotal - orderDiscount);
  const earnPts       = Math.floor(earnBase / livePerPoint);

  /* Clear order voucher/promo if subtotal drops below min or free_item product removed */
  useEffect(() => {
    if (orderVoucher && subtotal < (orderVoucher.min_purchase || 0)) setOrderVoucher(null);
    if (selectedOrderPromo && subtotal < (selectedOrderPromo.min_purchase || 0)) setSelectedOrderPromo(null);
  }, [subtotal]); // eslint-disable-line

  useEffect(() => {
    if (orderVoucher?.discount_type === 'free_item' && orderVoucher.free_item_product_id) {
      const productCartId = 'p' + orderVoucher.free_item_product_id;
      if (!lines.some(l => l.id === productCartId)) setOrderVoucher(null);
    }
    if (orderVoucher?.discount_type === 'buy_get') {
      const need = Math.max(1, orderVoucher.buy_quantity || 2) + Math.max(1, orderVoucher.free_item_quantity || 1);
      if (lines.reduce((s, l) => s + l.qty, 0) < need) setOrderVoucher(null);
    }
    if (orderVoucher?.discount_type === 'free_item' && orderVoucher.free_item_scope === 'any'
        && freeAnyEligibleUnits(orderVoucher, lines).length === 0) {
      setOrderVoucher(null); // giỏ không còn món đúng size của voucher
    }
    if (orderVoucher?.discount_type === 'free_item' && !orderVoucher.free_item_product_id
        && orderVoucher.free_item_scope !== 'any'
        && cartToppingTotal(lines) <= 0) {
      setOrderVoucher(null); // voucher topping mà giỏ không còn topping nào
    }
  }, [lines]); // eslint-disable-line

  /* Clear selectedShipPromo if it becomes ineligible */
  useEffect(() => {
    if (!selectedShipPromo) return;
    if (subtotal < selectedShipPromo.min_order_amount) { setSelectedShipPromo(null); return; }
    if (selectedShipPromo.max_km !== null && dist !== null && dist > selectedShipPromo.max_km) setSelectedShipPromo(null);
  }, [subtotal, dist]); // eslint-disable-line

  const applyOrderVoucher = (v) => {
    if (subtotal < (v.min_purchase || 0)) { setCouponErr(`Áp dụng cho đơn từ ${fmt(v.min_purchase)}đ`); return; }
    if (v.discount_type === 'free_item' && v.free_item_product_id) {
      const productCartId = 'p' + v.free_item_product_id;
      if (!lines.some(l => l.id === productCartId)) {
        setCouponErr(`Vui lòng thêm "${v.free_item_product_name || 'sản phẩm'}" vào đơn để dùng voucher này`);
        return;
      }
    }
    if (v.discount_type === 'buy_get') {
      const need = Math.max(1, v.buy_quantity || 2) + Math.max(1, v.free_item_quantity || 1);
      const have = lines.reduce((s, l) => s + l.qty, 0);
      if (have < need) {
        setCouponErr(`Giỏ hàng cần tối thiểu ${need} món để dùng ưu đãi này (hiện có ${have})`);
        return;
      }
    }
    if (v.discount_type === 'free_item' && v.free_item_scope === 'any'
        && freeAnyEligibleUnits(v, lines).length === 0) {
      setCouponErr(v.free_item_size
        ? `Vui lòng thêm món ${v.free_item_size} vào đơn để dùng voucher này`
        : 'Vui lòng thêm món vào đơn để dùng voucher này');
      return;
    }
    if (v.discount_type === 'free_item' && !v.free_item_product_id && v.free_item_scope !== 'any'
        && cartToppingTotal(lines) <= 0) {
      setCouponErr('Món trong giỏ phải có topping mới dùng được voucher này');
      return;
    }
    // Cộng dồn được với voucher giảm đơn hàng — không xoá lựa chọn kia
    setOrderVoucher(v); setCouponErr(""); setCouponView(false);
  };

  const applyOrderPromo = (p) => {
    if (subtotal < (p.min_purchase || 0)) { setCouponErr(`Áp dụng cho đơn từ ${fmt(p.min_purchase)}đ`); return; }
    setSelectedOrderPromo(p); setCouponErr(""); setCouponView(false);
  };

  const applyShippingVoucher = (v) => {
    setShippingVoucher(v); setSelectedShipPromo(null); setCouponErr(""); setCouponView(false);
  };

  const applyShipPromo = (p) => {
    setSelectedShipPromo(p); setShippingVoucher(null); setCouponErr(""); setCouponView(false);
  };

  const clearShipDiscount = () => { setShippingVoucher(null); setSelectedShipPromo(null); };

  const startEditPhone = () => { setPhoneDraft(deliveryPhone); setPhoneErr(""); setPhoneEditing(true); };
  const savePhone = () => {
    const p = phoneDraft.replace(/[\s.\-]/g, "");
    if (!/^0\d{9}$/.test(p)) { setPhoneErr("SĐT phải gồm 10 số, bắt đầu bằng 0"); return; }
    setDeliveryPhone(p); setPhoneEditing(false); setPhoneErr("");
  };

  /* Save a new delivery address without leaving the cart */
  const saveNewAddress = async () => {
    const nm   = addrFormName.trim();
    const text = addrFormText.trim();
    if (nm.length < 2)   { setAddrFormErr("Vui lòng nhập tên người nhận"); return; }
    if (text.length < 6) { setAddrFormErr("Vui lòng nhập địa chỉ đầy đủ (số nhà, đường, quận…)"); return; }

    if (!LIVE) {
      const a = { id: 'a' + Date.now(), label: 'Nhà', text, def: addresses.length === 0, lat: addrFormCoords?.lat ?? null, lng: addrFormCoords?.lng ?? null };
      setAddresses(list => [...list, a]); setAddrId(a.id);
      setAddrFormOpen(false); setAddrFormText(""); setAddrFormErr(""); setAddrSuggests([]); setAddrView(false);
      return;
    }

    setAddrFormSaving(true); setAddrFormErr("");
    try {
      const res = await fetch(LIVE_D.urls?.storeAddress, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          label: 'Nhà', name: nm, text, def: addresses.length === 0,
          lat: addrFormCoords?.lat ?? null, lng: addrFormCoords?.lng ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Không lưu được địa chỉ');
      setAddresses(list => [...list, json.address]);
      setAddrId(json.address.id);
      setAddrFormOpen(false); setAddrFormText(""); setAddrSuggests([]); setAddrView(false);
    } catch (e) {
      setAddrFormErr(e.message);
    } finally {
      setAddrFormSaving(false);
    }
  };

  /* Xoá một địa chỉ giao hàng đã lưu */
  const deleteAddress = async (id) => {
    if (!window.confirm("Xoá địa chỉ này?")) return;
    const removeLocal = () => {
      setAddresses(list => {
        const wasDef = list.find(a => a.id === id)?.def;
        let next = list.filter(a => a.id !== id);
        // Xoá địa chỉ mặc định → chuyển mặc định sang địa chỉ còn lại đầu tiên (giống server)
        if (wasDef && next.length && !next.some(a => a.def)) {
          next = next.map((a, i) => i === 0 ? { ...a, def: true } : a);
        }
        return next;
      });
      if (addrId === id) setAddrId("pickup");
    };
    if (!LIVE) { removeLocal(); return; }
    try {
      const url = (LIVE_D.urls?.deleteAddress || "/profile/addresses/__ID__").replace("__ID__", id);
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.message || 'Không xoá được địa chỉ'); }
      removeLocal();
    } catch (e) {
      alert(e.message);
    }
  };

  const jumpCat = (key) => {
    setActiveCat(key);
    const el = grpRefs.current[key];
    if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 124; window.scrollTo({ top: y, behavior: "smooth" }); }
  };

  /* Xoá giỏ hàng + cache localStorage + ưu đãi đã áp (giữ nguyên màn hình
     "đặt thành công"). Gọi ngay khi đặt hàng xong để không khôi phục lại
     đơn cũ khi khách đóng giỏ / tải lại trang. */
  const clearCart = () => {
    clearCartState();
    setLines([]); setNote("");
    setOrderVoucher(null); setSelectedOrderPromo(null); setShippingVoucher(null); setSelectedShipPromo(null);
  };

  const reset = () => {
    clearCart();
    setPlaced(false); setDrawer(false); setOrderErr("");
    setCouponView(false); setCouponErr("");
    setStoreView(false); setAddrView(false);
    setActualPts(0);
  };

  const checkout = async () => {
    if (placing) return;
    setOrderErr("");

    if (!LIVE) { setActualPts(earnPts); setPlaced(true); clearCart(); return; }

    // Bắt buộc chọn chi nhánh khi có nhiều cửa hàng (không còn mặc định "Giao từ").
    if (liveStores.length > 1 && !selectedStore) {
      setOrderErr(selectedAddr ? "Vui lòng chọn chi nhánh giao hàng." : "Vui lòng chọn chi nhánh nhận hàng.");
      setStoreViewMode(selectedAddr ? "delivery" : "pickup");
      setStoreView(true);
      return;
    }

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
          delivery_address: selectedAddr ? selectedAddr.text : null,
          delivery_phone: selectedAddr ? (deliveryPhone || null) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Có lỗi xảy ra');
      setActualPts(json.points_earned ?? earnPts);
      setPlaced(true);
      clearCart(); // xoá giỏ + cache ngay khi đặt thành công
    } catch (e) {
      setOrderErr(e.message);
    } finally {
      setPlacing(false);
    }
  };

  const addrIcon = (label) => label === "Công ty" ? "building" : label === "Khác" ? "pin" : "home";
  const pickupLabel   = selectedStore ? selectedStore.name : (liveStores.length > 1 ? 'Chưa chọn chi nhánh' : ('Laboong ' + liveStore));

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
          variantGroups={getProductVariantGroups(customize, variantGroups)}
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
                {actualPts > 0 && (
                  <div className="ok-earn">
                    <span className="oi"><Icon name="coin" size={22} color="#fff" /></span>
                    <div><div className="ot">Sẽ nhận khi đơn hoàn tất</div><div className="ov">+{fmt(actualPts)} điểm</div></div>
                  </div>
                )}
                <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "14px 6px 2px", lineHeight: 1.55 }}>
                  Điểm sẽ được cộng vào tài khoản khi đơn giao thành công.
                </p>
                <button className="ok-btn" onClick={reset} style={{ marginTop: 20 }}>Đặt thêm món khác</button>
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
                    {/* Quà tích điểm — redemptions, applicable if has active voucher */}
                    <div className="cp-sec">Quà tích điểm</div>
                    {cartVouchers.redemptions.length === 0 ? (
                      <div className="cp-empty">
                        Bạn chưa có quà tích điểm. Đổi điểm tại{" "}
                        <a href="/profile#rewards" style={{ color: "var(--brand)", fontWeight: 600 }}>Đổi quà</a>!
                      </div>
                    ) : (
                      <div className="vlist">
                        {cartVouchers.redemptions.map(r => {
                          const typeColor = {
                            discount_voucher: 'linear-gradient(135deg,#FF8A5B,#FF6FA5)',
                            free_item:        'linear-gradient(135deg,#0F623F,#1AA86A)',
                            tier_upgrade:     'linear-gradient(135deg,#6B4FA0,#9B7FD0)',
                            other:            'linear-gradient(135deg,#7A4A28,#B87045)',
                          }[r.reward_type] ?? 'linear-gradient(135deg,#7A4A28,#B87045)';
                          const typeLabel = {
                            discount_voucher: 'Voucher giảm giá',
                            free_item:        'Sản phẩm miễn phí',
                            tier_upgrade:     'Nâng hạng',
                            other:            'Quà tặng',
                          }[r.reward_type] ?? 'Quà tặng';
                          const v          = r.voucher;
                          const canApply   = !!v;
                          const isFreeItem = canApply && v.discount_type === 'free_item';
                          const isGiftItem = canApply && v.discount_type === 'gift_item';
                          const isBuyGet   = canApply && v.discount_type === 'buy_get';
                          const isAnyItem  = isFreeItem && v.free_item_scope === 'any';
                          const freeCartLine = isFreeItem && v.free_item_product_id
                            ? lines.find(l => l.id === 'p' + v.free_item_product_id)
                            : null;
                          const freeProductInCart = !isFreeItem || !v.free_item_product_id || !!freeCartLine;
                          const notEnough  = canApply && subtotal < (v.min_purchase || 0);
                          const notInCart  = isFreeItem && !freeProductInCart;
                          // Miễn phí món bất kỳ: giỏ phải có món đúng size (nếu giới hạn size)
                          const noEligible = isAnyItem && freeAnyEligibleUnits(v, lines).length === 0;
                          // Mua X tặng Y: cần đủ X+Y món trong giỏ
                          const cartCount  = lines.reduce((s, l) => s + l.qty, 0);
                          const bgNeed     = isBuyGet ? Math.max(1, v.buy_quantity || 2) + Math.max(1, v.free_item_quantity || 1) : 0;
                          const bgMissing  = isBuyGet ? Math.max(0, bgNeed - cartCount) : 0;
                          // Voucher Freetopping: món trong giỏ phải có topping mới áp được
                          const isTopVoucher = isFreeItem && !v.free_item_product_id && !isAnyItem;
                          const noTopping    = isTopVoucher && cartToppingTotal(lines) <= 0;
                          const isDisabled = notEnough || notInCart || bgMissing > 0 || noTopping || noEligible;
                          // Effective quantity actually free (capped at what's in cart)
                          const freeQty    = isFreeItem ? (v.free_item_quantity || 1) : 0;
                          const cartQty    = freeCartLine ? freeCartLine.qty : 0;
                          const effectiveQty = Math.min(freeQty, cartQty);
                          const isSelected = canApply && orderVoucher?.id === v.id;

                          const thumb = r.image_url ? (
                            <img src={r.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <span className="vi" style={{ background: canApply && isSelected ? "var(--brand)" : typeColor }}>
                              <Icon name={r.reward_type === 'discount_voucher' ? 'ticket' : 'gift'} size={20} color="#fff" />
                            </span>
                          );

                          // Hide redemptions that have no applicable voucher (e.g. tier_upgrade)
                          if (!canApply) return null;

                          const disc = calcVoucherDiscount(v, subtotal, lines);
                          // Label for free_item: "Miễn phí N× [product]" or "Miễn phí N× topping"
                          const freeLabel = isBuyGet
                            ? `Mua ${v.buy_quantity || 2} tặng ${v.free_item_quantity || 1} — tặng món giá thấp nhất`
                            : isGiftItem
                            ? `Quà tặng kèm đơn${(v.free_item_quantity || 1) > 1 ? ` ×${v.free_item_quantity}` : ''} — không trừ tiền`
                            : isAnyItem
                            ? `Miễn phí ${freeQty > 1 ? freeQty + '× ' : ''}món${v.free_item_size ? ` ${v.free_item_size}` : ''} bất kỳ — trừ tiền món rẻ nhất`
                            : isFreeItem
                            ? `Miễn phí ${freeQty > 1 ? freeQty + '× ' : ''}${v.free_item_product_id ? (v.free_item_product_name || 'sản phẩm') : 'topping'}`
                            : v.discount_type === 'percentage'
                              ? `Giảm ${v.discount_value}%` + (v.max_discount ? ` (tối đa ${fmt(v.max_discount)}đ)` : '')
                              : `Giảm ${fmt(v.discount_value)}đ`;

                          return (
                            <button key={r.id}
                              className={"vopt" + (isSelected ? " on" : "")}
                              disabled={isDisabled}
                              onClick={() => applyOrderVoucher(v)}
                            >
                              {thumb}
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="vn">{r.name}</div>
                                <div className="vd">
                                  {freeLabel}
                                  {v.min_purchase ? ` · Đơn từ ${fmt(v.min_purchase)}đ` : ''}
                                </div>
                                {isFreeItem && v.free_item_product_id && freeProductInCart && effectiveQty < freeQty && (
                                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                                    Đơn có {cartQty}/{freeQty} — miễn phí {effectiveQty} cái
                                  </div>
                                )}
                                {r.expires_at && <div className="vd" style={{ color: 'var(--ink-3)' }}>HSD: {r.expires_at}</div>}
                                {notEnough && <div style={{ fontSize: 11, color: 'var(--hot)', marginTop: 2 }}>Còn thiếu {fmt((v.min_purchase || 0) - subtotal)}đ</div>}
                                {notInCart && <div style={{ fontSize: 11, color: 'var(--hot)', marginTop: 2 }}>Thêm "{v.free_item_product_name || 'sản phẩm'}" vào đơn để dùng</div>}
                                {bgMissing > 0 && <div style={{ fontSize: 11, color: 'var(--hot)', marginTop: 2 }}>Thêm {bgMissing} món nữa để dùng (cần {bgNeed} món)</div>}
                                {noTopping && <div style={{ fontSize: 11, color: 'var(--hot)', marginTop: 2 }}>Thêm topping vào món để dùng voucher này</div>}
                                {noEligible && <div style={{ fontSize: 11, color: 'var(--hot)', marginTop: 2 }}>Thêm món{v.free_item_size ? ` ${v.free_item_size}` : ''} vào đơn để dùng voucher này</div>}
                              </div>
                              <span className="vgo">
                                {notEnough ? `Còn thiếu ${fmt((v.min_purchase || 0) - subtotal)}đ`
                                  : notInCart ? <Icon name="lock" size={14} />
                                  : bgMissing > 0 ? <Icon name="lock" size={14} />
                                  : noTopping ? <Icon name="lock" size={14} />
                                  : noEligible ? <Icon name="lock" size={14} />
                                  : isSelected ? <><Icon name="check" size={14} /> Đang dùng</>
                                  : isGiftItem ? <>Nhận kèm đơn <Icon name="chev" size={14} /></>
                                  : <>−{fmt(disc)}đ <Icon name="chev" size={14} /></>}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Mã giảm đơn hàng từ Quản lý khuyến mãi */}
                    <div className="cp-sec">Voucher giảm đơn hàng</div>
                    {liveOrderPromos.length === 0 ? (
                      <div className="cp-empty">Hiện chưa có chương trình giảm giá đơn hàng.</div>
                    ) : (
                      <div className="vlist">
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
                                {notEnough && <div style={{ fontSize: 11, color: "var(--hot)", marginTop: 2 }}>Còn thiếu {fmt((p.min_purchase || 0) - subtotal)}đ</div>}
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
                      <div key={a.id} className={"aopt" + (addrId === a.id ? " on" : "")} style={{ cursor: "pointer" }}
                        onClick={() => { setAddrId(a.id); setAddrView(false); }}>
                        <span className="ai"><Icon name={addrIcon(a.label)} size={19} color="currentColor" /></span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="albl"><span className="atag">{a.label}</span>{a.def && <span className="adef">Mặc định</span>}</div>
                          <div className="atext">{a.text}</div>
                        </div>
                        <button className="aopt-del" title="Xoá địa chỉ" aria-label="Xoá địa chỉ"
                          onClick={(e) => { e.stopPropagation(); deleteAddress(a.id); }}>
                          <Icon name="close" size={15} color="currentColor" />
                        </button>
                        <span className="aradio" />
                      </div>
                    ))}
                    {addresses.length === 0 && !addrFormOpen && (
                      <div className="cp-empty">Bạn chưa có địa chỉ giao hàng — thêm ngay bên dưới nhé!</div>
                    )}
                  </div>

                  {addrFormOpen ? (
                    <div style={{ border: "1.5px solid var(--brand)", borderRadius: 14, padding: 13, background: "var(--brand-soft, rgba(15,98,63,.06))", marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>Thêm địa chỉ giao hàng</div>
                      {/* fontSize ≥ 16px: iOS Safari tự zoom vào input có chữ nhỏ hơn 16px */}
                      <input className="inp" placeholder="Tên người nhận" value={addrFormName}
                        onChange={e => { setAddrFormName(e.target.value); setAddrFormErr(""); }}
                        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line, #ddd)", fontSize: 16 }} />
                      <textarea className="inp" placeholder="Địa chỉ nhận hàng (số nhà, đường, phường/quận…)" value={addrFormText} rows={2} autoFocus
                        onChange={e => onAddrFormTextChange(e.target.value)}
                        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line, #ddd)", fontSize: 16, resize: "none", fontFamily: "inherit" }} />
                      {addrSuggests.length > 0 && (
                        <div style={{ border: "1px solid var(--line, #ddd)", borderRadius: 10, overflow: "hidden", background: "var(--card, #fff)" }}>
                          {addrSuggests.map(s => (
                            <button key={s.placeId} onClick={() => pickAddrSuggest(s)}
                              style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderBottom: "1px solid var(--line, #eee)", background: "transparent", fontSize: 13.5, lineHeight: 1.4, cursor: "pointer", color: "var(--ink, #222)" }}>
                              <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name="pin" size={14} color="var(--brand)" /></span>
                              {s.text}
                            </button>
                          ))}
                        </div>
                      )}
                      {addrFormCoords && (
                        <div style={{ fontSize: 12, color: "var(--brand)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                          <Icon name="check" size={13} color="var(--brand)" /> Đã xác định vị trí — phí ship sẽ tính chính xác
                        </div>
                      )}
                      {addrFormErr && <div style={{ fontSize: 12.5, color: "var(--danger, #e53)", fontWeight: 600 }}>{addrFormErr}</div>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => { setAddrFormOpen(false); setAddrFormErr(""); setAddrSuggests([]); }}
                          style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid var(--line, #ddd)", background: "transparent", fontWeight: 600, fontSize: 14 }}>Huỷ</button>
                        <button onClick={saveNewAddress} disabled={addrFormSaving}
                          style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14, opacity: addrFormSaving ? 0.6 : 1 }}>
                          {addrFormSaving ? "Đang lưu…" : "Lưu & giao đến đây"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="aopt" onClick={() => { setAddrFormOpen(true); setAddrFormErr(""); }} style={{ marginTop: 8 }}>
                      <span className="ai"><Icon name="plus" size={19} color="currentColor" /></span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="albl"><span className="atag">Thêm địa chỉ mới</span></div>
                        <div className="atext">Nhập địa chỉ giao hàng ngay tại đây</div>
                      </div>
                      <span className="dchev"><Icon name="chev" size={17} /></span>
                    </button>
                  )}

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
                  {/* Giao từ chi nhánh nào — dòng riêng, bấm là mở danh sách cửa hàng */}
                  {selectedAddr && liveStores.length > 0 && (
                    <button className="deliv" style={{ marginBottom: 8 }}
                      onClick={() => { setStoreViewMode("delivery"); setStoreView(true); }}>
                      <span className="di"><Icon name="truck" size={19} color="currentColor" /></span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="dl">Giao từ</div>
                        <div className="dt">{selectedStore ? selectedStore.name : "Chưa chọn chi nhánh"}</div>
                        {liveStores.length > 1 && (
                          <div className="dt" style={{ marginTop: 2, fontSize: 12.5, fontWeight: 600, color: "var(--brand)" }}>
                            Bấm để chọn chi nhánh giao hàng
                          </div>
                        )}
                      </div>
                      <span className="dchev"><Icon name="chev" size={18} /></span>
                    </button>
                  )}
                  <button className="deliv" onClick={() => setAddrView(true)}>
                    <span className="di"><Icon name={selectedAddr ? addrIcon(selectedAddr.label) : "pin"} size={19} color="currentColor" /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {selectedAddr ? (<>
                        <div className="dl">Giao đến <span className="dtag">{selectedAddr.label}</span>{selectedAddr.def && <span className="dtag" style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}>Mặc định</span>}</div>
                        <div className="dt">{selectedAddr.text}</div>
                      </>) : (<>
                        <div className="dl">Nhận tại quầy</div>
                        <div className="dt">{pickupLabel}</div>
                        <div className="dt" style={{ marginTop: 2, fontSize: 12.5, fontWeight: 600, color: "var(--brand)" }}>
                          Muốn giao tận nơi? Bấm để thêm địa chỉ
                        </div>
                      </>)}
                    </div>
                    <span className="dchev"><Icon name="chev" size={18} /></span>
                  </button>
                  {/* SĐT nhận hàng — chỉ hiện với đơn giao, khách sửa được */}
                  {selectedAddr && (
                    <div className="deliv" style={{ marginTop: 8, alignItems: phoneEditing ? "stretch" : "center", flexDirection: phoneEditing ? "column" : "row", gap: phoneEditing ? 8 : 12 }}>
                      {phoneEditing ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="di"><Icon name="phone" size={19} color="currentColor" /></span>
                            <div className="dl">Số điện thoại nhận hàng</div>
                          </div>
                          <input className="inp" inputMode="numeric" autoFocus
                            value={phoneDraft} maxLength={15}
                            onChange={e => { setPhoneDraft(e.target.value.replace(/[^\d\s.\-]/g, "")); setPhoneErr(""); }}
                            placeholder="VD: 0912 345 678"
                            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line, #ddd)", fontSize: 16 }} />
                          {phoneErr && <div style={{ fontSize: 12.5, color: "var(--danger, #e53)", fontWeight: 600 }}>{phoneErr}</div>}
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setPhoneEditing(false); setPhoneErr(""); }}
                              style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "1px solid var(--line, #ddd)", background: "transparent", fontWeight: 600, fontSize: 14 }}>Huỷ</button>
                            <button onClick={savePhone}
                              style={{ flex: 2, padding: "9px 0", borderRadius: 10, border: "none", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14 }}>Lưu số điện thoại</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="di"><Icon name="phone" size={19} color="currentColor" /></span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="dl">Số điện thoại nhận hàng</div>
                            <div className="dt">{deliveryPhone || "Chưa có số điện thoại"}</div>
                          </div>
                          <button onClick={startEditPhone} style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: "var(--brand)", background: "var(--brand-soft, rgba(15,98,63,.08))", padding: "7px 13px", borderRadius: 999 }}>
                            <Icon name="edit" size={13} color="currentColor" /> Sửa
                          </button>
                        </>
                      )}
                    </div>
                  )}
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
                            <div className="cac">
                              {orderVoucher.discount_type === 'buy_get'
                                ? `Mua ${orderVoucher.buy_quantity || 2} tặng ${orderVoucher.free_item_quantity || 1} — tặng món giá thấp nhất`
                                : orderVoucher.discount_type === 'gift_item'
                                ? 'Quà tặng kèm đơn — đã đổi bằng điểm'
                                : orderVoucher.discount_type === 'free_item' && orderVoucher.free_item_scope === 'any'
                                ? `Miễn phí ${(orderVoucher.free_item_quantity || 1) > 1 ? (orderVoucher.free_item_quantity + '× ') : ''}món${orderVoucher.free_item_size ? ` ${orderVoucher.free_item_size}` : ''} bất kỳ`
                                : orderVoucher.discount_type === 'free_item'
                                ? `Miễn phí ${(orderVoucher.free_item_quantity || 1) > 1 ? (orderVoucher.free_item_quantity + '× ') : ''}${orderVoucher.free_item_product_id ? (orderVoucher.free_item_product_name || 'sản phẩm') : 'topping'}`
                                : (orderVoucher.code || 'Quà tích điểm')}
                            </div>
                          </div>
                          <span className="cav">{orderVoucher.discount_type === 'gift_item' ? 'Quà tặng' : `−${fmt(voucherDiscount)}đ`}</span>
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
                          <span className="cav">−{fmt(promoDiscount)}đ</span>
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
                  <div className="csum"><span>Tạm tính</span><span className="v tnum">{fmt(origSubtotal)}đ</span></div>
                  {saleSavings > 0 && <div className="csum" style={{ color: "var(--pink)" }}><span>Khuyến mãi gạch giá</span><span className="v tnum" style={{ color: "var(--pink)" }}>−{fmt(saleSavings)}đ</span></div>}
                  {orderDiscount > 0 && <div className="csum" style={{ color: "var(--pink)" }}><span>{orderVoucher && selectedOrderPromo ? "Giảm đơn hàng (2 ưu đãi)" : selectedOrderPromo ? selectedOrderPromo.name : orderVoucher?.discount_type === 'free_item' ? `Miễn phí ${(orderVoucher.free_item_quantity || 1) > 1 ? orderVoucher.free_item_quantity + '× ' : ''}${orderVoucher.free_item_product_id ? (orderVoucher.free_item_product_name || 'sản phẩm') : 'topping'}` : "Giảm đơn hàng"}</span><span className="v tnum" style={{ color: "var(--pink)" }}>−{fmt(orderDiscount)}đ</span></div>}
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
