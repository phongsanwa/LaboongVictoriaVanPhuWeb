/* global React, ReactDOM, Icon, AdminSidebar, ApexCharts, flatpickr */
const { useState, useEffect, useRef } = React;

const DATA = window.ADMIN_REPORT_DATA || {};
const URLS = DATA.urls || {};
const $ = window.jQuery;
const vnd = (n) => (Number(n) || 0).toLocaleString('vi-VN');
const BRAND = '#0F623F';

function App() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gran, setGran] = useState(DATA.defaults?.granularity || 'day');
  const [sideOpen, setSideOpen] = useState(false);

  const filters = useRef({
    from: DATA.defaults?.from || '',
    to: DATA.defaults?.to || '',
    granularity: DATA.defaults?.granularity || 'day',
    store_id: '',
  });

  const chartEl = useRef(null);
  const chart = useRef(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams(filters.current);
    fetch(URLS.data + '?' + p.toString(), { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => { setSummary(d.summary); renderChart(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const renderChart = (d) => {
    const opts = {
      chart: { type: 'area', height: 360, fontFamily: 'inherit', toolbar: { show: false }, zoom: { enabled: false } },
      series: [
        { name: 'Kỳ này', data: d.current },
        { name: 'Kỳ trước', data: d.previous },
      ],
      xaxis: { categories: d.labels, tickAmount: Math.min(12, d.labels.length), labels: { rotate: -45, rotateAlways: false } },
      yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (v) => Math.round(v) } },
      colors: [BRAND, '#B9C0C7'],
      stroke: { curve: 'smooth', width: [3, 2], dashArray: [0, 5] },
      fill: {
        type: ['gradient', 'solid'],
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.03, stops: [0, 90] },
        opacity: [0.35, 0],
      },
      dataLabels: { enabled: false },
      legend: { position: 'top', horizontalAlign: 'right' },
      grid: { borderColor: 'rgba(0,0,0,.06)' },
      tooltip: { shared: true },
      markers: { size: 0, hover: { size: 5 } },
    };

    if (!chart.current && chartEl.current) {
      chart.current = new ApexCharts(chartEl.current, opts);
      chart.current.render();
    } else if (chart.current) {
      chart.current.updateOptions({ xaxis: { categories: d.labels } }, false, false);
      chart.current.updateSeries(opts.series);
    }
  };

  useEffect(() => {
    if (window.flatpickr) {
      if (window.flatpickr.l10ns && window.flatpickr.l10ns.vn) window.flatpickr.localize(window.flatpickr.l10ns.vn);
      flatpickr('#rp-range', {
        mode: 'range', dateFormat: 'Y-m-d', altInput: true, altFormat: 'd/m/Y',
        defaultDate: [filters.current.from, filters.current.to],
        onChange: (sel) => {
          if (sel.length === 2) {
            const iso = (dd) => dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
            filters.current.from = iso(sel[0]);
            filters.current.to = iso(sel[1]);
            load();
          }
        },
      });
    }
    if ($ && $.fn.select2) {
      $('#rp-store').select2({ minimumResultsForSearch: Infinity, width: '100%' })
        .on('change', function () { filters.current.store_id = this.value; load(); });
    }
    load();
    return () => { try { chart.current?.destroy(); } catch (e) { /* ignore */ } };
  }, []); // eslint-disable-line

  const setGranularity = (g) => {
    setGran(g);
    filters.current.granularity = g;
    load();
  };

  const up = summary && summary.changePct >= 0;

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Báo cáo" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="chart" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Báo cáo</div>
            <h1>Báo cáo khách hàng mới</h1>
          </div>
          <div className="topbar-spacer" />
          {loading && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Đang tải…</span>}
        </header>

        <div className="content">
          {/* Tabs chuyển báo cáo */}
          <div className="rp-tabs">
            <a href="/admin/reports/customers" className="rp-tab">Tổng quan khách hàng</a>
            <a href="/admin/reports/new-customers" className="rp-tab on">Khách hàng mới</a>
          </div>

          {/* Bộ lọc */}
          <div className="rp-filters">
            <div className="rp-fld">
              <label>Khoảng ngày</label>
              <input id="rp-range" className="flat-inp" placeholder="Chọn khoảng ngày" />
            </div>
            <div className="rp-fld">
              <label>Cửa hàng</label>
              <select id="rp-store">
                <option value="">Tất cả cửa hàng</option>
                {(DATA.stores || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="rp-fld" style={{ flex: '0 0 auto' }}>
              <label>Nhóm theo</label>
              <div className="seg">
                <button className={gran === 'day' ? 'on' : ''} onClick={() => setGranularity('day')}>Ngày</button>
                <button className={gran === 'week' ? 'on' : ''} onClick={() => setGranularity('week')}>Tuần</button>
                <button className={gran === 'month' ? 'on' : ''} onClick={() => setGranularity('month')}>Tháng</button>
              </div>
            </div>
          </div>

          {/* KPI */}
          <div className="rp-kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: '#0F623F' }}><Icon name="star" size={20} color="#fff" /></div>
              <div className="k-lbl">Khách mới kỳ này</div>
              <div className="k-val tnum">{summary ? vnd(summary.currentTotal) : '…'}</div>
              <div className="k-sub">{summary ? `${summary.days} ngày` : ''}</div>
            </div>
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: up ? '#16A34A' : '#D4584B' }}><Icon name={up ? 'spark' : 'clock'} size={20} color="#fff" /></div>
              <div className="k-lbl">So với kỳ trước</div>
              <div className="k-val tnum" style={{ color: summary ? (up ? '#16A34A' : '#D4584B') : 'inherit' }}>
                {summary ? (up ? '+' : '') + summary.changePct + '%' : '…'}
              </div>
              <div className="k-sub">{summary ? `Kỳ trước: ${vnd(summary.prevTotal)} khách` : ''}</div>
            </div>
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: '#1E8FA8' }}><Icon name="chart" size={20} color="#fff" /></div>
              <div className="k-lbl">Trung bình / {summary?.granLabel || 'kỳ'}</div>
              <div className="k-val tnum">{summary ? vnd(summary.avg) : '…'}</div>
              <div className="k-sub">Khách mới mỗi {summary?.granLabel || 'kỳ'}</div>
            </div>
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: '#C99A2E' }}><Icon name="flame" size={20} color="#fff" /></div>
              <div className="k-lbl">Cao nhất</div>
              <div className="k-val tnum">{summary ? vnd(summary.peak) : '…'}</div>
              <div className="k-sub">{summary ? `vào ${summary.peakLabel}` : ''}</div>
            </div>
          </div>

          {/* Biểu đồ Area */}
          <div className="rp-card">
            <div className="rp-card-t">Tăng trưởng khách hàng mới (so sánh kỳ trước)</div>
            <div ref={chartEl} />
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
