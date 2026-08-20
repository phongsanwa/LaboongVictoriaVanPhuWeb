/* global React, ReactDOM, Icon, AdminSidebar, ApexCharts */
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
  const [sideOpen, setSideOpen] = useState(false);
  const filters = useRef({ store_id: '' });

  const treeEl = useRef(null); const tree = useRef(null);
  const heatEl = useRef(null); const heat = useRef(null);
  const tableEl = useRef(null); const dt = useRef(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams(filters.current);
    fetch(URLS.data + '?' + p.toString(), { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => { setKpis(d.kpis); renderCharts(d); renderTable(d.customers); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  const renderCharts = (d) => {
    // Treemap nhóm khách
    const segData = (d.segments || []).map(s => ({ x: s.label, y: s.count }));
    const segColors = (d.segments || []).map(s => s.color);
    if (tree.current) { tree.current.destroy(); tree.current = null; }
    if (treeEl.current && segData.length) {
      tree.current = new ApexCharts(treeEl.current, {
        chart: { type: 'treemap', height: 340, fontFamily: 'inherit', toolbar: { show: false } },
        series: [{ data: segData }],
        colors: segColors,
        plotOptions: { treemap: { distributed: true, enableShades: false } },
        dataLabels: { enabled: true, style: { fontSize: '12px', fontWeight: 700 }, formatter: (t, op) => [t, vnd(op.value) + ' khách'] },
        legend: { show: false },
      });
      tree.current.render();
    }

    // Heatmap R × F
    if (heat.current) { heat.current.destroy(); heat.current = null; }
    if (heatEl.current && d.grid?.length) {
      heat.current = new ApexCharts(heatEl.current, {
        chart: { type: 'heatmap', height: 340, fontFamily: 'inherit', toolbar: { show: false } },
        series: d.grid,
        colors: ['#1AA86A'],
        dataLabels: { enabled: true, style: { fontWeight: 700 } },
        plotOptions: { heatmap: { enableShades: true, shadeIntensity: 0.6, radius: 4 } },
        xaxis: { title: { text: 'Tần suất (F: 1 thấp → 5 cao)' } },
        yaxis: { title: { text: 'Gần đây (R)' } },
        tooltip: { y: { formatter: (v) => vnd(v) + ' khách' } },
      });
      heat.current.render();
    }
  };

  const renderTable = (rows) => {
    const data = (rows || []).map(r => [
      r.name, r.phone || '—', vnd(r.recency) + ' ngày', r.freq, vnd(r.monetary) + 'đ',
      `${r.r}-${r.f}-${r.m}`, r.seg,
    ]);
    if (dt.current) { dt.current.clear(); dt.current.rows.add(data); dt.current.draw(); return; }
    dt.current = $(tableEl.current).DataTable({
      data,
      columns: [
        { title: 'Khách hàng' }, { title: 'SĐT' }, { title: 'Gần đây (R)' }, { title: 'Tần suất (F)' },
        { title: 'Chi tiêu (M)' }, { title: 'Điểm RFM' }, { title: 'Nhóm' },
      ],
      order: [[4, 'desc']], pageLength: 10, lengthMenu: [10, 25, 50, 100],
      language: { search: 'Tìm:', lengthMenu: 'Hiện _MENU_ dòng', info: '_START_–_END_ / _TOTAL_ khách', infoEmpty: 'Không có khách', zeroRecords: 'Không tìm thấy', paginate: { previous: '‹', next: '›' } },
    });
  };

  useEffect(() => {
    if ($ && $.fn.select2) {
      $('#rp-store').select2({ minimumResultsForSearch: Infinity, width: '100%' })
        .on('change', function () { filters.current.store_id = this.value; load(); });
    }
    load();
    return () => { try { tree.current?.destroy(); heat.current?.destroy(); dt.current?.destroy(); } catch (e) { /* ignore */ } };
  }, []); // eslint-disable-line

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Báo cáo" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div><div className="crumb">Quản lý · Báo cáo</div><h1>Phân tích RFM</h1></div>
          <div className="topbar-spacer" />
          {loading && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Đang tải…</span>}
        </header>
        <div className="content">
          <div className="rp-tabs">
            {TABS.map(([href, label]) => (
              <a key={href} href={href} className={'rp-tab' + (href === '/admin/reports/rfm' ? ' on' : '')}>{label}</a>
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
            <div style={{ flex: 1, minWidth: 0, alignSelf: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
              R = mua gần đây · F = số lần mua · M = tổng chi tiêu (điểm 1–5 theo ngũ phân vị).
            </div>
          </div>

          <div className="rp-kpis">
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#0F623F' }}><Icon name="users" size={20} color="#fff" /></div><div className="k-lbl">Khách phân tích</div><div className="k-val tnum">{kpis ? vnd(kpis.total) : '…'}</div><div className="k-sub">Có mua ≥ 1 lần</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#1AA86A' }}><Icon name="star" size={20} color="#fff" /></div><div className="k-lbl">Nhà vô địch</div><div className="k-val tnum">{kpis ? vnd(kpis.champions) : '…'}</div><div className="k-sub">R & F cao nhất</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#D4584B' }}><Icon name="clock" size={20} color="#fff" /></div><div className="k-lbl">Nguy cơ rời bỏ</div><div className="k-val tnum">{kpis ? vnd(kpis.atRisk) : '…'}</div><div className="k-sub">Cần chăm sóc lại</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#8A9199' }}><Icon name="eyeoff" size={20} color="#fff" /></div><div className="k-lbl">Ngủ đông / đã mất</div><div className="k-val tnum">{kpis ? vnd(kpis.lost) : '…'}</div><div className="k-sub">Lâu không mua</div></div>
          </div>

          <div className="rp-charts">
            <div className="rp-card"><div className="rp-card-t">Nhóm khách theo RFM</div><div ref={treeEl} /></div>
            <div className="rp-card"><div className="rp-card-t">Lưới Gần đây × Tần suất</div><div ref={heatEl} /></div>
          </div>

          <div className="rp-table-wrap">
            <div className="rp-card-t" style={{ marginBottom: 12 }}>Chi tiết khách theo RFM</div>
            <table ref={tableEl} className="display" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
