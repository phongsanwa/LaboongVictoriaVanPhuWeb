/* global React, ReactDOM, Icon, AdminSidebar, ApexCharts */
const { useState, useEffect, useRef } = React;

const DATA = window.ADMIN_REPORT_DATA || {};
const URLS = DATA.urls || {};
const $ = window.jQuery;

const TABS = [
  ['/admin/reports/customers', 'Tổng quan khách hàng'],
  ['/admin/reports/new-customers', 'Khách hàng mới'],
  ['/admin/reports/returning', 'Khách quay lại'],
  ['/admin/reports/top-spenders', 'Top chi tiêu'],
  ['/admin/reports/rfm', 'Phân tích RFM'],
  ['/admin/reports/cohort', 'Cohort giữ chân'],
  ['/admin/reports/orders', 'Đơn hàng'],
  ['/admin/reports/products', 'Sản phẩm bán chạy'],
  ['/admin/reports/promotions', 'Khuyến mãi & voucher'],
];

/* Màu ô theo % giữ chân (đậm dần) */
function cellStyle(v) {
  if (v == null) return { background: 'transparent' };
  const a = 0.10 + (v / 100) * 0.82;
  return { background: `rgba(15,98,63,${a.toFixed(3)})`, color: v >= 45 ? '#fff' : 'var(--ink)' };
}

function App() {
  const [cohorts, setCohorts] = useState([]);
  const [maxCols, setMaxCols] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);
  const filters = useRef({ store_id: '', months: 12 });

  const curveEl = useRef(null); const curve = useRef(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams(filters.current);
    fetch(URLS.data + '?' + p.toString(), { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => {
        setCohorts(d.cohorts || []);
        const mc = Math.max(1, ...(d.cohorts || []).map(c => c.values.length));
        setMaxCols(mc);
        renderCurve(d.avgCurve || []);
      })
      .catch(() => {}).finally(() => setLoading(false));
  };

  const renderCurve = (avg) => {
    const cats = avg.map((_, i) => 'Tháng +' + i);
    if (curve.current) { curve.current.destroy(); curve.current = null; }
    if (curveEl.current && avg.length) {
      curve.current = new ApexCharts(curveEl.current, {
        chart: { type: 'line', height: 280, fontFamily: 'inherit', toolbar: { show: false } },
        series: [{ name: 'Tỷ lệ giữ chân TB', data: avg }],
        xaxis: { categories: cats },
        yaxis: { min: 0, max: 100, labels: { formatter: (v) => Math.round(v) + '%' } },
        colors: ['#0F623F'],
        stroke: { curve: 'smooth', width: 3 },
        markers: { size: 4 },
        dataLabels: { enabled: true, formatter: (v) => Math.round(v) + '%' },
        grid: { borderColor: 'rgba(0,0,0,.06)' },
        tooltip: { y: { formatter: (v) => v + '%' } },
      });
      curve.current.render();
    }
  };

  useEffect(() => {
    if ($ && $.fn.select2) {
      $('#rp-store').select2({ minimumResultsForSearch: Infinity, width: '100%' })
        .on('change', function () { filters.current.store_id = this.value; load(); });
      $('#rp-months').select2({ minimumResultsForSearch: Infinity, width: '100%' })
        .on('change', function () { filters.current.months = this.value; load(); });
    }
    load();
    return () => { try { curve.current?.destroy(); } catch (e) { /* ignore */ } };
  }, []); // eslint-disable-line

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Báo cáo" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div><div className="crumb">Quản lý · Báo cáo</div><h1>Cohort giữ chân theo tháng</h1></div>
          <div className="topbar-spacer" />
          {loading && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Đang tải…</span>}
        </header>
        <div className="content">
          <div className="rp-tabs">
            {TABS.map(([href, label]) => (
              <a key={href} href={href} className={'rp-tab' + (href === '/admin/reports/cohort' ? ' on' : '')}>{label}</a>
            ))}
          </div>

          <div className="rp-filters">
            <div className="rp-fld">
              <label>Cửa hàng</label>
              <select id="rp-store">
                <option value="">Tất cả cửa hàng</option>
                {(DATA.stores || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="rp-fld">
              <label>Số tháng</label>
              <select id="rp-months" defaultValue="12">
                {[6, 12, 18, 24].map(m => <option key={m} value={m}>{m} tháng</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 0, alignSelf: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
              Mỗi hàng là nhóm khách mua lần đầu trong tháng đó; các cột là tỷ lệ % quay lại mua ở tháng thứ N sau đó.
            </div>
          </div>

          <div className="rp-card" style={{ marginBottom: 20 }}>
            <div className="rp-card-t">Đường cong giữ chân trung bình</div>
            <div ref={curveEl} />
          </div>

          <div className="rp-table-wrap">
            <div className="rp-card-t" style={{ marginBottom: 12 }}>Bảng cohort (giữ chân %)</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="cohort-tbl">
                <thead>
                  <tr>
                    <th>Nhóm (tháng)</th>
                    <th>Số khách</th>
                    {Array.from({ length: maxCols }, (_, i) => <th key={i}>Tháng +{i}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c, ri) => (
                    <tr key={ri}>
                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{c.month}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.size || '—'}</td>
                      {Array.from({ length: maxCols }, (_, ci) => {
                        const v = c.values[ci];
                        return (
                          <td key={ci} style={{ textAlign: 'center', ...cellStyle(v == null ? null : v) }}>
                            {v == null ? '' : v + '%'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {cohorts.length === 0 && <tr><td colSpan={maxCols + 2} style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>Chưa có dữ liệu.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
