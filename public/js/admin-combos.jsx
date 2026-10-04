/* global React, ReactDOM, Icon, AdminSidebar */
const { useState, useMemo } = React;
const { combos: INITIAL_COMBOS, products: ALL_PRODUCTS, variants: ALL_VARIANTS } = window.ADMIN_COMBOS_DATA;

const fmt = v => v ? Number(v).toLocaleString('vi-VN') + 'đ' : '—';
const STATUS_LABEL = { active: 'Đang bán', inactive: 'Tạm ngừng', draft: 'Nháp' };
const STATUS_COLOR = { active: '#16a34a', inactive: '#dc2626', draft: '#9ca3af' };

function ComboItemRow({ item, onChange, onRemove, variants }) {
  const product = ALL_PRODUCTS.find(p => p.id === item.product_id);
  const productVariants = variants.filter(v => v.product_id === item.product_id);
  return (
    <div style={{ display:'flex', gap:8, alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f0f0f0' }}>
      <span style={{ flex:1, fontSize:14 }}>{product?.name ?? '—'}</span>
      <input type="number" min={1} value={item.quantity}
        onChange={e => onChange({ ...item, quantity: +e.target.value })}
        style={{ width:56, textAlign:'center', border:'1px solid #e5e7eb', borderRadius:6, padding:'4px 6px', fontSize:13 }} />
      {productVariants.length > 0 && (
        <select value={item.default_size_variant_id ?? ''}
          onChange={e => onChange({ ...item, default_size_variant_id: e.target.value || null })}
          style={{ border:'1px solid #e5e7eb', borderRadius:6, padding:'4px 6px', fontSize:13 }}>
          <option value="">-- Kích cỡ --</option>
          {productVariants.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      )}
      <button onClick={onRemove} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
    </div>
  );
}

function ComboEditor({ combo, onClose }) {
  const isNew = !combo;
  const [form, setForm] = useState(isNew ? {
    name: '', description: '', image_url: '', combo_price: '',
    max_per_day: '', available_from: '', available_until: '',
    valid_from: '', valid_until: '', status: 'draft', sort_order: 0,
    items: [],
  } : {
    ...combo,
    description: combo.description ?? '',
    image_url: combo.image_url ?? '',
    combo_price: combo.combo_price ?? '',
    max_per_day: combo.max_per_day ?? '',
    available_from: combo.available_from ?? '',
    available_until: combo.available_until ?? '',
    valid_from: combo.valid_from ?? '',
    valid_until: combo.valid_until ?? '',
    items: (combo.items ?? []).map(it => ({
      product_id: it.product_id,
      quantity: it.quantity,
      default_size_variant_id: it.default_size_variant_id ?? null,
      sort_order: it.sort_order,
    })),
  });
  const [addProductId, setAddProductId] = useState('');
  const [saving, setSaving] = useState(false);

  const originalPrice = form.items.reduce((sum, it) => {
    const p = ALL_PRODUCTS.find(p => p.id === it.product_id);
    return sum + (p?.base_price ?? 0) * it.quantity;
  }, 0);
  const saving_pct = originalPrice > 0 && form.combo_price
    ? Math.round((1 - +form.combo_price / originalPrice) * 100) : 0;

  const addItem = () => {
    if (!addProductId) return;
    if (form.items.find(it => it.product_id === +addProductId)) return;
    setForm(f => ({ ...f, items: [...f.items, { product_id: +addProductId, quantity: 1, default_size_variant_id: null, sort_order: f.items.length }] }));
    setAddProductId('');
  };

  const submit = async () => {
    setSaving(true);
    const url = isNew ? '/admin/combos' : `/admin/combos/${combo.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    const body = { ...form, items: form.items };
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok || res.redirected) { location.reload(); return; }
    const err = await res.json().catch(() => ({}));
    alert(err.message || 'Lỗi, thử lại.');
    setSaving(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}>
      <div style={{ width:520, maxWidth:'100%', height:'100%', overflowY:'auto', background:'#fff', padding:28, boxShadow:'-4px 0 24px rgba(0,0,0,.15)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>{isNew ? 'Tạo combo mới' : 'Chỉnh sửa combo'}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#6b7280' }}>×</button>
        </div>

        <label style={{ display:'block', marginBottom:14 }}>
          <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>Tên combo *</span>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', marginTop:4, fontSize:14 }} />
        </label>

        <label style={{ display:'block', marginBottom:14 }}>
          <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>Mô tả</span>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
            style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', marginTop:4, fontSize:14, resize:'vertical' }} />
        </label>

        <label style={{ display:'block', marginBottom:14 }}>
          <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>URL ảnh</span>
          <input value={form.image_url} onChange={e => set('image_url', e.target.value)}
            style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', marginTop:4, fontSize:14 }} />
        </label>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <label>
            <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>Giá combo *</span>
            <input type="number" min={0} value={form.combo_price} onChange={e => set('combo_price', e.target.value)}
              style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', marginTop:4, fontSize:14 }} />
          </label>
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', paddingBottom:4 }}>
            {originalPrice > 0 && <span style={{ fontSize:13, color:'#6b7280' }}>Gốc: {fmt(originalPrice)}</span>}
            {saving_pct > 0 && <span style={{ fontSize:13, color:'#16a34a', fontWeight:600 }}>Tiết kiệm {saving_pct}%</span>}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <label>
            <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>Trạng thái</span>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', marginTop:4, fontSize:14 }}>
              <option value="draft">Nháp</option>
              <option value="active">Đang bán</option>
              <option value="inactive">Tạm ngừng</option>
            </select>
          </label>
          <label>
            <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>Tối đa / ngày</span>
            <input type="number" min={1} value={form.max_per_day} onChange={e => set('max_per_day', e.target.value)}
              placeholder="Không giới hạn"
              style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', marginTop:4, fontSize:14 }} />
          </label>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <label>
            <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>Giờ bán từ</span>
            <input type="time" value={form.available_from} onChange={e => set('available_from', e.target.value)}
              style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', marginTop:4, fontSize:14 }} />
          </label>
          <label>
            <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>Giờ bán đến</span>
            <input type="time" value={form.available_until} onChange={e => set('available_until', e.target.value)}
              style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', marginTop:4, fontSize:14 }} />
          </label>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          <label>
            <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>Hiệu lực từ</span>
            <input type="date" value={form.valid_from} onChange={e => set('valid_from', e.target.value)}
              style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', marginTop:4, fontSize:14 }} />
          </label>
          <label>
            <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>Hiệu lực đến</span>
            <input type="date" value={form.valid_until} onChange={e => set('valid_until', e.target.value)}
              style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', marginTop:4, fontSize:14 }} />
          </label>
        </div>

        <h3 style={{ fontSize:15, fontWeight:600, marginBottom:10 }}>Sản phẩm trong combo</h3>
        {form.items.map((item, i) => (
          <ComboItemRow key={i} item={item} variants={ALL_VARIANTS}
            onChange={updated => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? updated : it) }))}
            onRemove={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))} />
        ))}
        <div style={{ display:'flex', gap:8, marginTop:10 }}>
          <select value={addProductId} onChange={e => setAddProductId(e.target.value)}
            style={{ flex:1, border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontSize:14 }}>
            <option value="">-- Chọn sản phẩm để thêm --</option>
            {ALL_PRODUCTS.filter(p => !form.items.find(it => it.product_id === p.id)).map(p => (
              <option key={p.id} value={p.id}>{p.name} ({fmt(p.base_price)})</option>
            ))}
          </select>
          <button onClick={addItem}
            style={{ padding:'8px 16px', background:'var(--brand)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14 }}>
            + Thêm
          </button>
        </div>

        <div style={{ display:'flex', gap:12, marginTop:28 }}>
          <button onClick={submit} disabled={saving}
            style={{ flex:1, padding:'12px 0', background:'var(--brand)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:'pointer' }}>
            {saving ? 'Đang lưu…' : (isNew ? 'Tạo combo' : 'Lưu thay đổi')}
          </button>
          <button onClick={onClose}
            style={{ padding:'12px 20px', background:'#f3f4f6', color:'#374151', border:'none', borderRadius:10, fontWeight:600, fontSize:15, cursor:'pointer' }}>
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
}

function ComboCard({ combo, onEdit }) {
  const [confirming, setConfirming] = useState(false);
  const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

  const toggle = async () => {
    await fetch(`/admin/combos/${combo.id}/toggle`, {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': csrfToken },
    });
    location.reload();
  };

  const destroy = async () => {
    if (!confirming) { setConfirming(true); return; }
    await fetch(`/admin/combos/${combo.id}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-TOKEN': csrfToken },
    });
    location.reload();
  };

  const saving_pct = combo.original_price > 0
    ? Math.round((1 - combo.combo_price / combo.original_price) * 100) : 0;

  return (
    <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 1px 6px rgba(0,0,0,.08)', overflow:'hidden' }}>
      {combo.image_url && (
        <img src={combo.image_url} alt={combo.name}
          style={{ width:'100%', height:160, objectFit:'cover' }} />
      )}
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>{combo.name}</h3>
          <span style={{ fontSize:12, fontWeight:600, color: STATUS_COLOR[combo.status] || '#9ca3af' }}>
            {STATUS_LABEL[combo.status] || combo.status}
          </span>
        </div>
        {combo.description && <p style={{ fontSize:13, color:'#6b7280', margin:'0 0 8px' }}>{combo.description}</p>}
        <div style={{ display:'flex', gap:10, alignItems:'baseline', marginBottom:8 }}>
          <span style={{ fontSize:18, fontWeight:700, color:'var(--brand)' }}>{fmt(combo.combo_price)}</span>
          {combo.original_price > combo.combo_price && <span style={{ fontSize:13, color:'#9ca3af', textDecoration:'line-through' }}>{fmt(combo.original_price)}</span>}
          {saving_pct > 0 && <span style={{ fontSize:12, background:'#dcfce7', color:'#16a34a', padding:'2px 6px', borderRadius:6, fontWeight:600 }}>-{saving_pct}%</span>}
        </div>
        <div style={{ fontSize:12, color:'#9ca3af', marginBottom:10 }}>
          {(combo.items ?? []).map(it => it.product?.name ?? '?').join(', ') || 'Chưa có sản phẩm'}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onEdit} style={{ flex:1, padding:'7px 0', background:'#f3f4f6', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Sửa
          </button>
          <button onClick={toggle}
            style={{ padding:'7px 14px', background: combo.status === 'active' ? '#fef2f2' : '#f0fdf4', color: combo.status === 'active' ? '#dc2626' : '#16a34a', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {combo.status === 'active' ? 'Tắt' : 'Bật'}
          </button>
          <button onClick={destroy}
            style={{ padding:'7px 14px', background: confirming ? '#dc2626' : '#fef2f2', color: confirming ? '#fff' : '#dc2626', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {confirming ? 'Xác nhận?' : 'Xoá'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CombosApp() {
  const [combos, setCombos] = useState(INITIAL_COMBOS);
  const [editing, setEditing] = useState(null); // null = closed, false = new, combo obj = edit
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    combos.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [combos, search]
  );

  const [sideOpen, setSideOpen] = useState(false);

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Combo" badges={{ "Combo": String(combos.length) }} admin={window.ADMIN_COMBOS_DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Combo</div>
            <h1>Combo & Bundle</h1>
          </div>
          <div className="topbar-spacer" />
          <div className="searchbox">
            <Icon name="search" size={17} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm combo…" />
          </div>
          <button className="btn primary" onClick={() => setEditing(false)}>
            <Icon name="plus" size={16} color="#fff" /> Tạo combo
          </button>
        </header>

        <div className="content">
          {filtered.length === 0
            ? <div style={{ textAlign:'center', padding:'60px 0', color:'var(--ink-3)', fontSize:15 }}>Chưa có combo nào.</div>
            : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
                {filtered.map(c => (
                  <ComboCard key={c.id} combo={c} onEdit={() => setEditing(c)} />
                ))}
              </div>
            )
          }
        </div>
      </div>

      {editing !== null && (
        <ComboEditor combo={editing === false ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<CombosApp />);
