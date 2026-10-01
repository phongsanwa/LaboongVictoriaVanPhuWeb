/* global React */
// Chi phí cố định hằng tháng — CostPanel
// Loaded by admin-stores.jsx, rendered as a full-page overlay drawer.
const { useState: useStateC, useEffect: useEffectC, useCallback: useCbC } = React;

const BASE_COST_KEYS = ['rent', 'salary', 'utility', 'depreciation'];
const BASE_COST_LABELS = {
  rent: 'Thuê mặt bằng',
  salary: 'Lương nhân viên',
  utility: 'Điện nước',
  depreciation: 'Khấu hao máy móc',
};

function fmtVnd(n) {
  return Math.round(n || 0).toLocaleString('vi-VN') + 'đ';
}

function parseYM(ym) {
  const [y, m] = ym.split('-').map(Number);
  return { y, m };
}
function nextYM(ym) {
  const { y, m } = parseYM(ym);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}
function ymLabel(ym) {
  const { y, m } = parseYM(ym);
  return `Tháng ${m}/${y}`;
}

// Returns costs for the given year_month with carry-forward from previous months.
// `allMonths` is sorted array of year_month strings that exist in costMap.
function costsWithCarry(costMap, allMonths, ym) {
  if (costMap[ym]) return { costs: costMap[ym], carriedFrom: null };
  const idx = allMonths.indexOf(ym);
  // search backwards in allMonths list (which includes synthetic months too)
  const sorted = Object.keys(costMap).sort();
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i] < ym) return { costs: costMap[sorted[i]], carriedFrom: sorted[i] };
  }
  return { costs: {}, carriedFrom: null };
}

// Build a stable sorted list of all year_months to display: union of saved months
// and a rolling window of current + next 2 months.
function buildMonthList(costMap) {
  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const window2 = [cur, nextYM(cur), nextYM(nextYM(cur))];
  const all = new Set([...Object.keys(costMap), ...window2]);
  return [...all].sort();
}

// ─── NumberInput ─────────────────────────────────────────────────────────────
function NumberInput({ value, onChange, placeholder }) {
  const [raw, setRaw] = useStateC(value === 0 ? '' : String(value));
  useEffectC(() => {
    const n = parseFloat(raw.replace(/,/g, '')) || 0;
    if (n !== value) setRaw(value === 0 ? '' : String(value));
  }, [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={raw}
      placeholder={placeholder ?? '0'}
      onChange={e => {
        const v = e.target.value.replace(/[^\d]/g, '');
        setRaw(v);
        onChange(v === '' ? 0 : parseInt(v, 10));
      }}
      className="inp"
      style={{ textAlign: 'right' }}
    />
  );
}

// ─── CostPanel ───────────────────────────────────────────────────────────────
function CostPanel({ store, onClose }) {
  const [costMap, setCostMap] = useStateC({});          // { year_month: {rent,salary,...,custom_X:{label,amount}} }
  const [loading, setLoading] = useStateC(true);
  const [saving, setSaving] = useStateC(false);
  const [activeYM, setActiveYM] = useStateC(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [draft, setDraft] = useStateC(null);             // local edits for activeYM before save
  const [dirty, setDirty] = useStateC(false);
  const [toast, setToast] = useStateC(null);
  const [nextCustomId, setNextCustomId] = useStateC(1);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Load costs from server
  useEffectC(() => {
    fetch(`/admin/stores/${store.id}/costs`, {
      headers: { Accept: 'application/json' },
    })
      .then(r => r.json())
      .then(d => {
        setCostMap(d.costs || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [store.id]);

  // When active month changes, load its draft from costMap (or carry)
  useEffectC(() => {
    if (loading) return;
    const { costs } = costsWithCarry(costMap, Object.keys(costMap).sort(), activeYM);
    // Deep-copy so edits don't mutate costMap
    setDraft(JSON.parse(JSON.stringify(costs)));
    setDirty(false);
  }, [activeYM, loading]);

  const months = buildMonthList(costMap);
  const years = [...new Set(months.map(m => parseYM(m).y))].sort();
  const activeYear = parseYM(activeYM).y;

  const carriedFrom = !costMap[activeYM]
    ? (() => {
        const sorted = Object.keys(costMap).sort();
        for (let i = sorted.length - 1; i >= 0; i--) {
          if (sorted[i] < activeYM) return sorted[i];
        }
        return null;
      })()
    : null;

  // ── draft helpers ──────────────────────────────────────────────────────────
  const ensureDraft = () => {
    if (!draft) return {};
    return draft;
  };

  const setBaseCost = (key, amount) => {
    setDraft(prev => ({ ...prev, [key]: amount }));
    setDirty(true);
  };

  const setCustomLabel = (key, label) => {
    setDraft(prev => ({ ...prev, [key]: { ...prev[key], label } }));
    setDirty(true);
  };

  const setCustomAmount = (key, amount) => {
    setDraft(prev => ({ ...prev, [key]: { ...prev[key], amount } }));
    setDirty(true);
  };

  const addCustom = () => {
    const key = `custom_${nextCustomId}`;
    setNextCustomId(n => n + 1);
    setDraft(prev => ({ ...prev, [key]: { label: '', amount: 0 } }));
    setDirty(true);
  };

  const removeCustom = (key) => {
    setDraft(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDirty(true);
  };

  const addMonth = () => {
    const last = months[months.length - 1];
    const next = nextYM(last);
    if (!months.includes(next)) {
      // just switch to it; it'll appear via buildMonthList when costMap has it OR we force by setting draft
      setActiveYM(next);
    }
  };

  // ── save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!dirty || !draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/admin/stores/${store.id}/costs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
        },
        body: JSON.stringify({ year_month: activeYM, costs: draft }),
      });
      const data = await res.json();
      if (res.ok) {
        setCostMap(data.costs || {});
        setDirty(false);
        flash('Đã lưu chi phí ' + ymLabel(activeYM));
      } else {
        flash('Lưu thất bại');
      }
    } catch {
      flash('Lỗi kết nối');
    } finally {
      setSaving(false);
    }
  };

  // ── keyboard close ─────────────────────────────────────────────────────────
  useEffectC(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // ── render ─────────────────────────────────────────────────────────────────
  const d = draft || {};
  const customKeys = Object.keys(d).filter(k => k.startsWith('custom_'));
  const total = BASE_COST_KEYS.reduce((s, k) => s + (parseFloat(d[k]) || 0), 0)
    + customKeys.reduce((s, k) => s + (parseFloat(d[k]?.amount) || 0), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex' }}>
      {/* backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(2px)' }} />

      {/* panel */}
      <div style={{
        position: 'relative', marginLeft: 'auto', width: '100%', maxWidth: 600,
        height: '100%', overflowY: 'auto', background: 'var(--panel)',
        borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,.18)',
      }}>
        {/* header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div className="modal-title">Chi phí cố định — {store.name}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>Nhập riêng từng tháng, tự dùng số đúng tháng khi phân bổ lợi nhuận</div>
          </div>
          <button onClick={onClose} className="btn-icon"><span style={{ fontSize: 18 }}>✕</span></button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Đang tải…</div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* year + month selector */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {/* year tabs */}
              <div className="miniseg">
                {years.map(y => (
                  <button key={y} className={String(y) === String(activeYear) ? 'on' : ''}
                    onClick={() => {
                      const inYear = months.filter(m => parseYM(m).y === y);
                      setActiveYM(inYear[inYear.length - 1]);
                    }}>{y}</button>
                ))}
              </div>
              {/* month chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {months.filter(m => parseYM(m).y === activeYear).map(m => (
                  <button key={m} onClick={() => setActiveYM(m)}
                    className={m === activeYM ? 'pill-btn active' : 'pill-btn'}
                    style={{ fontSize: 12.5 }}>
                    {ymLabel(m)}
                    {costMap[m] && <span style={{ marginLeft: 4, opacity: .6 }}>•</span>}
                  </button>
                ))}
                <button onClick={addMonth} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px' }}>+ Tháng mới</button>
              </div>
            </div>

            {/* carry note */}
            {carriedFrom && (
              <div style={{ background: 'var(--hover)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: 'var(--ink-2)' }}>
                ℹ️ Chưa nhập tháng này — đang hiển thị số của <strong>{ymLabel(carriedFrom)}</strong>. Chỉnh sửa bên dưới rồi Lưu để ghi riêng tháng {ymLabel(activeYM)}.
              </div>
            )}

            {/* cost fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field-label" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Chi phí cơ bản</div>
              {BASE_COST_KEYS.map(key => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                  <div className="fl" style={{ fontSize: 14, fontWeight: 600 }}>{BASE_COST_LABELS[key]}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 200 }}>
                    <NumberInput value={parseFloat(d[key]) || 0} onChange={v => setBaseCost(key, v)} />
                    <span style={{ fontSize: 13, color: 'var(--ink-3)', flex: 'none' }}>đ</span>
                  </div>
                </div>
              ))}

              {customKeys.length > 0 && (
                <div className="field-label" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 6 }}>Chi phí tuỳ chỉnh</div>
              )}
              {customKeys.map(key => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                  <input
                    value={d[key]?.label || ''}
                    onChange={e => setCustomLabel(key, e.target.value)}
                    placeholder="Tên khoản chi phí"
                    className="inp"
                    style={{ borderStyle: 'dashed' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 200 }}>
                    <NumberInput value={parseFloat(d[key]?.amount) || 0} onChange={v => setCustomAmount(key, v)} />
                    <span style={{ fontSize: 13, color: 'var(--ink-3)', flex: 'none' }}>đ</span>
                    <button onClick={() => removeCustom(key)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16, padding: '0 2px', flex: 'none' }}>×</button>
                  </div>
                </div>
              ))}

              <button onClick={addCustom} style={{ alignSelf: 'flex-start', fontSize: 13, fontWeight: 700, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                + Thêm khoản chi phí
              </button>
            </div>

            {/* total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--hover)', borderRadius: 12, border: '1px solid var(--line)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>Tổng {ymLabel(activeYM)}</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--brand)' }}>{fmtVnd(total)}</span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              Chi phí tháng đang bán sẽ được phân bổ theo ngày để tính lợi nhuận ròng và điểm hòa vốn ở trang Báo cáo.
            </div>
          </div>
        )}

        {/* footer */}
        <div style={{ padding: '16px 22px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} className="btn-ghost">Đóng</button>
          <button onClick={handleSave} disabled={!dirty || saving} className="btn-primary" style={{ minWidth: 120 }}>
            {saving ? 'Đang lưu…' : dirty ? 'Lưu thay đổi' : '✓ Đã lưu'}
          </button>
        </div>

        {/* toast */}
        {toast && (
          <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink)', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', zIndex: 10 }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
