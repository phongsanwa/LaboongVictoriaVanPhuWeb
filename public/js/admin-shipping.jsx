/* global React, ReactDOM, Icon, fmt, NAV_URLS, adminHref, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo } = React;

const SH_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const DATA = window.ADMIN_SHIPPING_DATA || { tiers: [], urls: {} };

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

/* ── Main App ───────────────────────────────────────────────────────── */
function ShippingApp() {
  const [tw, setTweak] = useTweaks(SH_DEFAULTS);
  const [tiers, setTiers] = useState(() => DATA.tiers.slice());
  const [sideOpen, setSideOpen] = useState(false);
  const [editor, setEditor] = useState(null);  // null | { tier }
  const [delTarget, setDelTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty('--brand', b);
    r.style.setProperty('--brand-deep', d);
    r.setAttribute('data-theme', tw.dark ? 'dark' : 'light');
  }, [tw.brand, tw.dark]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

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

  const logout = async (e) => {
    e.preventDefault();
    await apiCall('POST', '/logout');
    location.href = NAV_URLS.login;
  };

  const activeTiers = useMemo(() => tiers.filter(t => t.is_active), [tiers]);
  const sortedTiers = useMemo(() => [...tiers].sort((a, b) => a.sort_order - b.sort_order || a.min_km - b.min_km), [tiers]);

  return (
    <div className="shell">
      {(sideOpen || editor || delTarget) && (
        <div className="scrim" style={{ zIndex: 55 }}
          onClick={() => { setSideOpen(false); }}
        />
      )}

      {/* Sidebar */}
      <aside className={'side' + (sideOpen ? ' open' : '')}>
        <div className="side-brand">
          <div className="side-mark"><span>L</span></div>
          <div><div className="nm">Laboong</div><div className="sb">Bảng quản trị</div></div>
        </div>
        <div className="side-sec">Quản lý</div>
        <nav className="side-nav">
          {NAV.slice(0, 9).map(n => (
            <a key={n.label} className={'side-link' + (n.on ? ' on' : '')} href={adminHref(n.label)}>
              <Icon name={n.ic} size={19} /> {n.label}{n.badge && <span className="badge">{n.badge}</span>}
            </a>
          ))}
        </nav>
        <div className="side-sec">Hệ thống</div>
        <nav className="side-nav">
          {NAV.slice(9).map(n => (
            <a key={n.label} className="side-link" href={adminHref(n.label)}><Icon name={n.ic} size={19} /> {n.label}</a>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="side-av">QT</div>
            <div style={{ minWidth: 0 }}>
              <div className="un">Quản trị viên</div>
              <div className="ur">admin</div>
            </div>
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: 'auto' }} onClick={logout} title="Đăng xuất">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>

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
          </div>

          {/* Info banner */}
          <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--r)', padding: '14px 18px', marginBottom: 20, fontSize: 13.5, color: 'var(--ink-2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="info" size={16} color="var(--brand)" />
            <div>
              Phí ship được tính tự động theo khoảng cách từ <strong>địa chỉ giao hàng của khách</strong> đến <strong>chi nhánh được chọn</strong>.
              Đảm bảo cửa hàng đã nhập <strong>tọa độ GPS</strong> (lat/lng) trong mục <a href={NAV_URLS.adminStores} style={{ color: 'var(--brand)' }}>Cửa hàng</a>.
            </div>
          </div>

          {/* Tier list */}
          {sortedTiers.length === 0 ? (
            <div className="empty-state">
              <div className="ei"><Icon name="truck" size={30} /></div>
              <div>Chưa có mức phí ship nào.</div>
              <button className="btn primary" style={{ marginTop: 16 }} onClick={() => setEditor({ tier: null })}>
                <Icon name="plus" size={16} color="#fff" /> Thêm mức phí đầu tiên
              </button>
            </div>
          ) : (
            <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
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
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="toast show">{toast}</div>}

      {/* Editor drawer */}
      {editor && (
        <TierDrawer
          tier={editor.tier}
          urls={DATA.urls}
          onSave={handleSave}
          onClose={() => setEditor(null)}
        />
      )}

      {/* Delete confirm */}
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
