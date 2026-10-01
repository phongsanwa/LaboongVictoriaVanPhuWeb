/* global React, ReactDOM, Icon, AdminSidebar, ApexCharts, flatpickr */
const { useState, useEffect, useRef } = React;

const DATA = window.ADMIN_REPORT_DATA || {};
const URLS = DATA.urls || {};
const $ = window.jQuery;
const vnd = (n) => (Number(n) || 0).toLocaleString('vi-VN');

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
  ['/admin/reports/points', 'Điểm thưởng'],
];

function App() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gran, setGran] = useState(DATA.defaults?.granularity || 'day');
  const [sideOpen, setSideOpen] = useState(false);
  const filters = useRef({ from: DATA.defaults?.from || '', to: DATA.defaults?.to || '', granularity: DATA.defaults?.granularity || 'day' });

  const srcEl = useRef(null); const srcCh = useRef(null);
  const trendEl = useRef(null); const trendCh = useRef(null);
  const rewardEl = useRef(null); const rewardCh = useRef(null);
  const tableEl = useRef(null); const dt = useRef(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams(filters.current);
    fetch(URLS.data + '?' + p.toString(), { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => { setKpis(d.kpis); renderCharts(d); renderTable(d.topRewards); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  const renderCharts = (d) => {
    // Phát hành theo nguồn (donut)
    if (srcCh.current) { srcCh.current.destroy(); srcCh.current = null; }
    if (srcEl.current && d.bySource?.length) {
      srcCh.current = new ApexCharts(srcEl.current, {
        chart: { type: 'donut', height: 320, fontFamily: 'inherit' },
        series: d.bySource.map(s => s.value),
        labels: d.bySource.map(s => s.label),
        colors: d.bySource.map(s => s.color),
        legend: { position: 'bottom' },
        dataLabels: { enabled: true, formatter: (v) => Math.round(v) + '%' },
        tooltip: { y: { formatter: (v) => vnd(v) + ' điểm' } },
      });
      srcCh.current.render();
    }

    // Phát hành vs tiêu theo thời gian (cột nhóm)
    const labels = d.trend.map(x => x.label);
    if (trendCh.current) { trendCh.current.destroy(); trendCh.current = null; }
    if (trendEl.current) {
      trendCh.current = new ApexCharts(trendEl.current, {
        chart: { type: 'bar', height: 340, fontFamily: 'inherit', toolbar: { show: false } },
        series: [
          { name: 'Phát hành', data: d.trend.map(x => x.earned) },
          { name: 'Đã tiêu', data: d.trend.map(x => x.spent) },
        ],
        xaxis: { categories: labels, labels: { rotate: -45, rotateAlways: false } },
        colors: ['#0F623F', '#D4584B'],
        plotOptions: { bar: { borderRadius: 4, columnWidth: '65%' } },
        dataLabels: { enabled: false },
        legend: { position: 'top', horizontalAlign: 'right' },
        grid: { borderColor: 'rgba(0,0,0,.06)' },
        tooltip: { y: { formatter: (v) => vnd(v) + ' điểm' } },
      });
      trendCh.current.render();
    }

    // Top quà đổi (thanh ngang)
    const rewards = [...(d.topRewards || [])].slice(0, 10).reverse();
    if (rewardCh.current) { rewardCh.current.destroy(); rewardCh.current = null; }
    if (rewardEl.current && rewards.length) {
      rewardCh.current = new ApexCharts(rewardEl.current, {
        chart: { type: 'bar', height: Math.max(280, rewards.length * 32), fontFamily: 'inherit', toolbar: { show: false } },
        series: [{ name: 'Lượt đổi', data: rewards.map(r => r.count) }],
        xaxis: { categories: rewards.map(r => r.name) },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '66%' } },
        colors: ['#C99A2E'],
        dataLabels: { enabled: true, formatter: (v) => vnd(v), style: { colors: ['#fff'], fontSize: '11px' }, offsetX: -6, textAnchor: 'end' },
        grid: { borderColor: 'rgba(0,0,0,.06)' },
        tooltip: { y: { formatter: (v) => vnd(v) + ' lượt' } },
      });
      rewardCh.current.render();
    }
  };

  const renderTable = (rows) => {
    const data = (rows || []).map((r, i) => [i + 1, r.name, vnd(r.count), vnd(r.points) + ' điểm']);
    if (dt.current) { dt.current.clear(); dt.current.rows.add(data); dt.current.draw(); return; }
    dt.current = $(tableEl.current).DataTable({
      data,
      columns: [{ title: '#' }, { title: 'Quà / phần thưởng' }, { title: 'Lượt đổi' }, { title: 'Điểm đã tiêu' }],
      order: [[2, 'desc']], pageLength: 10, lengthMenu: [10, 25, 50, 100],
      language: { search: 'Tìm:', lengthMenu: 'Hiện _MENU_ dòng', info: '_START_–_END_ / _TOTAL_ quà', infoEmpty: 'Không có dữ liệu', zeroRecords: 'Không tìm thấy', paginate: { previous: '‹', next: '›' } },
    });
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
            filters.current.from = iso(sel[0]); filters.current.to = iso(sel[1]); load();
          }
        },
      });
    }
    load();
    return () => { try { srcCh.current?.destroy(); trendCh.current?.destroy(); rewardCh.current?.destroy(); dt.current?.destroy(); } catch (e) { /* ignore */ } };
  }, []); // eslint-disable-line

  const setGranularity = (g) => { setGran(g); filters.current.granularity = g; load(); };

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Báo cáo" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="coin" size={19} /></button>
          <div><div className="crumb">Quản lý · Báo cáo</div><h1>Báo cáo điểm thưởng</h1></div>
          <div className="topbar-spacer" />
          {loading && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Đang tải…</span>}
        </header>
        <div className="content">
          <div className="rp-tabs">
            {TABS.map(([href, label]) => (
              <a key={href} href={href} className={'rp-tab' + (href === '/admin/reports/points' ? ' on' : '')}>{label}</a>
            ))}
          </div>

          <div className="rp-filters">
            <div className="rp-fld">
              <label>Khoảng ngày</label>
              <input id="rp-range" className="flat-inp" placeholder="Chọn khoảng ngày" />
            </div>
            <div className="rp-fld" style={{ flex: '0 0 auto' }}>
              <label>Nhóm theo</label>
              <div className="seg">
                <button className={gran === 'day' ? 'on' : ''} onClick={() => setGranularity('day')}>Ngày</button>
                <button className={gran === 'week' ? 'on' : ''} onClick={() => setGranularity('week')}>Tuần</button>
                <button className={gran === 'month' ? 'on' : ''} onClick={() => setGranularity('month')}>Tháng</button>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, alignSelf: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
              Điểm phát hành = điểm cộng cho khách; đã tiêu = điểm dùng đổi quà.
            </div>
          </div>

          <div className="rp-kpis">
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#0F623F' }}><Icon name="coin" size={20} color="#fff" /></div><div className="k-lbl">Điểm phát hành</div><div className="k-val tnum">{kpis ? vnd(kpis.earned) : '…'}</div><div className="k-sub">Cộng cho khách</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#D4584B' }}><Icon name="gift" size={20} color="#fff" /></div><div className="k-lbl">Điểm đã tiêu</div><div className="k-val tnum">{kpis ? vnd(kpis.spent) : '…'}</div><div className="k-sub">Đổi quà</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#1E8FA8' }}><Icon name="chart" size={20} color="#fff" /></div><div className="k-lbl">Điểm ròng</div><div className="k-val tnum">{kpis ? vnd(kpis.net) : '…'}</div><div className="k-sub">Phát hành − đã tiêu</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#C99A2E' }}><Icon name="percent" size={20} color="#fff" /></div><div className="k-lbl">Tỷ lệ dùng điểm</div><div className="k-val tnum">{kpis ? kpis.burnRate + '%' : '…'}</div><div className="k-sub">Đã tiêu / phát hành</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#6B4FA0' }}><Icon name="gift" size={20} color="#fff" /></div><div className="k-lbl">Lượt đổi quà</div><div className="k-val tnum">{kpis ? vnd(kpis.redeemCount) : '…'}</div><div className="k-sub">Trong khoảng</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#3E7CB1' }}><Icon name="coin" size={20} color="#fff" /></div><div className="k-lbl">Điểm đang lưu hành</div><div className="k-val tnum">{kpis ? vnd(kpis.outstanding) : '…'}</div><div className="k-sub">Tổng số dư hiện tại</div></div>
          </div>

          <div className="rp-card" style={{ marginBottom: 20 }}>
            <div className="rp-card-t">Điểm phát hành vs đã tiêu theo thời gian</div>
            <div ref={trendEl} />
          </div>

          <div className="rp-charts">
            <div className="rp-card"><div className="rp-card-t">Điểm phát hành theo nguồn</div><div ref={srcEl} /></div>
            <div className="rp-card"><div className="rp-card-t">Top quà được đổi</div><div ref={rewardEl} /></div>
          </div>

          <div className="rp-table-wrap">
            <div className="rp-card-t" style={{ marginBottom: 12 }}>Chi tiết quà đổi</div>
            <table ref={tableEl} className="display" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
