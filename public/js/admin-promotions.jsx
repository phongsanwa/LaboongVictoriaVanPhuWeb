/* global React, ReactDOM, Icon, fmt, adminHref, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo } = React;

const PM_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const LIVE      = !!window.ADMIN_PROMOTIONS_DATA;
const LIVE_URLS = window.ADMIN_PROMOTIONS_DATA?.urls || {};

function csrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

async function apiFetch(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Có lỗi xảy ra');
  return json;
}

/* ─── PromoEditor modal ──────────────────────────────────────────── */
function PromoEditor({ initial, allProducts, onClose, onSave, saving }) {
  const isEdit = !!initial.id;
  const [name,              setName]          = useState(initial.name       || '');
  const [code,              setCode]          = useState(initial.code       || '');
  const [type,              setType]          = useState(initial.type       || 'percent');
  const [value,             setValue]         = useState(initial.value      ? String(initial.value) : '');
  const [scope,             setScope]         = useState(initial.scope      || 'all');
  const [appliesTo,         setAppliesTo]     = useState(initial.applies_to || 'ORDER');
  const [minPurchase,       setMinPurchase]   = useState(initial.min_purchase ? String(initial.min_purchase) : '');
  const [maxDiscount,       setMaxDiscount]   = useState(initial.max_discount ? String(initial.max_discount) : '');
  const [validFrom,         setValidFrom]     = useState(initial.valid_from  || '');
  const [validUntil,        setValidUntil]    = useState(initial.valid_until || '');
  const [limitTotal,        setLimitTotal]    = useState(initial.usage_limit_total        ? String(initial.usage_limit_total) : '');
  const [limitPerCustomer,  setLimitPerCustomer] = useState(initial.usage_limit_per_customer != null ? String(initial.usage_limit_per_customer) : '1');
  const [selectedIds,       setSelectedIds]   = useState(new Set(initial.product_ids || []));
  const [productSearch,     setProductSearch] = useState('');

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const numVal   = parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
  const maxVal   = type === 'percent' ? 100 : 999999999;
  const valid    = name.trim().length > 0 && numVal >= 1 && numVal <= maxVal;

  const toggleProduct = id => setSelectedIds(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(p => p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q));
  }, [allProducts, productSearch]);

  const submit = () => {
    if (!valid || saving) return;
    onSave({
      name:                     name.trim(),
      code:                     code.trim().toUpperCase() || null,
      type,
      value:                    numVal,
      scope,
      applies_to:               appliesTo,
      product_ids:              scope === 'specific' ? [...selectedIds] : [],
      min_purchase:             minPurchase ? parseFloat(minPurchase) : null,
      max_discount:             maxDiscount ? parseFloat(maxDiscount) : null,
      valid_from:               validFrom || null,
      valid_until:              validUntil || null,
      usage_limit_total:        limitTotal ? parseInt(limitTotal, 10) : null,
      usage_limit_per_customer: limitPerCustomer ? parseInt(limitPerCustomer, 10) : null,
    });
  };

  const previewBadge = numVal > 0
    ? (type === 'percent' ? `-${numVal}%` : `-${fmt(numVal)}đ`)
    : null;

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name={isEdit ? 'edit' : 'percent'} size={20} /></div>
          <div>
            <h3>{isEdit ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'}</h3>
            <p>{isEdit ? `Đang sửa "${initial.name}"` : 'Tạo chương trình giảm giá mới'}</p>
          </div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-b" style={{ overflowY: 'auto', flex: 1 }}>
          {/* Name */}
          <div className="fld">
            <label>Tên chương trình</label>
            <input className="inp" value={name} onChange={e => setName(e.target.value)}
              placeholder="VD: Giảm giá cuối tuần, Khai trương…" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
          </div>

          {/* Code */}
          <div className="fld">
            <label>Mã giảm giá <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(để trống nếu áp dụng tự động)</span></label>
            <div style={{ position: 'relative' }}>
              <input className="inp tnum" value={code}
                onChange={e => setCode(e.target.value.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase())}
                placeholder="VD: GIAM10, KHAITUONG, FREESHIP"
                style={{ letterSpacing: 1 }}
                onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
              {code && (
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'var(--brand-soft)', color: 'var(--brand-ink)',
                  fontWeight: 700, fontSize: 11, borderRadius: 6, padding: '2px 8px',
                  pointerEvents: 'none',
                }}>Mã nhập tay</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>
              Khách nhập mã này vào giỏ hàng để được giảm giá. Chỉ dùng chữ cái và số.
            </div>
          </div>

          {/* Applies to (ORDER / SHIPPING) */}
          <div className="fld">
            <label>Loại giảm</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { v: 'ORDER',    label: 'Giảm đơn hàng',  desc: 'Áp dụng cho tổng tiền đơn' },
                { v: 'SHIPPING', label: 'Giảm phí ship',   desc: 'Áp dụng cho phí giao hàng' },
              ].map(t => (
                <label key={t.v} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 13px',
                  border: `1.5px solid ${appliesTo === t.v ? 'var(--brand)' : 'var(--line)'}`,
                  borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  background: appliesTo === t.v ? 'var(--brand-soft)' : 'transparent', transition: '.14s',
                }}>
                  <input type="radio" name="pmapplies" value={t.v} checked={appliesTo === t.v}
                    onChange={() => setAppliesTo(t.v)} style={{ accentColor: 'var(--brand)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 1 }}>{t.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="fld">
            <label>Loại giảm giá</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { v: 'percent', label: 'Giảm %',   desc: 'Phần trăm giảm trên giá gốc' },
                { v: 'amount',  label: 'Giảm tiền', desc: 'Số tiền cố định giảm trực tiếp' },
              ].map(t => (
                <label key={t.v} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 13px',
                  border: `1.5px solid ${type === t.v ? 'var(--brand)' : 'var(--line)'}`,
                  borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  background: type === t.v ? 'var(--brand-soft)' : 'transparent', transition: '.14s',
                }}>
                  <input type="radio" name="pmtype" value={t.v} checked={type === t.v}
                    onChange={() => setType(t.v)} style={{ accentColor: 'var(--brand)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 1 }}>{t.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Value */}
          <div className="fld">
            <label>Mức giảm</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input className="inp tnum" inputMode="numeric" value={value}
                  onChange={e => setValue(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder={type === 'percent' ? '0–100' : 'Số tiền'}
                  style={{ paddingRight: 44 }} />
                <span style={{
                  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                  fontWeight: 700, color: 'var(--ink-2)', fontSize: 14, pointerEvents: 'none',
                }}>{type === 'percent' ? '%' : 'đ'}</span>
              </div>
              {previewBadge && (
                <div style={{
                  background: 'var(--danger)', color: '#fff',
                  fontWeight: 800, fontSize: 14, borderRadius: 7,
                  padding: '6px 13px', whiteSpace: 'nowrap', letterSpacing: '.2px',
                }}>{previewBadge}</div>
              )}
            </div>
            {type === 'percent' && numVal > 100 && (
              <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 5 }}>Không được vượt quá 100%</div>
            )}
          </div>

          {/* Min purchase + Max discount (side by side) */}
          <div className="fld">
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Đơn tối thiểu</label>
                <div style={{ position: 'relative' }}>
                  <input className="inp tnum" inputMode="numeric" value={minPurchase}
                    onChange={e => setMinPurchase(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="Không giới hạn" style={{ paddingRight: 22 }} />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--ink-3)', pointerEvents: 'none' }}>đ</span>
                </div>
              </div>
              {type === 'percent' && (
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Giảm tối đa</label>
                  <div style={{ position: 'relative' }}>
                    <input className="inp tnum" inputMode="numeric" value={maxDiscount}
                      onChange={e => setMaxDiscount(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="Không giới hạn" style={{ paddingRight: 22 }} />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--ink-3)', pointerEvents: 'none' }}>đ</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Valid from + Valid until (side by side) */}
          <div className="fld">
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Ngày bắt đầu</label>
                <input className="inp" type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Ngày kết thúc</label>
                <input className="inp" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} min={validFrom || undefined} />
              </div>
            </div>
          </div>

          {/* Usage limits (side by side) */}
          <div className="fld">
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Giới hạn tổng lượt</label>
                <input className="inp tnum" inputMode="numeric" value={limitTotal}
                  onChange={e => setLimitTotal(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="Không giới hạn" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>Giới hạn mỗi người</label>
                <input className="inp tnum" inputMode="numeric" value={limitPerCustomer}
                  onChange={e => setLimitPerCustomer(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="1" />
              </div>
            </div>
          </div>

          {/* Scope */}
          <div className="fld">
            <label>Sản phẩm áp dụng</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { v: 'all',      label: 'Tất cả sản phẩm', ic: 'grid' },
                { v: 'specific', label: 'Sản phẩm được chọn', ic: 'check' },
              ].map(s => (
                <button key={s.v} onClick={() => setScope(s.v)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                  padding: '11px 14px', border: `1.5px solid ${scope === s.v ? 'var(--brand)' : 'var(--line)'}`,
                  borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  background: scope === s.v ? 'var(--brand-soft)' : 'transparent',
                  fontWeight: 700, fontSize: 13.5, transition: '.14s',
                  color: scope === s.v ? 'var(--brand-ink)' : 'var(--ink)',
                }}>
                  <Icon name={s.ic} size={16} color={scope === s.v ? 'var(--brand)' : 'var(--ink-2)'} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product picker */}
          {scope === 'specific' && (
            <div className="fld">
              <label>Chọn sản phẩm áp dụng
                <span style={{ fontWeight: 400, color: 'var(--ink-3)', marginLeft: 6 }}>({selectedIds.size} đã chọn)</span>
              </label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Icon name="search" size={15} color="var(--ink-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                <input className="inp" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  placeholder="Tìm tên sản phẩm…" style={{ paddingLeft: 34 }} />
              </div>
              <div style={{ border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)', maxHeight: 240, overflowY: 'auto' }}>
                {filteredProducts.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Không tìm thấy sản phẩm</div>
                )}
                {filteredProducts.map((p, i) => {
                  const on = selectedIds.has(p.id);
                  return (
                    <label key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 13px',
                      borderTop: i > 0 ? '1px solid var(--line-2)' : 'none',
                      cursor: 'pointer', background: on ? 'var(--brand-soft)' : 'transparent',
                      transition: '.1s',
                    }}>
                      <input type="checkbox" checked={on} onChange={() => toggleProduct(p.id)}
                        style={{ accentColor: 'var(--brand)', width: 16, height: 16, flexShrink: 0 }} />
                      <div style={{
                        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                        background: p.grad, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {p.img
                          ? <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Icon name="cup" size={14} color="#fff" />
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: on ? 'var(--brand-ink)' : 'var(--ink)' }}>{p.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{p.cat} · {fmt(p.price)}đ</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {scope === 'specific' && selectedIds.size === 0 && (
                <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 5 }}>Vui lòng chọn ít nhất 1 sản phẩm</div>
              )}
            </div>
          )}
        </div>

        <div className="modal-f">
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
          <button className="btn primary"
            disabled={!valid || saving || (scope === 'specific' && selectedIds.size === 0)}
            onClick={submit}>
            <Icon name="check" size={17} color="#fff" /> {isEdit ? 'Lưu thay đổi' : 'Thêm khuyến mãi'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────── */
function App() {
  const [tw, setTweak] = useTweaks(PM_DEFAULTS);
  const [promotions, setPromotions] = useState(() =>
    LIVE ? (window.ADMIN_PROMOTIONS_DATA.promotions || []) : []
  );
  const allProducts = LIVE ? (window.ADMIN_PROMOTIONS_DATA.products || []) : [];
  const [sideOpen,  setSideOpen]  = useState(false);
  const [editor,    setEditor]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty('--brand', b);
    r.style.setProperty('--brand-deep', d);
    r.setAttribute('data-theme', tw.dark ? 'dark' : 'light');
  }, [tw.brand, tw.dark]);

  const flash = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2800); };

  /* Toggle active */
  const toggle = async (promo) => {
    if (!LIVE) {
      setPromotions(ps => ps.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p));
      return;
    }
    setSaving(true);
    try {
      const url  = LIVE_URLS.toggle.replace('__ID__', promo.id);
      const data = await apiFetch('POST', url);
      setPromotions(ps => ps.map(p => p.id === promo.id ? { ...p, is_active: data.is_active } : p));
      flash(data.is_active ? `Đã bật "${promo.name}"` : `Đã tắt "${promo.name}"`);
    } catch (e) { flash(e.message, false); }
    finally { setSaving(false); }
  };

  /* Save (create or update) */
  const save = async (formData) => {
    if (!LIVE) {
      if (editor.id) {
        setPromotions(ps => ps.map(p => p.id === editor.id ? { ...p, ...formData, badge: formData.type === 'percent' ? `-${formData.value}%` : `-${fmt(formData.value)}đ` } : p));
        flash(`Đã cập nhật "${formData.name}"`);
      } else {
        setPromotions(ps => [...ps, { id: Date.now(), ...formData, is_active: true, badge: formData.type === 'percent' ? `-${formData.value}%` : `-${fmt(formData.value)}đ` }]);
        flash(`Đã thêm "${formData.name}"`);
      }
      setEditor(null);
      return;
    }
    setSaving(true);
    try {
      let result;
      if (editor.id) {
        const url = LIVE_URLS.update.replace('__ID__', editor.id);
        result = await apiFetch('POST', url, formData);
        setPromotions(ps => ps.map(p => p.id === editor.id ? result.promotion : p));
        flash(`Đã cập nhật "${formData.name}"`);
      } else {
        result = await apiFetch('POST', LIVE_URLS.store, formData);
        setPromotions(ps => [...ps, result.promotion]);
        flash(`Đã thêm "${formData.name}"`);
      }
      setEditor(null);
    } catch (e) { flash(e.message, false); }
    finally { setSaving(false); }
  };

  /* Delete */
  const del = async (promo) => {
    if (!confirm(`Xoá khuyến mãi "${promo.name}"?`)) return;
    if (!LIVE) { setPromotions(ps => ps.filter(p => p.id !== promo.id)); return; }
    setSaving(true);
    try {
      const url = LIVE_URLS.destroy.replace('__ID__', promo.id);
      await apiFetch('DELETE', url);
      setPromotions(ps => ps.filter(p => p.id !== promo.id));
      flash(`Đã xoá "${promo.name}"`);
    } catch (e) { flash(e.message, false); }
    finally { setSaving(false); }
  };

  const stats = useMemo(() => ({
    total:  promotions.length,
    active: promotions.filter(p => p.is_active).length,
  }), [promotions]);

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Khuyến mãi" admin={window.ADMIN_PROMOTIONS_DATA?.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Khuyến mãi</div>
            <h1>Quản lý khuyến mãi</h1>
          </div>
          <div className="topbar-spacer" />
          <button className="btn primary" onClick={() => setEditor({})} disabled={saving}>
            <Icon name="plus" size={16} color="#fff" /> Thêm khuyến mãi
          </button>
          {LIVE && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 'var(--r-sm)', background: 'var(--ok-bg)', color: 'var(--ok)', fontSize: 13, fontWeight: 700 }}>
              <Icon name="check" size={15} color="var(--ok)" /> Kết nối cơ sở dữ liệu
            </div>
          )}
        </header>

        <div className="content">
          <div className="stats" style={{ marginBottom: 20 }}>
            <div className="stat">
              <div className="stat-ic g"><Icon name="percent" size={22} /></div>
              <div><div className="lbl">Tổng khuyến mãi</div><div className="val tnum">{stats.total}</div></div>
            </div>
            <div className="stat">
              <div className="stat-ic a"><Icon name="check" size={22} /></div>
              <div><div className="lbl">Đang áp dụng</div><div className="val tnum">{stats.active}</div></div>
            </div>
            <div className="stat">
              <div className="stat-ic p"><Icon name="eyeoff" size={20} /></div>
              <div><div className="lbl">Tạm dừng</div><div className="val tnum">{stats.total - stats.active}</div></div>
            </div>
          </div>

          {promotions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-3)' }}>
              <div style={{ marginBottom: 14 }}><Icon name="percent" size={38} color="var(--line)" /></div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Chưa có khuyến mãi nào</div>
              <div style={{ fontSize: 13 }}>Bấm "+ Thêm khuyến mãi" để tạo chương trình giảm giá đầu tiên</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {promotions.map(p => {
              const scopeLabel = p.scope === 'all'
                ? 'Tất cả sản phẩm'
                : `${(p.product_ids || []).length} sản phẩm được chọn`;
              return (
                <div key={p.id} style={{
                  background: 'var(--panel)', borderRadius: 'var(--r-md)',
                  boxShadow: 'var(--shadow-sm)', padding: '16px 18px',
                  display: 'flex', alignItems: 'center', gap: 16,
                  opacity: p.is_active ? 1 : 0.6,
                  transition: '.2s',
                }}>
                  {/* Badge */}
                  <div style={{
                    background: p.is_active ? 'var(--danger)' : 'var(--off)',
                    color: '#fff', fontWeight: 800, fontSize: 15,
                    borderRadius: 10, padding: '8px 14px',
                    minWidth: 72, textAlign: 'center', letterSpacing: '.3px',
                    flexShrink: 0,
                  }}>
                    {p.badge}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 3 }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
                        background: 'var(--brand-soft)', color: 'var(--brand-ink)',
                      }}>
                        {p.type === 'percent' ? 'Giảm %' : 'Giảm tiền'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        <Icon name={p.scope === 'all' ? 'grid' : 'check'} size={12} color="currentColor" style={{ marginRight: 4 }} />
                        {scopeLabel}
                      </span>
                      {p.applies_to === 'SHIPPING' && (
                        <span style={{
                          fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
                          background: '#E0F0FF', color: '#1D6FA4',
                        }}>
                          Phí ship
                        </span>
                      )}
                      {p.code && (
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                          background: '#FFF4E0', color: '#B45309', letterSpacing: .5,
                          fontFamily: 'monospace',
                        }}>
                          {p.code}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button className="vopt-edit" title="Sửa" disabled={saving} onClick={() => setEditor(p)}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button className="vopt-edit del" title="Xoá" disabled={saving} onClick={() => del(p)}>
                      <Icon name="trash" size={15} />
                    </button>
                    <button
                      className={"switch" + (p.is_active ? " on" : "")}
                      title={p.is_active ? 'Đang bật — bấm để tắt' : 'Đang tắt — bấm để bật'}
                      disabled={saving}
                      onClick={() => toggle(p)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast">
          <span className="tc" style={{ background: toast.ok ? 'var(--ok)' : 'var(--danger)' }}>
            <Icon name={toast.ok ? 'check' : 'close'} size={15} color="#fff" />
          </span>
          {toast.msg}
        </div>
      )}

      {editor !== null && (
        <PromoEditor
          initial={editor}
          allProducts={allProducts}
          onClose={() => setEditor(null)}
          onSave={save}
          saving={saving}
        />
      )}

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F", "#07432A"], ["#005A36", "#003D24"], ["#3E5C8A", "#2A4063"], ["#6B4FA0", "#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
