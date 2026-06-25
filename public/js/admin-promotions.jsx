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
function PromoEditor({ initial, kind, allProducts, onClose, onSave, saving }) {
  const isEdit = !!initial.id;
  const [name,             setName]           = useState(initial.name       || '');
  const [code,             setCode]           = useState(initial.code       || '');
  const [type,             setType]           = useState(initial.type       || 'percent');
  const [value,            setValue]          = useState(initial.value      ? String(initial.value) : '');
  const [scope,            setScope]          = useState(initial.scope      || 'all');
  const [minPurchase,      setMinPurchase]    = useState(initial.min_purchase ? String(Math.round(initial.min_purchase)) : '');
  const [maxDiscount,      setMaxDiscount]    = useState(initial.max_discount ? String(Math.round(initial.max_discount)) : '');
  const [validFrom,        setValidFrom]      = useState(initial.valid_from  || '');
  const [validUntil,       setValidUntil]     = useState(initial.valid_until || '');
  const [limitTotal,       setLimitTotal]     = useState(initial.usage_limit_total ? String(initial.usage_limit_total) : '');
  const [limitPerCustomer, setLimitPerCustomer] = useState(initial.usage_limit_per_customer != null ? String(initial.usage_limit_per_customer) : '1');
  const [selectedIds,      setSelectedIds]    = useState(new Set(initial.product_ids || []));
  const [productSearch,    setProductSearch]  = useState('');

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const numVal  = parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
  const maxVal  = type === 'percent' ? 100 : 999999999;
  const baseOk  = name.trim().length > 0 && numVal >= 1 && numVal <= maxVal;
  const valid   = baseOk && (kind !== 'price' || scope !== 'specific' || selectedIds.size > 0);

  const toggleProduct = id => setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(p => p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q));
  }, [allProducts, productSearch]);

  const submit = () => {
    if (!valid || saving) return;
    onSave({
      kind,
      name:                     name.trim(),
      code:                     kind === 'voucher' ? (code.trim().toUpperCase() || null) : null,
      type,
      value:                    numVal,
      scope:                    kind === 'price' ? scope : 'all',
      applies_to:               'ORDER',
      product_ids:              kind === 'price' && scope === 'specific' ? [...selectedIds] : [],
      min_purchase:             kind === 'voucher' && minPurchase ? parseFloat(minPurchase) : null,
      max_discount:             kind === 'voucher' && type === 'percent' && maxDiscount ? parseFloat(maxDiscount) : null,
      valid_from:               validFrom || null,
      valid_until:              validUntil || null,
      usage_limit_total:        kind === 'voucher' && limitTotal ? parseInt(limitTotal, 10) : null,
      usage_limit_per_customer: kind === 'voucher' && limitPerCustomer ? parseInt(limitPerCustomer, 10) : null,
    });
  };

  const previewBadge = numVal > 0 ? (type === 'percent' ? `-${numVal}%` : `-${fmt(numVal)}đ`) : null;

  const inputRow = (label, input, hint) => (
    <div className="fld">
      <label>{label}</label>
      {input}
      {hint && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>{hint}</div>}
    </div>
  );

  const radioRow = (name, options, value, onChange) => (
    <div style={{ display: 'flex', gap: 10 }}>
      {options.map(t => (
        <label key={t.v} style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 13px',
          border: `1.5px solid ${value === t.v ? 'var(--brand)' : 'var(--line)'}`,
          borderRadius: 'var(--r-sm)', cursor: 'pointer',
          background: value === t.v ? 'var(--brand-soft)' : 'transparent', transition: '.14s',
        }}>
          <input type="radio" checked={value === t.v} onChange={() => onChange(t.v)}
            style={{ accentColor: 'var(--brand)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.label}</div>
            {t.desc && <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 1 }}>{t.desc}</div>}
          </div>
        </label>
      ))}
    </div>
  );

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name={isEdit ? 'edit' : (kind === 'price' ? 'percent' : 'ticket')} size={20} /></div>
          <div>
            <h3>
              {isEdit
                ? (kind === 'price' ? 'Sửa khuyến mãi gạch giá' : 'Sửa mã giảm đơn hàng')
                : (kind === 'price' ? 'Thêm khuyến mãi gạch giá' : 'Thêm mã giảm đơn hàng')}
            </h3>
            <p>{kind === 'price' ? 'Hiển thị badge giá gạch ngang trên sản phẩm' : 'Voucher khách chọn trong giỏ hàng khi thanh toán'}</p>
          </div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-b" style={{ overflowY: 'auto', flex: 1 }}>
          {/* Name */}
          {inputRow('Tên chương trình',
            <input className="inp" value={name} onChange={e => setName(e.target.value)} autoFocus
              placeholder={kind === 'price' ? 'VD: Giảm giá cuối tuần, Khai trương…' : 'VD: Mừng sinh nhật, Ưu đãi thứ 6…'}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
          )}

          {/* Code — voucher only */}
          {kind === 'voucher' && (
            <div className="fld">
              <label>Mã giảm giá <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(để trống = tự động hiện trong giỏ)</span></label>
              <div style={{ position: 'relative' }}>
                <input className="inp tnum" value={code}
                  onChange={e => setCode(e.target.value.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase())}
                  placeholder="VD: GIAM10, BIRTHDAY20"
                  style={{ letterSpacing: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
                {code && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'var(--brand-soft)', color: 'var(--brand-ink)',
                    fontWeight: 700, fontSize: 11, borderRadius: 6, padding: '2px 8px', pointerEvents: 'none',
                  }}>Mã nhập tay</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5 }}>Chỉ dùng chữ cái, số và dấu gạch ngang.</div>
            </div>
          )}

          {/* Type */}
          <div className="fld">
            <label>Loại giảm giá</label>
            {radioRow('pmtype', [
              { v: 'percent', label: 'Giảm %',   desc: 'Phần trăm trên tổng tiền' },
              { v: 'amount',  label: 'Giảm tiền', desc: 'Số tiền cố định' },
            ], type, setType)}
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

          {/* Voucher: min purchase + max discount */}
          {kind === 'voucher' && (
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
          )}

          {/* Valid from + until */}
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

          {/* Voucher: usage limits */}
          {kind === 'voucher' && (
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
          )}

          {/* Price: scope + product picker */}
          {kind === 'price' && (<>
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
                        cursor: 'pointer', background: on ? 'var(--brand-soft)' : 'transparent', transition: '.1s',
                      }}>
                        <input type="checkbox" checked={on} onChange={() => toggleProduct(p.id)}
                          style={{ accentColor: 'var(--brand)', width: 16, height: 16, flexShrink: 0 }} />
                        <div style={{
                          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                          background: p.grad, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {p.img
                            ? <img src={p.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Icon name="cup" size={14} color="#fff" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: on ? 'var(--brand-ink)' : 'var(--ink)' }}>{p.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{p.cat} · {fmt(p.price)}đ</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {selectedIds.size === 0 && (
                  <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 5 }}>Vui lòng chọn ít nhất 1 sản phẩm</div>
                )}
              </div>
            )}
          </>)}
        </div>

        <div className="modal-f">
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
          <button className="btn primary" disabled={!valid || saving} onClick={submit}>
            <Icon name="check" size={17} color="#fff" />
            {isEdit ? 'Lưu thay đổi' : (kind === 'price' ? 'Thêm gạch giá' : 'Thêm mã giảm')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── PromoCard ──────────────────────────────────────────────────── */
function PromoCard({ p, kind, saving, onEdit, onToggle, onDel }) {
  return (
    <div style={{
      background: 'var(--panel)', borderRadius: 'var(--r-md)',
      boxShadow: 'var(--shadow-sm)', padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 16,
      opacity: p.is_active ? 1 : 0.6, transition: '.2s',
    }}>
      <div style={{
        background: p.is_active ? 'var(--danger)' : 'var(--off)',
        color: '#fff', fontWeight: 800, fontSize: 15,
        borderRadius: 10, padding: '8px 14px',
        minWidth: 72, textAlign: 'center', letterSpacing: '.3px', flexShrink: 0,
      }}>
        {p.badge}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 3 }}>{p.name}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
            background: 'var(--brand-soft)', color: 'var(--brand-ink)',
          }}>
            {p.type === 'percent' ? 'Giảm %' : 'Giảm tiền'}
          </span>
          {kind === 'price' && (
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              {p.scope === 'all' ? 'Tất cả sản phẩm' : `${(p.product_ids || []).length} sản phẩm được chọn`}
            </span>
          )}
          {kind === 'voucher' && p.min_purchase > 0 && (
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Đơn từ {fmt(p.min_purchase)}đ</span>
          )}
          {p.code && (
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
              background: '#FFF4E0', color: '#B45309', letterSpacing: .5, fontFamily: 'monospace',
            }}>{p.code}</span>
          )}
          {p.valid_until && (
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>HSD: {p.valid_until}</span>
          )}
          {kind === 'voucher' && p.usage_limit_total && (
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.claimed_count || 0}/{p.usage_limit_total} lượt</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button className="vopt-edit" title="Sửa" disabled={saving} onClick={() => onEdit(p)}>
          <Icon name="edit" size={15} />
        </button>
        <button className="vopt-edit del" title="Xoá" disabled={saving} onClick={() => onDel(p)}>
          <Icon name="trash" size={15} />
        </button>
        <button
          className={"switch" + (p.is_active ? " on" : "")}
          title={p.is_active ? 'Đang bật — bấm để tắt' : 'Đang tắt — bấm để bật'}
          disabled={saving}
          onClick={() => onToggle(p)}
        />
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────── */
function App() {
  const [tw, setTweak] = useTweaks(PM_DEFAULTS);
  const [tab, setTab] = useState('price'); // 'price' | 'voucher'

  const rawPromos = LIVE ? (window.ADMIN_PROMOTIONS_DATA.promotions || []) : [];
  const [pricePromos,   setPricePromos]   = useState(() => rawPromos.filter(p => (p.kind || 'price') === 'price'));
  const [voucherPromos, setVoucherPromos] = useState(() => rawPromos.filter(p => p.kind === 'voucher'));

  const allProducts = LIVE ? (window.ADMIN_PROMOTIONS_DATA.products || []) : [];
  const [sideOpen,   setSideOpen]   = useState(false);
  const [editor,     setEditor]     = useState(null);
  const [editorKind, setEditorKind] = useState('price');
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty('--brand', b);
    r.style.setProperty('--brand-deep', d);
    r.setAttribute('data-theme', tw.dark ? 'dark' : 'light');
  }, [tw.brand, tw.dark]);

  const flash = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2800); };

  const setterFor = kind => kind === 'price' ? setPricePromos : setVoucherPromos;
  const promos    = tab === 'price' ? pricePromos : voucherPromos;

  const toggle = async (promo) => {
    const kind   = promo.kind || 'price';
    const setter = setterFor(kind);
    if (!LIVE) { setter(ps => ps.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p)); return; }
    setSaving(true);
    try {
      const data = await apiFetch('POST', LIVE_URLS.toggle.replace('__ID__', promo.id));
      setter(ps => ps.map(p => p.id === promo.id ? { ...p, is_active: data.is_active } : p));
      flash(data.is_active ? `Đã bật "${promo.name}"` : `Đã tắt "${promo.name}"`);
    } catch (e) { flash(e.message, false); }
    finally { setSaving(false); }
  };

  const save = async (formData) => {
    const kind   = editorKind;
    const setter = setterFor(kind);
    const makeBadge = fd => fd.type === 'percent' ? `-${fd.value}%` : `-${fmt(fd.value)}đ`;

    if (!LIVE) {
      if (editor.id) {
        setter(ps => ps.map(p => p.id === editor.id ? { ...p, ...formData, badge: makeBadge(formData) } : p));
        flash(`Đã cập nhật "${formData.name}"`);
      } else {
        setter(ps => [...ps, { id: Date.now(), ...formData, kind, is_active: true, badge: makeBadge(formData) }]);
        flash(`Đã thêm "${formData.name}"`);
      }
      setEditor(null);
      return;
    }

    setSaving(true);
    try {
      let result;
      if (editor.id) {
        result = await apiFetch('POST', LIVE_URLS.update.replace('__ID__', editor.id), formData);
        setter(ps => ps.map(p => p.id === editor.id ? result.promotion : p));
        flash(`Đã cập nhật "${formData.name}"`);
      } else {
        result = await apiFetch('POST', LIVE_URLS.store, formData);
        setter(ps => [...ps, result.promotion]);
        flash(`Đã thêm "${formData.name}"`);
      }
      setEditor(null);
    } catch (e) { flash(e.message, false); }
    finally { setSaving(false); }
  };

  const del = async (promo) => {
    const kind   = promo.kind || 'price';
    const setter = setterFor(kind);
    if (!confirm(`Xoá "${promo.name}"?`)) return;
    if (!LIVE) { setter(ps => ps.filter(p => p.id !== promo.id)); flash(`Đã xoá "${promo.name}"`); return; }
    setSaving(true);
    try {
      await apiFetch('DELETE', LIVE_URLS.destroy.replace('__ID__', promo.id));
      setter(ps => ps.filter(p => p.id !== promo.id));
      flash(`Đã xoá "${promo.name}"`);
    } catch (e) { flash(e.message, false); }
    finally { setSaving(false); }
  };

  const openEditor = (promo) => { setEditorKind(promo.kind || 'price'); setEditor(promo); };
  const openNew    = ()     => { setEditorKind(tab);                     setEditor({}); };

  const stats = useMemo(() => ({
    priceActive:   pricePromos.filter(p => p.is_active).length,
    priceTotal:    pricePromos.length,
    voucherActive: voucherPromos.filter(p => p.is_active).length,
    voucherTotal:  voucherPromos.length,
  }), [pricePromos, voucherPromos]);

  const TABS = [
    { key: 'price',   label: 'Khuyến mãi gạch giá', ic: 'percent' },
    { key: 'voucher', label: 'Mã giảm đơn hàng',     ic: 'ticket'  },
  ];

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
          <button className="btn primary" onClick={openNew} disabled={saving}>
            <Icon name="plus" size={16} color="#fff" />
            {tab === 'price' ? 'Thêm gạch giá' : 'Thêm mã giảm'}
          </button>
          {LIVE && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 'var(--r-sm)', background: 'var(--ok-bg)', color: 'var(--ok)', fontSize: 13, fontWeight: 700 }}>
              <Icon name="check" size={15} color="var(--ok)" /> Kết nối cơ sở dữ liệu
            </div>
          )}
        </header>

        <div className="content">
          {/* Stats */}
          <div className="stats" style={{ marginBottom: 20 }}>
            <div className="stat">
              <div className="stat-ic g"><Icon name="percent" size={22} /></div>
              <div>
                <div className="lbl">Gạch giá đang chạy</div>
                <div className="val tnum">{stats.priceActive}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-3)' }}>/{stats.priceTotal}</span></div>
              </div>
            </div>
            <div className="stat">
              <div className="stat-ic a"><Icon name="ticket" size={22} /></div>
              <div>
                <div className="lbl">Mã giảm đơn đang chạy</div>
                <div className="val tnum">{stats.voucherActive}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-3)' }}>/{stats.voucherTotal}</span></div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--line)' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 22px',
                border: 'none', borderBottom: `2.5px solid ${tab === t.key ? 'var(--brand)' : 'transparent'}`,
                marginBottom: -2,
                background: 'transparent', cursor: 'pointer',
                color: tab === t.key ? 'var(--brand-ink)' : 'var(--ink-3)',
                fontWeight: tab === t.key ? 700 : 500,
                fontSize: 14, transition: '.15s',
              }}>
                <Icon name={t.ic} size={16} color={tab === t.key ? 'var(--brand)' : 'var(--ink-3)'} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab hint */}
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16, padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10 }}>
            {tab === 'price'
              ? '💲 Hiển thị badge giá gạch ngang (ví dụ: -20%) trực tiếp trên thẻ sản phẩm trong thực đơn. Áp dụng ngay, không cần khách chọn.'
              : '🎟️ Voucher giảm giá xuất hiện trong mục "Voucher của bạn" khi thanh toán. Khách chủ động chọn để áp dụng vào tổng đơn hàng.'}
          </div>

          {/* Empty state */}
          {promos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-3)' }}>
              <div style={{ marginBottom: 14 }}>
                <Icon name={tab === 'price' ? 'percent' : 'ticket'} size={38} color="var(--line)" />
              </div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                {tab === 'price' ? 'Chưa có khuyến mãi gạch giá nào' : 'Chưa có mã giảm đơn nào'}
              </div>
              <div style={{ fontSize: 13 }}>
                Bấm "+ {tab === 'price' ? 'Thêm gạch giá' : 'Thêm mã giảm'}" để tạo mới
              </div>
            </div>
          )}

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {promos.map(p => (
              <PromoCard key={p.id} p={p} kind={tab} saving={saving}
                onEdit={openEditor} onToggle={toggle} onDel={del}
              />
            ))}
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
          kind={editorKind}
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
