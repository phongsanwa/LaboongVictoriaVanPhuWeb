/* global React, ReactDOM, Icon, AdminSidebar, ApexCharts, flatpickr */
const { useState, useEffect, useRef } = React;

const DATA = window.ADMIN_REPORT_DATA || {};
const URLS = DATA.urls || {};
const $ = window.jQuery;
const vnd = (n) => (Number(n) || 0).toLocaleString('vi-VN');
const BRAND = '#0F623F';

function App() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);

  const filters = useRef({
    from: DATA.defaults?.from || '',
    to: DATA.defaults?.to || '',
    top_n: DATA.defaults?.top_n || 20,
    store_id: '',
  });

  const chartEl = useRef(null);
  const chart = useRef(null);
  const tableEl = useRef(null);
  const dt = useRef(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams(filters.current);
    fetch(URLS.data + '?' + p.toString(), { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => { setKpis(d.kpis); renderChart(d.top); renderTable(d.all); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const renderChart = (top) => {
    // Đảo ngược để hạng #1 nằm trên cùng của thanh ngang
    const rows = [...top].reverse();
    const names = rows.map(r => r.name);
    const vals = rows.map(r => r.revenue);
    const height = Math.max(320, rows.length * 30);

    const opts = {
      chart: { type: 'bar', height, fontFamily: 'inherit', toolbar: { show: false } },
      series: [{ name: 'Chi tiêu', data: vals }],
      xaxis: { categories: names, labels: { formatter: (v) => vnd(v) } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '68%' } },
      colors: [BRAND],
      dataLabels: { enabled: true, formatter: (v) => vnd(v) + 'đ', style: { fontSize: '11.5px', colors: ['#fff'] }, offsetX: -6, textAnchor: 'end' },
      grid: { borderColor: 'rgba(0,0,0,.06)' },
      tooltip: { y: { formatter: (v) => vnd(v) + 'đ' } },
    };

    if (chart.current) { chart.current.destroy(); chart.current = null; }
    if (chartEl.current) {
      chart.current = new ApexCharts(chartEl.current, opts);
      chart.current.render();
    }
  };

  const renderTable = (rows) => {
    const data = rows.map((r, i) => [
      i + 1, r.name, r.phone || '—', r.store,
      r.orders, vnd(r.revenue) + 'đ', vnd(r.aov) + 'đ', r.last,
    ]);
    if (dt.current) { dt.current.clear(); dt.current.rows.add(data); dt.current.draw(); return; }
    dt.current = $(tableEl.current).DataTable({
      data,
      columns: [
        { title: '#' }, { title: 'Khách hàng' }, { title: 'SĐT' }, { title: 'Cửa hàng' },
        { title: 'Số đơn' }, { title: 'Chi tiêu' }, { title: 'TB/đơn' }, { title: 'Mua gần nhất' },
      ],
      order: [[5, 'desc']],
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100],
      language: {
        search: 'Tìm:', lengthMenu: 'Hiện _MENU_ dòng', info: '_START_–_END_ / _TOTAL_ khách',
        infoEmpty: 'Không có khách', zeroRecords: 'Không tìm thấy', paginate: { previous: '‹', next: '›' },
      },
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
      $('#rp-topn').select2({ minimumResultsForSearch: Infinity, width: '100%' })
        .on('change', function () { filters.current.top_n = this.value; load(); });
    }
    load();
    return () => {
      try { chart.current?.destroy(); } catch (e) { /* ignore */ }
      try { dt.current?.destroy(); } catch (e) { /* ignore */ }
    };
  }, []); // eslint-disable-line

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Báo cáo" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="coin" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Báo cáo</div>
            <h1>Top khách chi tiêu</h1>
          </div>
          <div className="topbar-spacer" />
          {loading && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Đang tải…</span>}
        </header>

        <div className="content">
          <div className="rp-tabs">
            <a href="/admin/reports/customers" className="rp-tab">Tổng quan khách hàng</a>
            <a href="/admin/reports/new-customers" className="rp-tab">Khách hàng mới</a>
            <a href="/admin/reports/returning" className="rp-tab">Khách quay lại</a>
            <a href="/admin/reports/top-spenders" className="rp-tab on">Top chi tiêu</a>
            <a href="/admin/reports/rfm" className="rp-tab">Phân tích RFM</a>
            <a href="/admin/reports/cohort" className="rp-tab">Cohort giữ chân</a>
            <a href="/admin/reports/orders" className="rp-tab">Đơn hàng</a>
          </div>

          <div className="rp-filters">
            <div className="rp-fld">
              <label>Khoảng ngày (đơn hoàn tất)</label>
              <input id="rp-range" className="flat-inp" placeholder="Chọn khoảng ngày" />
            </div>
            <div className="rp-fld">
              <label>Cửa hàng</label>
              <select id="rp-store">
                <option value="">Tất cả cửa hàng</option>
                {(DATA.stores || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="rp-fld">
              <label>Số lượng top</label>
              <select id="rp-topn" defaultValue={String(filters.current.top_n)}>
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>Top {n}</option>)}
              </select>
            </div>
          </div>

          <div className="rp-kpis">
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: '#0F623F' }}><Icon name="coin" size={20} color="#fff" /></div>
              <div className="k-lbl">Tổng doanh thu (khách)</div>
              <div className="k-val tnum">{kpis ? vnd(kpis.totalRevenue) + 'đ' : '…'}</div>
              <div className="k-sub">Đơn hoàn tất trong khoảng</div>
            </div>
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: '#1E8FA8' }}><Icon name="users" size={20} color="#fff" /></div>
              <div className="k-lbl">Khách có mua</div>
              <div className="k-val tnum">{kpis ? vnd(kpis.payingCustomers) : '…'}</div>
              <div className="k-sub">TB {kpis ? vnd(kpis.avgPerCustomer) + 'đ' : '…'}/khách</div>
            </div>
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: '#C99A2E' }}><Icon name="star" size={20} color="#fff" /></div>
              <div className="k-lbl">Khách chi tiêu cao nhất</div>
              <div className="k-val tnum" style={{ fontSize: 18 }}>{kpis ? kpis.topName : '…'}</div>
              <div className="k-sub">{kpis ? vnd(kpis.topRevenue) + 'đ' : ''}</div>
            </div>
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: '#6B4FA0' }}><Icon name="percent" size={20} color="#fff" /></div>
              <div className="k-lbl">Top 10 đóng góp</div>
              <div className="k-val tnum">{kpis ? kpis.top10Share + '%' : '…'}</div>
              <div className="k-sub">Tỷ trọng doanh thu</div>
            </div>
          </div>

          <div className="rp-card" style={{ marginBottom: 20 }}>
            <div className="rp-card-t">Top khách chi tiêu nhiều nhất</div>
            <div ref={chartEl} />
          </div>

          <div className="rp-table-wrap">
            <div className="rp-card-t" style={{ marginBottom: 12 }}>Bảng xếp hạng chi tiêu</div>
            <table ref={tableEl} className="display" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
