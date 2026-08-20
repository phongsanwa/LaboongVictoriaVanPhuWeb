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
  const [sideOpen, setSideOpen] = useState(false);
  const filters = useRef({ from: DATA.defaults?.from || '', to: DATA.defaults?.to || '', top_n: DATA.defaults?.top_n || 15, store_id: '' });

  const prodEl = useRef(null); const prodCh = useRef(null);
  const catEl = useRef(null); const catCh = useRef(null);
  const topEl = useRef(null); const topCh = useRef(null);
  const tableEl = useRef(null); const dt = useRef(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams(filters.current);
    fetch(URLS.data + '?' + p.toString(), { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => { setKpis(d.kpis); renderCharts(d); renderTable(d.all); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  const renderCharts = (d) => {
    // Top sản phẩm theo số lượng (thanh ngang, #1 trên cùng)
    const rows = [...(d.topProducts || [])].reverse();
    if (prodCh.current) { prodCh.current.destroy(); prodCh.current = null; }
    if (prodEl.current) {
      prodCh.current = new ApexCharts(prodEl.current, {
        chart: { type: 'bar', height: Math.max(320, rows.length * 30), fontFamily: 'inherit', toolbar: { show: false } },
        series: [{ name: 'Số lượng bán', data: rows.map(r => r.qty) }],
        xaxis: { categories: rows.map(r => r.name) },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '68%' } },
        colors: ['#0F623F'],
        dataLabels: { enabled: true, formatter: (v) => vnd(v), style: { colors: ['#fff'], fontSize: '11.5px' }, offsetX: -6, textAnchor: 'end' },
        grid: { borderColor: 'rgba(0,0,0,.06)' },
        tooltip: { y: { formatter: (v) => vnd(v) + ' ly' } },
      });
      prodCh.current.render();
    }

    // Doanh thu theo danh mục (donut)
    if (catCh.current) { catCh.current.destroy(); catCh.current = null; }
    if (catEl.current && d.byCategory?.length) {
      catCh.current = new ApexCharts(catEl.current, {
        chart: { type: 'donut', height: 320, fontFamily: 'inherit' },
        series: d.byCategory.map(c => c.value),
        labels: d.byCategory.map(c => c.label),
        colors: d.byCategory.map(c => c.color),
        legend: { position: 'bottom' },
        dataLabels: { enabled: true, formatter: (v) => Math.round(v) + '%' },
        tooltip: { y: { formatter: (v) => vnd(v) + 'đ' } },
      });
      catCh.current.render();
    }

    // Top topping (thanh ngang)
    const tops = [...(d.toppings || [])].reverse();
    if (topCh.current) { topCh.current.destroy(); topCh.current = null; }
    if (topEl.current && tops.length) {
      topCh.current = new ApexCharts(topEl.current, {
        chart: { type: 'bar', height: Math.max(280, tops.length * 30), fontFamily: 'inherit', toolbar: { show: false } },
        series: [{ name: 'Số lượng', data: tops.map(t => t.qty) }],
        xaxis: { categories: tops.map(t => t.name) },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '66%' } },
        colors: ['#C99A2E'],
        dataLabels: { enabled: true, formatter: (v) => vnd(v), style: { colors: ['#fff'], fontSize: '11px' }, offsetX: -6, textAnchor: 'end' },
        grid: { borderColor: 'rgba(0,0,0,.06)' },
        tooltip: { y: { formatter: (v) => vnd(v) + ' phần' } },
      });
      topCh.current.render();
    }
  };

  const renderTable = (rows) => {
    const data = (rows || []).map((r, i) => [
      i + 1, r.name, r.cat, vnd(r.qty), r.orders, vnd(r.revenue) + 'đ', r.share + '%',
    ]);
    if (dt.current) { dt.current.clear(); dt.current.rows.add(data); dt.current.draw(); return; }
    dt.current = $(tableEl.current).DataTable({
      data,
      columns: [{ title: '#' }, { title: 'Sản phẩm' }, { title: 'Danh mục' }, { title: 'SL bán' }, { title: 'Số đơn' }, { title: 'Doanh thu' }, { title: '% DThu' }],
      order: [[3, 'desc']], pageLength: 10, lengthMenu: [10, 25, 50, 100],
      language: { search: 'Tìm:', lengthMenu: 'Hiện _MENU_ dòng', info: '_START_–_END_ / _TOTAL_ món', infoEmpty: 'Không có dữ liệu', zeroRecords: 'Không tìm thấy', paginate: { previous: '‹', next: '›' } },
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
    if ($ && $.fn.select2) {
      $('#rp-store').select2({ minimumResultsForSearch: Infinity, width: '100%' })
        .on('change', function () { filters.current.store_id = this.value; load(); });
      $('#rp-topn').select2({ minimumResultsForSearch: Infinity, width: '100%' })
        .on('change', function () { filters.current.top_n = this.value; load(); });
    }
    load();
    return () => { try { prodCh.current?.destroy(); catCh.current?.destroy(); topCh.current?.destroy(); dt.current?.destroy(); } catch (e) { /* ignore */ } };
  }, []); // eslint-disable-line

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Báo cáo" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="cup" size={19} /></button>
          <div><div className="crumb">Quản lý · Báo cáo</div><h1>Sản phẩm bán chạy</h1></div>
          <div className="topbar-spacer" />
          {loading && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Đang tải…</span>}
        </header>
        <div className="content">
          <div className="rp-tabs">
            {TABS.map(([href, label]) => (
              <a key={href} href={href} className={'rp-tab' + (href === '/admin/reports/products' ? ' on' : '')}>{label}</a>
            ))}
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
                {[10, 15, 20, 50].map(n => <option key={n} value={n}>Top {n}</option>)}
              </select>
            </div>
          </div>

          <div className="rp-kpis">
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#0F623F' }}><Icon name="cup" size={20} color="#fff" /></div><div className="k-lbl">Tổng ly/món bán ra</div><div className="k-val tnum">{kpis ? vnd(kpis.itemsSold) : '…'}</div><div className="k-sub">Đơn hoàn tất</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#1E8FA8' }}><Icon name="coin" size={20} color="#fff" /></div><div className="k-lbl">Doanh thu sản phẩm</div><div className="k-val tnum">{kpis ? vnd(kpis.productRevenue) + 'đ' : '…'}</div><div className="k-sub">Tổng theo món</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#C99A2E' }}><Icon name="grid" size={20} color="#fff" /></div><div className="k-lbl">Số món có bán</div><div className="k-val tnum">{kpis ? vnd(kpis.distinctProducts) : '…'}</div><div className="k-sub">Món khác nhau</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#D4584B' }}><Icon name="flame" size={20} color="#fff" /></div><div className="k-lbl">Bán chạy nhất</div><div className="k-val tnum" style={{ fontSize: 17 }}>{kpis ? kpis.bestName : '…'}</div><div className="k-sub">{kpis ? vnd(kpis.bestQty) + ' ly' : ''}</div></div>
          </div>

          <div className="rp-charts">
            <div className="rp-card"><div className="rp-card-t">Top sản phẩm bán chạy (số lượng)</div><div ref={prodEl} /></div>
            <div className="rp-card"><div className="rp-card-t">Doanh thu theo danh mục</div><div ref={catEl} /></div>
          </div>

          <div className="rp-card" style={{ marginBottom: 20 }}>
            <div className="rp-card-t">Top topping bán kèm</div>
            <div ref={topEl} />
          </div>

          <div className="rp-table-wrap">
            <div className="rp-card-t" style={{ marginBottom: 12 }}>Chi tiết sản phẩm</div>
            <table ref={tableEl} className="display" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
