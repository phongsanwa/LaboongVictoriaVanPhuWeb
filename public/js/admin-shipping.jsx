/* global React, ReactDOM, Icon, fmt, NAV_URLS, adminHref, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo } = React;

const SH_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const DATA = window.ADMIN_SHIPPING_DATA || { tiers: [], promos: [], urls: {} };

function csrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.content || '';
}
async function apiCall(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty body */ }
  return { ok: res.ok, data };
}

function fmtRange(t) {
  if (t.max_km === null) return `Từ ${t.min_km} km trở lên`;
  return `${t.min_km} – ${t.max_km} km`;
}
function fmtFee(fee) {
  return fee === 0 ? 'Miễn phí' : fmt(fee) + 'đ';
}
function fmtPromoCondition(p) {
  const km = p.max_km !== null ? ` · bán kính ≤ ${p.max_km} km` : '';
  const amt = p.min_order_amount > 0 ? `Đơn ≥ ${fmt(p.min_order_amount)}đ` : 'Mọi giá trị đơn';
  return `${amt}${km}`;
}
function fmtPromoDiscount(p) {
  if (p.discount_type === 'free') return 'Miễn phí ship';
  if (p.discount_type === 'percent') return `Giảm ${p.discount_value}% phí ship`;
  return `Giảm ${fmt(p.discount_value)}đ phí ship`;
}

/* ── Tier editor drawer ──────────────────────────────────────────────── */
function TierDrawer({ tier, urls, onSave, onClose }) {
  const blank = { label: '', min_km: '', max_km: '', fee: '', is_active: true };
  const [form, setForm] = useState(() => tier ? {
    label: tier.label,
    min_km: String(tier.min_km),
    max_km: tier.max_km !== null ? String(tier.max_km) : '',
    fee: String(tier.fee),
    is_active: tier.is_active,
  } : blank);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.label.trim()) { setErr('Vui lòng nhập tên mức phí'); return; }
    if (form.min_km === '' || isNaN(+form.min_km)) { setErr('Từ km không hợp lệ'); return; }
    setSaving(true); setErr('');
    const body = {
      label: form.label.trim(),
      min_km: parseFloat(form.min_km),
      max_km: form.max_km !== '' ? parseFloat(form.max_km) : null,
      fee: parseInt(form.fee) || 0,
      is_active: form.is_active,
    };
    const url = tier
      ? urls.update.replace(':id', tier.id)
      : urls.store;
    const method = tier ? 'PUT' : 'POST';
    const { ok, data } = await apiCall(method, url, body);
    setSaving(false);
    if (!ok) { setErr(data.message || 'Có lỗi xảy ra'); return; }
    onSave(data.tier);
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="dr-h">
          <h3>{tier ? 'Chỉnh sửa mức phí' : 'Thêm mức phí ship'}</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="dr-b">
          <label className="lbl">Tên mức phí</label>
          <input className="inp" placeholder="VD: Giao hàng gần, Giao hàng xa…"
            value={form.label} onChange={e => set('label', e.target.value)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div>
              <label className="lbl">Từ (km)</label>
              <input className="inp" type="number" min="0" step="0.1" placeholder="0"
                value={form.min_km} onChange={e => set('min_km', e.target.value)} />
            </div>
            <div>
              <label className="lbl">Đến (km) <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>– để trống = không giới hạn</span></label>
              <input className="inp" type="number" min="0" step="0.1" placeholder="Không giới hạn"
                value={form.max_km} onChange={e => set('max_km', e.target.value)} />
            </div>
          </div>

          <label className="lbl" style={{ marginTop: 16 }}>Phí ship (đ) <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>– nhập 0 = miễn phí</span></label>
          <input className="inp" type="number" min="0" step="1000" placeholder="0"
            value={form.fee} onChange={e => set('fee', e.target.value)} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 }}>
            <button
              className={'tog' + (form.is_active ? ' on' : '')}
              onClick={() => set('is_active', !form.is_active)}
              style={{ flexShrink: 0 }}
            >
              <span className="tok" />
            </button>
            <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>Kích hoạt mức phí này</span>
          </div>

          {err && <div className="cp-err" style={{ marginTop: 14 }}><Icon name="alert" size={14} color="var(--hot)" /> {err}</div>}
        </div>
        <div className="dr-f">
          <button className="btn secondary" onClick={onClose}>Hủy</button>
          <button className="btn primary" disabled={saving} onClick={save}>
            {saving ? 'Đang lưu…' : (tier ? 'Lưu thay đổi' : 'Thêm mức phí')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shipping Promo editor drawer ────────────────────────────────────── */
function PromoDrawer({ promo, urls, onSave, onClose }) {
  const blank = { name: '', min_order_amount: '', max_km: '', discount_type: 'free', discount_value: '' };
  const [form, setForm] = useState(() => promo ? {
    name: promo.name,
    min_order_amount: promo.min_order_amount > 0 ? String(promo.min_order_amount) : '',
    max_km: promo.max_km !== null ? String(promo.max_km) : '',
    discount_type: promo.discount_type,
    discount_value: promo.discount_type === 'free' ? '' : String(promo.discount_value),
  } : blank);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { setErr('Vui lòng nhập tên khuyến mãi'); return; }
    if (form.min_order_amount !== '' && (isNaN(+form.min_order_amount) || +form.min_order_amount < 0)) { setErr('Giá trị đơn hàng không hợp lệ'); return; }
    if (form.discount_type !== 'free' && (form.discount_value === '' || isNaN(+form.discount_value))) {
      setErr('Giá trị giảm không hợp lệ'); return;
    }
    setSaving(true); setErr('');
    const body = {
      name: form.name.trim(),
      min_order_amount: parseInt(form.min_order_amount) || 0,
      max_km: form.max_km !== '' ? parseFloat(form.max_km) : null,
      discount_type: form.discount_type,
      discount_value: form.discount_type === 'free' ? 0 : (parseInt(form.discount_value) || 0),
    };
    const url = promo
      ? urls.promoUpdate.replace(':id', promo.id)
      : urls.promoStore;
    const method = promo ? 'PUT' : 'POST';
    const { ok, data } = await apiCall(method, url, body);
    setSaving(false);
    if (!ok) { setErr(data.message || 'Có lỗi xảy ra'); return; }
    onSave(data.promo);
  };

  const discountTypeLabels = { free: 'Miễn phí ship', percent: 'Giảm theo %', amount: 'Giảm số tiền cố định' };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="dr-h">
          <h3>{promo ? 'Chỉnh sửa khuyến mãi ship' : 'Thêm khuyến mãi phí ship'}</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="dr-b">
          <label className="lbl">Tên khuyến mãi</label>
          <input className="inp" placeholder="VD: Miễn phí ship cuối tuần, Đơn lớn miễn phí…"
            value={form.name} onChange={e => set('name', e.target.value)} />

          <label className="lbl" style={{ marginTop: 16 }}>Tổng giá hoá đơn tối thiểu (đ) <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>– để trống = mọi giá trị đơn</span></label>
          <input className="inp" type="number" min="0" step="1000" placeholder="Không yêu cầu"
            value={form.min_order_amount} onChange={e => set('min_order_amount', e.target.value)} />
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>Nếu điền, khách đặt đơn từ số tiền này trở lên mới được áp khuyến mãi</div>

          <label className="lbl" style={{ marginTop: 16 }}>Giới hạn bán kính (km) <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>– để trống = mọi khoảng cách</span></label>
          <input className="inp" type="number" min="0" step="0.5" placeholder="Không giới hạn"
            value={form.max_km} onChange={e => set('max_km', e.target.value)} />

          <label className="lbl" style={{ marginTop: 16 }}>Loại giảm giá ship</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {Object.entries(discountTypeLabels).map(([k, lbl]) => (
              <button key={k}
                className={'btn' + (form.discount_type === k ? ' primary' : ' secondary')}
                style={{ fontSize: 13, padding: '6px 14px' }}
                onClick={() => set('discount_type', k)}
              >{lbl}</button>
            ))}
          </div>

          {form.discount_type !== 'free' && (
            <>
              <label className="lbl" style={{ marginTop: 16 }}>
                {form.discount_type === 'percent' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (đ)'}
              </label>
              <input className="inp" type="number" min="0"
                step={form.discount_type === 'percent' ? 1 : 1000}
                placeholder={form.discount_type === 'percent' ? '10' : '5000'}
                value={form.discount_value} onChange={e => set('discount_value', e.target.value)} />
            </>
          )}

          {err && <div className="cp-err" style={{ marginTop: 14 }}><Icon name="alert" size={14} color="var(--hot)" /> {err}</div>}
        </div>
        <div className="dr-f">
          <button className="btn secondary" onClick={onClose}>Hủy</button>
          <button className="btn primary" disabled={saving} onClick={save}>
            {saving ? 'Đang lưu…' : (promo ? 'Lưu thay đổi' : 'Thêm khuyến mãi')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main App ───────────────────────────────────────────────────────── */
function ShippingApp() {
  const [tw, setTweak] = useTweaks(SH_DEFAULTS);
  const [tiers, setTiers] = useState(() => DATA.tiers.slice());
  const [promos, setPromos] = useState(() => DATA.promos.slice());
  const [sideOpen, setSideOpen] = useState(false);
  const [editor, setEditor] = useState(null);       // null | { tier } for tier editor
  const [promoEditor, setPromoEditor] = useState(null); // null | { promo } for promo editor
  const [delTarget, setDelTarget] = useState(null);
  const [promoDelTarget, setPromoDelTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty('--brand', b);
    r.style.setProperty('--brand-deep', d);
    r.setAttribute('data-theme', tw.dark ? 'dark' : 'light');
  }, [tw.brand, tw.dark]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  /* ── Tier handlers ── */
  const handleSave = (saved) => {
    setTiers(list => {
      const i = list.findIndex(t => t.id === saved.id);
      if (i >= 0) { const next = [...list]; next[i] = saved; return next; }
      return [...list, saved];
    });
    setEditor(null);
    flash(editor?.tier ? `Đã cập nhật "${saved.label}"` : `Đã thêm "${saved.label}"`);
  };

  const doDelete = async () => {
    const t = delTarget;
    const { ok, data } = await apiCall('DELETE', DATA.urls.destroy.replace(':id', t.id));
    setDelTarget(null);
    if (!ok) { flash(data.message || 'Có lỗi xảy ra'); return; }
    setTiers(list => list.filter(x => x.id !== t.id));
    flash(`Đã xoá "${t.label}"`);
  };

  const doToggle = async (t) => {
    const { ok, data } = await apiCall('PUT', DATA.urls.update.replace(':id', t.id), { ...t, is_active: !t.is_active });
    if (!ok) { flash(data.message || 'Có lỗi xảy ra'); return; }
    setTiers(list => list.map(x => x.id === t.id ? data.tier : x));
  };

  /* ── Promo handlers ── */
  const handlePromoSave = (saved) => {
    setPromos(list => {
      const i = list.findIndex(p => p.id === saved.id);
      if (i >= 0) { const next = [...list]; next[i] = saved; return next; }
      return [...list, saved];
    });
    setPromoEditor(null);
    flash(promoEditor?.promo ? `Đã cập nhật "${saved.name}"` : `Đã thêm "${saved.name}"`);
  };

  const doPromoDelete = async () => {
    const p = promoDelTarget;
    const { ok, data } = await apiCall('DELETE', DATA.urls.promoDestroy.replace(':id', p.id));
    setPromoDelTarget(null);
    if (!ok) { flash(data.message || 'Có lỗi xảy ra'); return; }
    setPromos(list => list.filter(x => x.id !== p.id));
    flash(`Đã xoá "${p.name}"`);
  };

  const doPromoToggle = async (p) => {
    const { ok, data } = await apiCall('POST', DATA.urls.promoToggle.replace(':id', p.id));
    if (!ok) { flash(data.message || 'Có lỗi xảy ra'); return; }
    setPromos(list => list.map(x => x.id === p.id ? data.promo : x));
  };

  const logout = async (e) => {
    e.preventDefault();
    await apiCall('POST', '/logout');
    location.href = NAV_URLS.login;
  };

  const activeTiers = useMemo(() => tiers.filter(t => t.is_active), [tiers]);
  const sortedTiers = useMemo(() => [...tiers].sort((a, b) => a.sort_order - b.sort_order || a.min_km - b.min_km), [tiers]);
  const sortedPromos = useMemo(() => [...promos].sort((a, b) => a.sort_order - b.sort_order || a.min_order_amount - b.min_order_amount), [promos]);

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Phí ship" badges={{ "Phí ship": String(tiers.length) }} admin={window.ADMIN_SHIPPING_DATA?.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Phí ship</div>
            <h1>Phí giao hàng</h1>
          </div>
          <div className="topbar-spacer" />
          <button className="btn primary" onClick={() => setEditor({ tier: null })}>
            <Icon name="plus" size={16} color="#fff" /> Thêm mức phí
          </button>
        </header>

        <div className="content">
          {/* Stats */}
          <div className="stats">
            <div className="stat-card">
              <div className="sc-val">{tiers.length}</div>
              <div className="sc-lbl">Tổng mức phí</div>
            </div>
            <div className="stat-card">
              <div className="sc-val">{activeTiers.length}</div>
              <div className="sc-lbl">Đang hoạt động</div>
            </div>
            <div className="stat-card">
              <div className="sc-val">{activeTiers.filter(t => t.fee === 0).length}</div>
              <div className="sc-lbl">Mức miễn phí</div>
            </div>
            <div className="stat-card">
              <div className="sc-val">{promos.filter(p => p.is_active).length}</div>
              <div className="sc-lbl">KM phí ship</div>
            </div>
          </div>

          {/* Info banner */}
          <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--r)', padding: '14px 18px', marginBottom: 20, fontSize: 13.5, color: 'var(--ink-2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="info" size={16} color="var(--brand)" />
            <div>
              Phí ship được tính tự động theo khoảng cách từ <strong>địa chỉ giao hàng của khách</strong> đến <strong>chi nhánh được chọn</strong>.
              Đảm bảo cửa hàng đã nhập <strong>tọa độ GPS</strong> (lat/lng) trong mục <a href={NAV_URLS.adminStores} style={{ color: 'var(--brand)' }}>Cửa hàng</a>.
            </div>
          </div>

          {/* ── Tier list ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-1)', margin: 0 }}>Bảng phí theo khoảng cách</h2>
          </div>
          {sortedTiers.length === 0 ? (
            <div className="empty-state">
              <div className="ei"><Icon name="truck" size={30} /></div>
              <div>Chưa có mức phí ship nào.</div>
              <button className="btn primary" style={{ marginTop: 16 }} onClick={() => setEditor({ tier: null })}>
                <Icon name="plus" size={16} color="#fff" /> Thêm mức phí đầu tiên
              </button>
            </div>
          ) : (
            <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', marginBottom: 36 }}>
              {sortedTiers.map(t => (
                <div key={t.id} className={'rcard' + (!t.is_active ? ' dim' : '')}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: t.fee === 0 ? 'linear-gradient(135deg,#0F623F,#1AA86A)' : 'linear-gradient(135deg,#1E8FA8,#4FC3D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="truck" size={22} color="#fff" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-1)', marginBottom: 2 }}>{t.label}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 6 }}>{fmtRange(t)}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: t.fee === 0 ? 'var(--brand)' : 'var(--ink-1)' }}>{fmtFee(t.fee)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button
                        className={'tog' + (t.is_active ? ' on' : '')}
                        onClick={() => doToggle(t)}
                        title={t.is_active ? 'Tắt' : 'Bật'}
                      ><span className="tok" /></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: '1px solid var(--bdr)', paddingTop: 12 }}>
                    <button className="btn secondary" style={{ flex: 1 }} onClick={() => setEditor({ tier: t })}>
                      <Icon name="edit" size={15} color="currentColor" /> Sửa
                    </button>
                    <button className="btn danger" onClick={() => setDelTarget(t)}>
                      <Icon name="trash" size={15} color="currentColor" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Shipping Promotions ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 8 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-1)', margin: 0 }}>Khuyến mãi phí ship</h2>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>Tự động áp dụng khi đơn hàng đạt điều kiện về giá trị và khoảng cách</div>
            </div>
            <button className="btn primary" onClick={() => setPromoEditor({ promo: null })}>
              <Icon name="plus" size={16} color="#fff" /> Thêm khuyến mãi
            </button>
          </div>

          {sortedPromos.length === 0 ? (
            <div className="empty-state" style={{ marginBottom: 0 }}>
              <div className="ei"><Icon name="tag" size={30} /></div>
              <div>Chưa có khuyến mãi phí ship nào.</div>
              <button className="btn primary" style={{ marginTop: 16 }} onClick={() => setPromoEditor({ promo: null })}>
                <Icon name="plus" size={16} color="#fff" /> Thêm khuyến mãi đầu tiên
              </button>
            </div>
          ) : (
            <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {sortedPromos.map(p => (
                <div key={p.id} className={'rcard' + (!p.is_active ? ' dim' : '')}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: p.discount_type === 'free' ? 'linear-gradient(135deg,#0F623F,#1AA86A)' : 'linear-gradient(135deg,#7A4A28,#B87045)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="tag" size={22} color="#fff" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-1)' }}>{p.name}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: p.discount_type === 'free' ? '#0F623F20' : '#7A4A2820', color: p.discount_type === 'free' ? 'var(--brand)' : '#B87045' }}>{p.badge}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>{fmtPromoCondition(p)}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: p.discount_type === 'free' ? 'var(--brand)' : 'var(--ink-1)' }}>{fmtPromoDiscount(p)}</div>
                    </div>
                    <div>
                      <button
                        className={'tog' + (p.is_active ? ' on' : '')}
                        onClick={() => doPromoToggle(p)}
                        title={p.is_active ? 'Tắt' : 'Bật'}
                      ><span className="tok" /></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: '1px solid var(--bdr)', paddingTop: 12 }}>
                    <button className="btn secondary" style={{ flex: 1 }} onClick={() => setPromoEditor({ promo: p })}>
                      <Icon name="edit" size={15} color="currentColor" /> Sửa
                    </button>
                    <button className="btn danger" onClick={() => setPromoDelTarget(p)}>
                      <Icon name="trash" size={15} color="currentColor" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="toast show">{toast}</div>}

      {/* Tier editor drawer */}
      {editor && (
        <TierDrawer
          tier={editor.tier}
          urls={DATA.urls}
          onSave={handleSave}
          onClose={() => setEditor(null)}
        />
      )}

      {/* Promo editor drawer */}
      {promoEditor && (
        <PromoDrawer
          promo={promoEditor.promo}
          urls={DATA.urls}
          onSave={handlePromoSave}
          onClose={() => setPromoEditor(null)}
        />
      )}

      {/* Tier delete confirm */}
      {delTarget && (
        <div className="scrim" style={{ zIndex: 200 }} onClick={() => setDelTarget(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-ic danger"><Icon name="trash" size={22} color="#fff" /></div>
            <h3>Xoá mức phí?</h3>
            <p>Mức <strong>{delTarget.label}</strong> sẽ bị xoá vĩnh viễn và không thể khôi phục.</p>
            <div className="cm-actions">
              <button className="btn secondary" onClick={() => setDelTarget(null)}>Hủy</button>
              <button className="btn danger" onClick={doDelete}>Xác nhận xoá</button>
            </div>
          </div>
        </div>
      )}

      {/* Promo delete confirm */}
      {promoDelTarget && (
        <div className="scrim" style={{ zIndex: 200 }} onClick={() => setPromoDelTarget(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-ic danger"><Icon name="trash" size={22} color="#fff" /></div>
            <h3>Xoá khuyến mãi?</h3>
            <p>Khuyến mãi <strong>{promoDelTarget.name}</strong> sẽ bị xoá vĩnh viễn.</p>
            <div className="cm-actions">
              <button className="btn secondary" onClick={() => setPromoDelTarget(null)}>Hủy</button>
              <button className="btn danger" onClick={doPromoDelete}>Xác nhận xoá</button>
            </div>
          </div>
        </div>
      )}

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F","#07432A"],["#005A36","#003D24"],["#7A4A28","#56331A"],["#6B4FA0","#4A357A"]]}
          onChange={v => setTweak('brand', v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak('dark', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ShippingApp />);
