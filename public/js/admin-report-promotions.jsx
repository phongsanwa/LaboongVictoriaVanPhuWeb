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
];

function App() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);
  const filters = useRef({ from: DATA.defaults?.from || '', to: DATA.defaults?.to || '', store_id: '' });

  const catEl = useRef(null); const catCh = useRef(null);
  const nameEl = useRef(null); const nameCh = useRef(null);
  const tableEl = useRef(null); const dt = useRef(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams(filters.current);
    fetch(URLS.data + '?' + p.toString(), { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => { setKpis(d.kpis); renderCharts(d); renderTable(d.byName); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  const renderCharts = (d) => {
    // Giảm giá theo loại (donut)
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

    // Top ưu đãi theo tiền giảm (thanh ngang)
    const rows = [...(d.byName || [])].slice(0, 12).reverse();
    if (nameCh.current) { nameCh.current.destroy(); nameCh.current = null; }
    if (nameEl.current && rows.length) {
      nameCh.current = new ApexCharts(nameEl.current, {
        chart: { type: 'bar', height: Math.max(300, rows.length * 32), fontFamily: 'inherit', toolbar: { show: false } },
        series: [{ name: 'Tiền giảm', data: rows.map(r => r.amount) }],
        xaxis: { categories: rows.map(r => r.name), labels: { formatter: (v) => vnd(v) } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '66%' } },
        colors: ['#0F623F'],
        dataLabels: { enabled: true, formatter: (v) => vnd(v) + 'đ', style: { colors: ['#fff'], fontSize: '11px' }, offsetX: -6, textAnchor: 'end' },
        grid: { borderColor: 'rgba(0,0,0,.06)' },
        tooltip: { y: { formatter: (v) => vnd(v) + 'đ' } },
      });
      nameCh.current.render();
    }
  };

  const renderTable = (rows) => {
    const data = (rows || []).map((r, i) => [i + 1, r.name, vnd(r.uses), vnd(r.amount) + 'đ']);
    if (dt.current) { dt.current.clear(); dt.current.rows.add(data); dt.current.draw(); return; }
    dt.current = $(tableEl.current).DataTable({
      data,
      columns: [{ title: '#' }, { title: 'Ưu đãi' }, { title: 'Số lần dùng' }, { title: 'Tổng giảm' }],
      order: [[3, 'desc']], pageLength: 10, lengthMenu: [10, 25, 50, 100],
      language: { search: 'Tìm:', lengthMenu: 'Hiện _MENU_ dòng', info: '_START_–_END_ / _TOTAL_ ưu đãi', infoEmpty: 'Không có dữ liệu', zeroRecords: 'Không tìm thấy', paginate: { previous: '‹', next: '›' } },
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
    }
    load();
    return () => { try { catCh.current?.destroy(); nameCh.current?.destroy(); dt.current?.destroy(); } catch (e) { /* ignore */ } };
  }, []); // eslint-disable-line

  const aovDelta = kpis && kpis.aovWithout > 0 ? Math.round((kpis.aovWith - kpis.aovWithout) / kpis.aovWithout * 100) : null;

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Báo cáo" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="ticket" size={19} /></button>
          <div><div className="crumb">Quản lý · Báo cáo</div><h1>Hiệu quả khuyến mãi & voucher</h1></div>
          <div className="topbar-spacer" />
          {loading && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Đang tải…</span>}
        </header>
        <div className="content">
          <div className="rp-tabs">
            {TABS.map(([href, label]) => (
              <a key={href} href={href} className={'rp-tab' + (href === '/admin/reports/promotions' ? ' on' : '')}>{label}</a>
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
          </div>

          <div className="rp-kpis">
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#D4584B' }}><Icon name="ticket" size={20} color="#fff" /></div><div className="k-lbl">Tổng tiền giảm</div><div className="k-val tnum">{kpis ? vnd(kpis.totalDiscount) + 'đ' : '…'}</div><div className="k-sub">Đã áp dụng cho khách</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#0F623F' }}><Icon name="bag" size={20} color="#fff" /></div><div className="k-lbl">Đơn có ưu đãi</div><div className="k-val tnum">{kpis ? vnd(kpis.ordersWith) : '…'}</div><div className="k-sub">{kpis ? `${kpis.usageRate}% tổng đơn` : ''}</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#1E8FA8' }}><Icon name="coin" size={20} color="#fff" /></div><div className="k-lbl">AOV đơn có ưu đãi</div><div className="k-val tnum">{kpis ? vnd(kpis.aovWith) + 'đ' : '…'}</div><div className="k-sub" style={{ color: aovDelta != null ? (aovDelta >= 0 ? '#16A34A' : '#D4584B') : 'var(--ink-3)' }}>{aovDelta != null ? `${aovDelta >= 0 ? '+' : ''}${aovDelta}% vs không ưu đãi` : ''}</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#C99A2E' }}><Icon name="gift" size={20} color="#fff" /></div><div className="k-lbl">Voucher phát hành</div><div className="k-val tnum">{kpis ? vnd(kpis.issued) : '…'}</div><div className="k-sub">Trong khoảng</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#6B4FA0' }}><Icon name="check" size={20} color="#fff" /></div><div className="k-lbl">Voucher đã dùng</div><div className="k-val tnum">{kpis ? vnd(kpis.used) : '…'}</div><div className="k-sub">{kpis ? `Tỷ lệ dùng ${kpis.redemptionRate}%` : ''}</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#3E7CB1' }}><Icon name="chart" size={20} color="#fff" /></div><div className="k-lbl">Doanh thu đơn có ưu đãi</div><div className="k-val tnum">{kpis ? vnd(kpis.revenueWith) + 'đ' : '…'}</div><div className="k-sub">Từ đơn áp dụng KM</div></div>
          </div>

          <div className="rp-charts">
            <div className="rp-card"><div className="rp-card-t">Tiền giảm theo loại ưu đãi</div><div ref={catEl} /></div>
            <div className="rp-card"><div className="rp-card-t">Top ưu đãi theo tiền giảm</div><div ref={nameEl} /></div>
          </div>

          <div className="rp-table-wrap">
            <div className="rp-card-t" style={{ marginBottom: 12 }}>Chi tiết theo ưu đãi</div>
            <table ref={tableEl} className="display" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
