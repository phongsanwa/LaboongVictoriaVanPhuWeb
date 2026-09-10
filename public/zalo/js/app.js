/* ====== Laboong · Zalo Mini App (vanilla JS) — gọi /api của website ====== */
'use strict';

/* API base: mini app phục vụ từ /zalo/ nên API cùng domain tại /api. Có thể
   đổi API_BASE nếu Mini App chạy trên domain Zalo tách biệt. */
const API_BASE = (location.origin || '') + '/api';
const TOKEN_KEY = 'laboong_zalo_token';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const fmt = (n) => (Number(n) || 0).toLocaleString('vi-VN');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- State ---------- */
const state = {
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: null,
  data: null,          // /api/menu payload
  cart: [],            // cart lines
  activeCat: '',
  search: '',
  addresses: [],
  addrId: 'pickup',    // 'pickup' | address id
  storeId: null,
  payment: 'cod',      // 'cod' | 'bank'
};

/* ---------- API helper ---------- */
async function api(path, { method = 'GET', body = null, auth = false } = {}) {
  const headers = { 'Accept': 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (auth && state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : null });
  let json = {};
  try { json = await res.json(); } catch (e) { /* no body */ }
  if (res.status === 401) { logout(false); }
  if (!res.ok) throw new Error(json.message || 'Có lỗi xảy ra');
  return json;
}

function toast(msg, err = false) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------- Boot ---------- */
async function boot() {
  bindNav();
  try {
    state.data = await api('/menu');
    state.activeCat = state.data.cats?.[0]?.key || '';
    state.storeId = (state.data.stores || []).length === 1 ? state.data.stores[0].id : null;
    renderStoreName();
    renderMenu();
  } catch (e) { $('#menuList').innerHTML = `<div class="empty">Không tải được thực đơn.<br>${esc(e.message)}</div>`; }

  if (state.token) { refreshMe(); loadAddresses(); }
  renderAccount();
}

async function refreshMe() {
  try { const r = await api('/me', { auth: true }); state.user = r.user; renderGreet(); renderAccount(); }
  catch (e) { /* token invalid → logged out already */ }
}

/* ---------- Navigation ---------- */
function bindNav() {
  $$('.bn').forEach(b => b.onclick = () => showScreen(b.dataset.screen));
  $('#cartbar').onclick = openCart;
  $('#search').oninput = (e) => { state.search = e.target.value.trim().toLowerCase(); renderMenu(); };
  $('#storeBtn').onclick = () => openStorePicker('pickup');
}
function showScreen(name) {
  $$('.screen').forEach(s => s.hidden = true);
  $('#screen-' + name).hidden = false;
  $$('.bn').forEach(b => b.classList.toggle('on', b.dataset.screen === name));
  if (name === 'orders') renderOrders();
  if (name === 'account') renderAccount();
  window.scrollTo(0, 0);
}

/* ---------- Menu ---------- */
function menuItem(id) { return (state.data.menu || []).find(m => m.id === id); }
function qtyOfItem(id) { return state.cart.filter(l => l.id === id).reduce((s, l) => s + l.qty, 0); }
function cartCount() { return state.cart.reduce((s, l) => s + l.qty, 0); }
function cartSubtotal() { return state.cart.reduce((s, l) => s + l.unit * l.qty, 0); }

function renderGreet() {
  $('#greet').textContent = state.user ? `Chào ${esc(state.user.name.split(' ').slice(-1)[0] || 'bạn')} 👋` : 'Xin chào 👋';
}
function renderStoreName() {
  const s = (state.data.stores || []).find(x => x.id === state.storeId);
  $('#storeName').textContent = s ? s.name : ((state.data.stores || [])[0]?.name || 'Laboong');
}

function renderMenu() {
  const d = state.data; if (!d) return;
  const cats = d.cats || [];
  $('#cats').innerHTML = cats.map(c =>
    `<button class="cat${c.key === state.activeCat ? ' on' : ''}" data-cat="${esc(c.key)}">${esc(c.label)}</button>`).join('');
  $$('#cats .cat').forEach(b => b.onclick = () => { state.activeCat = b.dataset.cat; renderMenu(); });

  const q = state.search;
  const menu = (d.menu || []).filter(m => !q || m.name.toLowerCase().includes(q) || (m.desc || '').toLowerCase().includes(q));
  const groups = cats.map(c => ({ ...c, items: menu.filter(m => m.cat === c.key) })).filter(g => g.items.length);

  $('#menuList').innerHTML = groups.length ? groups.map(g => `
    <div class="grp-h">${esc(g.label)}</div>
    <div class="items">${g.items.map(itemCard).join('')}</div>
  `).join('') : `<div class="empty">Không có món phù hợp.</div>`;

  $$('#menuList .item').forEach(el => {
    const id = el.dataset.id;
    const addBtn = $('.add-btn', el);
    if (addBtn) addBtn.onclick = () => onAdd(id);
    const minus = $('.st-minus', el), plus = $('.st-plus', el);
    if (minus) minus.onclick = () => addSimple(id, -1);
    if (plus) plus.onclick = () => addSimple(id, 1);
  });
  renderCartbar();
}

function itemCard(m) {
  const qty = qtyOfItem(m.id);
  const quickAdd = m.cat === 'topping' || m.isCombo;
  const comboText = (m.isCombo && (m.comboItems || []).length)
    ? 'Gồm: ' + m.comboItems.map(ci => ci.quantity > 1 ? `${ci.name} x${ci.quantity}` : ci.name).join(' + ') : '';
  const priceHtml = m.salePrice != null
    ? `<span class="item-price old tnum">${fmt(m.price)}đ</span><span class="item-price sale tnum">${fmt(m.salePrice)}đ</span>${m.promoLabel ? `<span class="promo-badge">${esc(m.promoLabel)}</span>` : ''}`
    : `<span class="item-price tnum">${fmt(m.price)}đ</span>`;
  const control = quickAdd
    ? (qty === 0
        ? `<button class="add-btn" aria-label="Thêm">+</button>`
        : `<div class="stepper"><button class="st-minus">−</button><span class="qn">${qty}</span><button class="st-plus">+</button></div>`)
    : `<button class="add-btn" aria-label="Tuỳ chọn">+</button>`;
  return `<div class="item" data-id="${esc(m.id)}">
    <div class="item-thumb" style="background:${esc(m.grad || 'var(--brand)')}">
      ${m.img ? `<img src="${esc(m.img)}" alt="">` : '🧋'}
      ${qty > 0 ? `<span class="item-qty-badge">${qty}</span>` : ''}
    </div>
    <div class="item-body">
      ${(m.tags || []).length ? `<div class="item-tags">${m.tags.map(t => `<span class="tg ${esc(t)}">${esc(tagLabel(t))}</span>`).join('')}</div>` : ''}
      <div class="item-name">${esc(m.name)}${m.isCombo ? '<span class="combo-badge">COMBO</span>' : ''}</div>
      <div class="item-desc">${esc(m.desc || '')}</div>
      ${comboText ? `<div class="item-combo">${esc(comboText)}</div>` : ''}
      <div class="item-foot"><div class="item-price-wrap">${priceHtml}</div>${control}</div>
    </div>
  </div>`;
}
function tagLabel(t) { return (state.data.tagMeta && state.data.tagMeta[t]?.l) || ({ hot: 'Best', veg: 'Healthy', new: 'Mới' }[t] || t); }

/* ---------- Add to cart ---------- */
function lineKey(id, selections) {
  if (!selections) return id + '|simple';
  const parts = Object.entries(selections).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Array.isArray(v) ? [...v].sort().join(',') : (v ?? '-')}`).join('|');
  return id + '|' + parts;
}
function onAdd(id) {
  const m = menuItem(id); if (!m) return;
  if (m.cat === 'topping' || m.isCombo) return addSimple(id, 1);
  openCustomize(m);
}
function addSimple(id, delta) {
  const m = menuItem(id); if (!m) return;
  const key = id + '|simple';
  const i = state.cart.findIndex(l => l.key === key);
  if (i >= 0) {
    state.cart[i].qty += delta;
    if (state.cart[i].qty <= 0) state.cart.splice(i, 1);
  } else if (delta > 0) {
    const eff = m.salePrice != null ? m.salePrice : m.price;
    state.cart.push({ key, id, name: m.name, base: eff, origPrice: m.salePrice != null ? m.price : null, grad: m.grad, img: m.img, cat: m.cat, selections: null, unit: eff, qty: delta });
  }
  renderMenu();
  if ($('#cartSheet')) openCart();
}
function addLine(line) {
  const key = lineKey(line.id, line.selections);
  const i = state.cart.findIndex(l => l.key === key);
  if (i >= 0) state.cart[i].qty += line.qty;
  else state.cart.push({ ...line, key });
  renderMenu();
}

/* ---------- Customize sheet ---------- */
function productGroups(m) {
  // Lọc nhóm biến thể theo món: chỉ giữ option món có bán; sugar/ice (level) áp cho mọi món nước.
  return (state.data.variantGroups || []).map(g => {
    let options = g.options;
    const perProduct = m.variants && m.variants[g.key];
    if (perProduct) options = g.options.filter(o => perProduct[o.id]).map(o => ({ ...o, extra: perProduct[o.id].extra, available: perProduct[o.id].available !== false }));
    else if (g.type === 'size' || g.type === 'addon') options = []; // nhóm theo món mà món này không có → ẩn
    return { ...g, options };
  }).filter(g => g.options.length);
}
function makeDefaultSel(groups) {
  const sel = {};
  groups.forEach(g => {
    if (g.type === 'addon') sel[g.key] = [];
    else { const av = g.options.filter(o => o.available !== false); sel[g.key] = (av.find(o => o.def) || av[0])?.id ?? null; }
  });
  return sel;
}
function calcUnit(base, groups, sel) {
  let extra = 0;
  groups.forEach(g => {
    const v = sel[g.key];
    if (g.type === 'size' && v) extra += g.options.find(o => o.id === v)?.extra || 0;
    else if (g.type === 'addon' && Array.isArray(v)) v.forEach(id => extra += g.options.find(o => o.id === id)?.extra || 0);
  });
  return base + extra;
}
function openCustomize(m) {
  const base = m.salePrice != null ? m.salePrice : m.price;
  const groups = productGroups(m);
  let sel = makeDefaultSel(groups), qty = 1;
  const addonQty = (k, id) => (sel[k] || []).filter(x => x === id).length;

  function body() {
    return groups.map(g => {
      if (g.type === 'addon') {
        return `<div class="cz-sec"><div class="cz-sec-t">${esc(g.label)} <span class="req">· chọn nhiều</span></div><div class="cz-tops">${g.options.map(o => {
          const av = o.available !== false, q = av ? addonQty(g.key, o.id) : 0;
          return `<div class="cz-top${q > 0 ? ' on' : ''}" style="${av ? '' : 'opacity:.45'}">
            <span class="tn">${esc(o.label)}</span><span class="tp">${av ? '+' + fmt(o.extra) + 'đ' : 'Hết'}</span>
            ${av ? `<span class="cz-qty" data-g="${esc(g.key)}" data-o="${esc(o.id)}"><button class="aq-minus" ${q <= 0 ? 'disabled' : ''}>−</button><span class="qn">${q}</span><button class="aq-plus">+</button></span>` : ''}
          </div>`;
        }).join('')}</div></div>`;
      }
      return `<div class="cz-sec"><div class="cz-sec-t">${esc(g.label)}${g.required ? '' : ' <span class="req">· tuỳ chọn</span>'}</div><div class="cz-chips">${g.options.map(o => {
        const av = o.available !== false;
        return `<button class="cz-chip${sel[g.key] === o.id ? ' on' : ''}" data-g="${esc(g.key)}" data-o="${esc(o.id)}" ${av ? '' : 'disabled'}>${esc(o.label)}${o.extra > 0 ? ' +' + fmt(o.extra) + 'đ' : ''}</button>`;
      }).join('')}</div></div>`;
    }).join('');
  }
  function foot() {
    const unit = calcUnit(base, groups, sel);
    return `<div class="cz-qty" style="background:var(--bg-2)"><button id="czQm">−</button><span class="qn">${qty}</span><button id="czQp">+</button></div>
      <button class="cz-add" id="czAdd">Thêm · ${fmt(unit * qty)}đ</button>`;
  }
  const html = `<div class="scrim"><div class="sheet" id="czSheet">
    <div class="sheet-h">
      <div class="cz-thumb" style="background:${esc(m.grad)}">${m.img ? `<img src="${esc(m.img)}">` : '🧋'}</div>
      <div style="flex:1;min-width:0"><h3 style="font-size:16px">${esc(m.name)}</h3><div class="cz-base">${fmt(base)}đ</div></div>
      <button class="sheet-x" id="czX">✕</button>
    </div>
    <div class="sheet-b" id="czBody">${body()}</div>
    <div class="sheet-f" id="czFoot">${foot()}</div>
  </div></div>`;
  mountOverlay(html);

  const rerenderBody = () => { $('#czBody').innerHTML = body(); wire(); };
  const rerenderFoot = () => { $('#czFoot').innerHTML = foot(); wireFoot(); };
  function wire() {
    $$('#czBody .cz-chip').forEach(b => b.onclick = () => { if (b.disabled) return; sel[b.dataset.g] = b.dataset.o; rerenderBody(); rerenderFoot(); });
    $$('#czBody .cz-qty').forEach(w => {
      const k = w.dataset.g, id = w.dataset.o;
      $('.aq-minus', w).onclick = () => { setAddon(k, id, -1); rerenderBody(); rerenderFoot(); };
      $('.aq-plus', w).onclick = () => { setAddon(k, id, 1); rerenderBody(); rerenderFoot(); };
    });
  }
  function wireFoot() {
    $('#czQm').onclick = () => { qty = Math.max(1, qty - 1); rerenderFoot(); };
    $('#czQp').onclick = () => { qty += 1; rerenderFoot(); };
    $('#czAdd').onclick = () => {
      const unit = calcUnit(base, groups, sel);
      addLine({ id: m.id, name: m.name, base, origPrice: m.salePrice != null ? m.price : null, grad: m.grad, img: m.img, cat: m.cat, selections: { ...sel }, unit, qty });
      closeOverlay(); toast('Đã thêm vào giỏ');
    };
  }
  function setAddon(k, id, d) {
    const cur = sel[k] || []; const n = Math.max(0, Math.min(20, cur.filter(x => x === id).length + d));
    sel[k] = [...cur.filter(x => x !== id), ...Array(n).fill(id)];
  }
  $('#czX').onclick = closeOverlay;
  wire(); wireFoot();
}

/* ---------- Cart sheet ---------- */
function optsText(l) {
  if (!l.selections) return '';
  const parts = [];
  (state.data.variantGroups || []).forEach(g => {
    const v = l.selections[g.key]; if (v == null) return;
    if (Array.isArray(v)) { if (v.length) { const c = {}; v.forEach(id => c[id] = (c[id] || 0) + 1); parts.push(Object.entries(c).map(([id, n]) => { const lab = g.options.find(o => o.id === id)?.label || id; return n > 1 ? `${lab} x${n}` : lab; }).join(', ')); } }
    else { const o = g.options.find(x => x.id === v), def = g.options.find(x => x.def); if (o && o.id !== def?.id) parts.push(`${g.label}: ${o.label}`); }
  });
  return parts.join(' · ');
}
function haversine(a, b) { const R = 6371, dl = (b.lat - a.lat) * Math.PI / 180, dg = (b.lng - a.lng) * Math.PI / 180; const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dg / 2) ** 2; return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); }
function selectedStore() { return (state.data.stores || []).find(s => s.id === state.storeId) || ((state.data.stores || []).length === 1 ? state.data.stores[0] : null); }
function selectedAddr() { return state.addrId === 'pickup' ? null : state.addresses.find(a => a.id === state.addrId); }
function shipFee() {
  const addr = selectedAddr(), st = selectedStore();
  if (!addr || !st || !addr.lat || !st.lat) return 0;
  const km = haversine({ lat: st.lat, lng: st.lng }, { lat: addr.lat, lng: addr.lng });
  const tiers = state.data.shippingTiers || []; if (!tiers.length) return 0;
  const t = tiers.find(t => km >= t.min_km && (t.max_km == null || km < t.max_km));
  return (t || tiers[tiers.length - 1]).fee;
}
function weatherFee() { const w = state.data.weatherSurcharge; return (w && w.enabled && selectedAddr()) ? (w.fee || 0) : 0; }
function payable() { return Math.max(0, cartSubtotal() + shipFee() + weatherFee()); }

function openCart() {
  if (!state.cart.length) { toast('Giỏ hàng trống'); return; }
  renderCartSheet();
}
function renderCartSheet() {
  const addr = selectedAddr(), st = selectedStore(), w = state.data.weatherSurcharge;
  const bank = state.data.payment || {};
  const lines = state.cart.map((l, i) => `
    <div class="cart-line">
      <div class="cl-thumb" style="background:${esc(l.grad || 'var(--brand)')}">${l.img ? `<img src="${esc(l.img)}">` : '🧋'}</div>
      <div style="flex:1;min-width:0">
        <div class="cl-name">${esc(l.name)}</div>
        ${optsText(l) ? `<div class="cl-opts">${esc(optsText(l))}</div>` : ''}
        <div class="cl-price">${fmt(l.unit)}đ</div>
      </div>
      <div class="cl-right">
        <div class="stepper"><button data-i="${i}" data-d="-1" class="cl-q">−</button><span class="qn">${l.qty}</span><button data-i="${i}" data-d="1" class="cl-q">+</button></div>
      </div>
    </div>`).join('');

  const addrRow = `<button class="deliv" id="pickAddr">
    <span class="di">${addr ? '📍' : state.addrId === 'pickup' ? '🛍️' : '📍'}</span>
    <div style="flex:1;min-width:0">
      ${addr ? `<div class="dl">Giao đến ${esc(addr.label || '')}</div><div class="dt">${esc(addr.text)}</div>`
        : state.addrId === 'pickup' ? `<div class="dl">Nhận tại quầy</div><div class="dt">${esc(st ? st.name : 'Chọn quán')}</div>`
        : `<div class="dl">Chọn nơi nhận hàng</div><div class="dt" style="color:var(--brand)">Bấm để chọn</div>`}
    </div><span>›</span></button>`;

  const sf = shipFee(), wf = weatherFee();
  const summary = `
    <div class="csum"><span>Tạm tính</span><span class="v tnum">${fmt(cartSubtotal())}đ</span></div>
    ${addr ? `<div class="csum"><span>Phí giao hàng</span><span class="v tnum">${sf === 0 ? 'Miễn phí' : fmt(sf) + 'đ'}</span></div>` : ''}
    ${wf > 0 ? `<div class="csum" style="color:var(--hot)"><span>${esc(w.label || 'Phụ thu thời tiết xấu')}</span><span class="v tnum" style="color:var(--hot)">+${fmt(wf)}đ</span></div>` : ''}
    <div class="csum total"><span>Tổng cộng</span><span class="v tnum">${fmt(payable())}đ</span></div>`;

  const pay = `<div class="field-label">Cách thanh toán</div>
    <button class="pay-opt${state.payment === 'cod' ? ' on' : ''}" data-pay="cod"><span class="pay-ic">💵</span><span class="pay-txt"><b>${state.addrId === 'pickup' ? 'Thanh toán tại quầy' : 'Thanh toán khi nhận hàng'}</b><span>${state.addrId === 'pickup' ? 'Trả khi đến lấy' : 'Trả tiền mặt cho shipper'}</span></span><span class="aradio"></span></button>
    ${bank.bankEnabled ? `<button class="pay-opt${state.payment === 'bank' ? ' on' : ''}" data-pay="bank"><span class="pay-ic">🏦</span><span class="pay-txt"><b>Chuyển khoản ngân hàng</b><span>Quét VietQR sau khi đặt</span></span><span class="aradio"></span></button>` : ''}`;

  const html = `<div class="scrim"><div class="sheet" id="cartSheet">
    <div class="sheet-h"><h3>Giỏ hàng</h3><button class="sheet-x" id="cartX">✕</button></div>
    <div class="sheet-b">
      ${lines}
      <div style="margin-top:14px">${addrRow}</div>
      ${pay}
      <div style="margin-top:14px">${summary}</div>
      <div id="cartErr" style="color:var(--hot);font-size:13px;font-weight:600;margin-top:8px"></div>
    </div>
    <div class="sheet-f"><button class="btn primary" id="placeBtn">Đặt hàng · ${fmt(payable())}đ</button></div>
  </div></div>`;
  mountOverlay(html);

  $('#cartX').onclick = closeOverlay;
  $$('#cartSheet .cl-q').forEach(b => b.onclick = () => {
    const i = +b.dataset.i, d = +b.dataset.d;
    state.cart[i].qty += d; if (state.cart[i].qty <= 0) state.cart.splice(i, 1);
    if (!state.cart.length) { closeOverlay(); renderMenu(); return; }
    renderMenu(); renderCartSheet();
  });
  $('#pickAddr').onclick = openPlacePicker;
  $$('#cartSheet .pay-opt').forEach(b => b.onclick = () => { state.payment = b.dataset.pay; renderCartSheet(); });
  $('#placeBtn').onclick = placeOrder;
}

/* Chọn nơi nhận: giao tận nơi (địa chỉ) hoặc nhận tại quầy */
function openPlacePicker() {
  const addrs = state.addresses.map(a => `<button class="aopt${state.addrId === a.id ? ' on' : ''}" data-id="${a.id}"><span>📍</span><div style="flex:1;min-width:0"><div class="dt">${esc(a.label || 'Địa chỉ')}</div><div class="dl">${esc(a.text)}</div></div><span class="aradio"></span></button>`).join('');
  const html = `<div class="scrim"><div class="sheet">
    <div class="sheet-h"><h3>Nơi nhận hàng</h3><button class="sheet-x" id="ppX">✕</button></div>
    <div class="sheet-b">
      ${state.token ? `<div class="field-label">Giao đến địa chỉ</div>${addrs || '<div class="empty" style="padding:14px">Chưa có địa chỉ.</div>'}
      <button class="aopt" id="addAddr"><span>➕</span><div style="flex:1"><div class="dt">Thêm địa chỉ mới</div></div></button>`
      : `<div class="empty" style="padding:20px">Đăng nhập Zalo để giao tận nơi & lưu địa chỉ.</div>`}
      <div class="section-or">Hoặc</div>
      <button class="aopt${state.addrId === 'pickup' ? ' on' : ''}" id="pickPickup"><span>🛍️</span><div style="flex:1"><div class="dt">Nhận tại quầy</div><div class="dl">${esc(selectedStore()?.name || 'Chọn quán')}</div></div><span class="aradio"></span></button>
    </div>
  </div></div>`;
  mountOverlay(html);
  $('#ppX').onclick = () => { closeOverlay(); renderCartSheet(); };
  $$('.aopt[data-id]').forEach(b => b.onclick = () => { state.addrId = +b.dataset.id; closeOverlay(); renderCartSheet(); });
  const pk = $('#pickPickup'); if (pk) pk.onclick = () => { state.addrId = 'pickup'; if ((state.data.stores || []).length > 1) { closeOverlay(); openStorePicker('pickup'); } else { closeOverlay(); renderCartSheet(); } };
  const aa = $('#addAddr'); if (aa) aa.onclick = openAddAddr;
}

function openAddAddr() {
  const html = `<div class="scrim"><div class="sheet">
    <div class="sheet-h"><h3>Thêm địa chỉ</h3><button class="sheet-x" id="aaX">✕</button></div>
    <div class="sheet-b">
      <div class="field-label">Tên gợi nhớ</div><input class="inp" id="aaLabel" placeholder="Nhà / Công ty…" />
      <div class="field-label">Địa chỉ nhận hàng</div><textarea class="inp" id="aaText" rows="2" placeholder="Số nhà, đường, phường/quận…"></textarea>
      <div style="font-size:12px;color:var(--ink-3);margin-top:8px">Gợi ý: nhập rõ để tính phí giao chính xác.</div>
    </div>
    <div class="sheet-f"><button class="btn primary" id="aaSave">Lưu địa chỉ</button></div>
  </div></div>`;
  mountOverlay(html);
  $('#aaX').onclick = () => { closeOverlay(); openPlacePicker(); };
  $('#aaSave').onclick = async () => {
    const text = $('#aaText').value.trim(); if (text.length < 5) { toast('Nhập địa chỉ chi tiết hơn', true); return; }
    try {
      // Geocode qua API bản đồ của website để lấy toạ độ (tính phí ship).
      let lat = null, lng = null;
      try { const g = await api('/geo/geocode?q=' + encodeURIComponent(text), { auth: true }); if (g.ok) { lat = g.lat; lng = g.lng; } } catch (e) {}
      const r = await api('/addresses', { method: 'POST', auth: true, body: { label: $('#aaLabel').value.trim() || 'Nhà', address_text: text, lat, lng, def: state.addresses.length === 0 } });
      state.addresses.unshift(r.address); state.addrId = r.address.id;
      closeOverlay(); renderCartSheet(); toast('Đã lưu địa chỉ');
    } catch (e) { toast(e.message, true); }
  };
}

function openStorePicker(mode) {
  const stores = state.data.stores || [];
  const html = `<div class="scrim"><div class="sheet">
    <div class="sheet-h"><h3>${mode === 'pickup' ? 'Chọn quán nhận' : 'Chọn cửa hàng'}</h3><button class="sheet-x" id="spX">✕</button></div>
    <div class="sheet-b">${stores.map(s => `<button class="aopt${state.storeId === s.id ? ' on' : ''}" data-id="${s.id}"><span>🏪</span><div style="flex:1;min-width:0"><div class="dt">${esc(s.name)}</div><div class="dl">${esc(s.address || '')}</div></div><span class="aradio"></span></button>`).join('')}</div>
  </div></div>`;
  mountOverlay(html);
  $('#spX').onclick = () => { closeOverlay(); if ($('#cartSheet') || mode === 'pickup') { if (mode === 'pickup') renderCartSheet(); } };
  $$('.aopt[data-id]').forEach(b => b.onclick = () => {
    state.storeId = +b.dataset.id; if (mode === 'pickup') state.addrId = 'pickup';
    renderStoreName(); closeOverlay(); if (mode === 'pickup') renderCartSheet();
  });
}

/* ---------- Place order ---------- */
async function placeOrder() {
  if (!state.token) { closeOverlay(); showScreen('account'); toast('Vui lòng đăng nhập Zalo để đặt hàng', true); return; }
  const addr = selectedAddr();
  if (state.addrId !== 'pickup' && !addr) { $('#cartErr').textContent = 'Vui lòng chọn địa chỉ giao hoặc nhận tại quầy.'; return; }
  if ((state.data.stores || []).length > 1 && !state.storeId) { $('#cartErr').textContent = 'Vui lòng chọn cửa hàng.'; return; }

  const btn = $('#placeBtn'); btn.disabled = true; btn.textContent = 'Đang đặt…';
  try {
    const r = await api('/orders', { method: 'POST', auth: true, body: {
      lines: state.cart.map(l => ({ id: l.id, qty: l.qty, selections: l.selections || null })),
      store_id: state.storeId,
      shipping_fee: shipFee(),
      payment_method: state.data.payment?.bankEnabled && state.payment === 'bank' ? 'bank' : 'cod',
      delivery_address: addr ? addr.text : null,
      delivery_phone: addr ? (state.user?.phone || null) : null,
      delivery_lat: addr?.lat ?? null, delivery_lng: addr?.lng ?? null,
    } });
    state.cart = [];
    closeOverlay(); renderMenu();
    showOrderSuccess(r);
    refreshMe();
  } catch (e) { $('#cartErr').textContent = e.message; btn.disabled = false; btn.textContent = 'Đặt hàng'; }
}

function vietQr(code, amount) {
  const b = state.data.payment || {}; if (!b.bankEnabled) return null;
  return `https://img.vietqr.io/image/${encodeURIComponent(b.bankCode)}-${encodeURIComponent(b.accountNumber)}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(b.accountName || '')}`;
}
function showOrderSuccess(r) {
  const b = state.data.payment || {};
  const qr = (r.payment_method === 'bank') ? vietQr(r.order_code, r.total_amount) : null;
  const html = `<div class="scrim"><div class="sheet"><div class="sheet-b" style="text-align:center;padding:26px 18px">
    <div style="font-size:52px">🎉</div>
    <h3 style="font-family:var(--display);font-size:22px;margin:8px 0 4px">Đặt hàng thành công!</h3>
    <p style="color:var(--ink-2);font-size:14px;margin:0">Mã đơn <b>${esc(r.order_code)}</b>${r.points_earned > 0 ? ` · +${fmt(r.points_earned)} điểm khi hoàn tất` : ''}</p>
    ${qr ? `<div class="qr-pay"><div class="qr-pay-t">Quét mã để chuyển khoản</div><img src="${esc(qr)}" alt="VietQR">
      <div class="qr-info"><div><span>Ngân hàng</span><b>${esc(b.bankCode)}</b></div><div><span>Số TK</span><b>${esc(b.accountNumber)}</b></div>${b.accountName ? `<div><span>Chủ TK</span><b>${esc(b.accountName)}</b></div>` : ''}<div><span>Số tiền</span><b>${fmt(r.total_amount)}đ</b></div><div><span>Nội dung</span><b>${esc(r.order_code)}</b></div></div>
      <div class="qr-note">Chuyển đúng số tiền & nội dung <b>${esc(r.order_code)}</b> để quán xác nhận nhanh.</div></div>` : ''}
    <button class="btn primary" id="okOrders" style="margin-top:18px">Theo dõi đơn hàng</button>
    <button class="btn ghost" id="okMore" style="margin-top:10px">Đặt thêm món khác</button>
  </div></div></div>`;
  mountOverlay(html);
  $('#okOrders').onclick = () => { closeOverlay(); showScreen('orders'); };
  $('#okMore').onclick = closeOverlay;
}

/* ---------- Orders ---------- */
async function renderOrders() {
  const wrap = $('#ordersList');
  if (!state.token) { wrap.innerHTML = `<div class="empty">Đăng nhập Zalo để xem đơn hàng.</div>`; return; }
  wrap.innerHTML = `<div class="loading">Đang tải…</div>`;
  try {
    const r = await api('/orders', { auth: true });
    state._bank = r.bank || {};
    const orders = r.orders || [];
    if (!orders.length) { wrap.innerHTML = `<div class="empty">Chưa có đơn hàng nào.</div>`; return; }
    const stMeta = { new: 'Đơn mới', making: 'Đang pha', ready: 'Sẵn sàng', done: 'Hoàn tất', cancel: 'Đã huỷ' };
    wrap.innerHTML = orders.map(o => `<button class="ocard" data-code="${esc(o.code)}">
      <div style="flex:1;min-width:0">
        <div class="oc-code">${esc(o.code)} <span class="badge ${esc(o.status)}">${esc(stMeta[o.status] || o.status)}</span></div>
        <div class="oc-sub">${esc(o.time)} · ${o.type === 'ship' ? 'Giao tận nơi' : 'Nhận tại quầy'} · ${o.items.length} món</div>
        ${o.paymentMethod === 'bank' ? `<div class="oc-sub"><span class="badge ${o.paymentStatus === 'paid' ? 'paid' : 'unpaid'}">${o.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span></div>` : ''}
      </div>
      <div class="oc-total tnum">${fmt(o.total)}đ</div>
    </button>`).join('');
    $$('.ocard').forEach(b => b.onclick = () => showOrderDetail(orders.find(o => o.code === b.dataset.code)));
  } catch (e) { wrap.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}
function showOrderDetail(o) {
  const canPay = o.paymentMethod === 'bank' && o.paymentStatus !== 'paid' && o.status !== 'cancel';
  const b = state._bank || {};
  const qr = canPay && b.ready ? `https://img.vietqr.io/image/${encodeURIComponent(b.bankCode)}-${encodeURIComponent(b.accountNumber)}-compact2.png?amount=${o.total}&addInfo=${encodeURIComponent(o.code)}&accountName=${encodeURIComponent(b.accountName || '')}` : null;
  const items = o.items.map(it => `<div class="csum"><span>${it.qty}× ${esc(it.name)}</span><span class="v tnum">${fmt((it.unit || 0) * it.qty)}đ</span></div>`).join('');
  const html = `<div class="scrim"><div class="sheet">
    <div class="sheet-h"><h3>${esc(o.code)}</h3><button class="sheet-x" id="odX">✕</button></div>
    <div class="sheet-b">
      ${items}
      <div class="csum total"><span>Tổng cộng</span><span class="v tnum">${fmt(o.total)}đ</span></div>
      <div class="field-label">Thanh toán</div>
      <div class="csum"><span>${o.paymentMethod === 'bank' ? 'Chuyển khoản ngân hàng' : 'Thanh toán khi nhận'}</span><span class="badge ${o.paymentStatus === 'paid' ? 'paid' : 'unpaid'}">${o.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span></div>
      ${qr ? `<div class="qr-pay"><div class="qr-pay-t">Quét mã để chuyển khoản</div><img src="${qr}" alt="VietQR"><div class="qr-info"><div><span>Số tiền</span><b>${fmt(o.total)}đ</b></div><div><span>Nội dung</span><b>${esc(o.code)}</b></div></div></div>` : ''}
    </div>
  </div></div>`;
  mountOverlay(html);
  $('#odX').onclick = closeOverlay;
}

/* ---------- Account / Zalo login ---------- */
function renderAccount() {
  const el = $('#accountBody');
  if (state.token && state.user) {
    const u = state.user;
    el.innerHTML = `
      <div class="intro"><h1>Tài khoản</h1></div>
      <div class="acc-card">
        <div class="acc-name">${esc(u.name)}</div>
        <div class="acc-phone">${esc(u.phone || '')}${u.tier ? ' · Hạng ' + esc(u.tier.name) : ''}</div>
        <div class="acc-pts">
          <div class="acc-pt"><div class="n">${fmt(u.points)}</div><div class="l">Điểm hiện có</div></div>
          <div class="acc-pt"><div class="n">${fmt(u.total_orders)}</div><div class="l">Đơn đã đặt</div></div>
        </div>
      </div>
      <div class="acc-row">🎁 Mã giới thiệu: <b style="margin-left:auto">${esc(u.referral_code || '—')}</b></div>
      <button class="acc-row" id="logoutBtn" style="width:100%;color:var(--hot)">↩︎ Đăng xuất</button>`;
    $('#logoutBtn').onclick = () => logout(true);
  } else {
    el.innerHTML = `
      <div class="intro"><h1>Tài khoản</h1><p>Đăng nhập để đặt hàng & tích điểm.</p></div>
      <div class="acc-card" style="text-align:center">
        <div style="font-size:44px">🧋</div>
        <div class="acc-name" style="font-size:18px;margin-top:6px">Chào mừng đến Laboong</div>
        <div class="acc-phone">Đăng nhập bằng Zalo để bắt đầu</div>
      </div>
      <button class="btn primary" id="zaloLogin" style="margin-top:16px">Đăng nhập với Zalo</button>
      <p style="font-size:12px;color:var(--ink-3);text-align:center;margin-top:10px;line-height:1.5">Đăng nhập hoạt động khi mở trong ứng dụng Zalo.<br>Bạn vẫn có thể xem thực đơn mà không cần đăng nhập.</p>`;
    $('#zaloLogin').onclick = loginWithZalo;
  }
}

/* Zalo Mini App login: dùng SDK Zalo nếu có; ngoài Zalo thì báo hướng dẫn.
   Wiring thật: cung cấp window.__zaloGetTokens() trả {accessToken, phoneToken}. */
async function loginWithZalo() {
  try {
    let tokens = null;
    if (typeof window.__zaloGetTokens === 'function') {
      tokens = await window.__zaloGetTokens();               // hook do bạn cắm SDK Zalo
    } else if (window.zmp && window.zmp.getAccessToken) {
      const accessToken = await window.zmp.getAccessToken();
      let phoneToken = null; try { phoneToken = (await window.zmp.getPhoneNumber())?.token; } catch (e) {}
      tokens = { accessToken, phoneToken };
    }
    if (!tokens || !tokens.accessToken) { toast('Hãy mở Mini App trong Zalo để đăng nhập', true); return; }

    const r = await api('/auth/zalo', { method: 'POST', body: { access_token: tokens.accessToken, phone_token: tokens.phoneToken || null } });
    state.token = r.token; localStorage.setItem(TOKEN_KEY, r.token);
    state.user = r.user; renderGreet(); await loadAddresses(); renderAccount();
    toast(r.is_new ? 'Chào mừng thành viên mới! 🎉' : 'Đăng nhập thành công');
  } catch (e) {
    if (/need_phone|số điện thoại/i.test(e.message)) toast('Cần cấp quyền số điện thoại trong Zalo', true);
    else toast(e.message, true);
  }
}
async function loadAddresses() {
  if (!state.token) return;
  try { const r = await api('/addresses', { auth: true }); state.addresses = r.addresses || []; const def = state.addresses.find(a => a.def); if (def) state.addrId = def.id; }
  catch (e) {}
}
function logout(server = true) {
  if (server && state.token) { api('/auth/logout', { method: 'POST', auth: true }).catch(() => {}); }
  state.token = null; state.user = null; state.addresses = []; state.addrId = 'pickup';
  localStorage.removeItem(TOKEN_KEY);
  renderGreet(); renderAccount();
}

/* ---------- Overlay + cartbar ---------- */
function mountOverlay(html) { const o = $('#overlay'); o.innerHTML = html; $('.scrim', o).onclick = (e) => { if (e.target.classList.contains('scrim')) closeOverlay(); }; }
function closeOverlay() { $('#overlay').innerHTML = ''; }
function renderCartbar() {
  const bar = $('#cartbar'), n = cartCount();
  bar.hidden = n === 0;
  $('#cbCount').textContent = n;
  $('#cbSummary').textContent = n + ' món';
  $('#cbTotal').textContent = fmt(cartSubtotal()) + 'đ';
}

boot();
