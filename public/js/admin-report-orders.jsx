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

  const filters = useRef({
    from: DATA.defaults?.from || '', to: DATA.defaults?.to || '',
    granularity: DATA.defaults?.granularity || 'day', store_id: '',
  });

  const comboEl = useRef(null); const combo = useRef(null);
  const statusEl = useRef(null); const statusCh = useRef(null);
  const fulfillEl = useRef(null); const fulfillCh = useRef(null);
  const hourEl = useRef(null); const hourCh = useRef(null);
  const tableEl = useRef(null); const dt = useRef(null);
  const allOrders = useRef([]);
  const [modal, setModal] = useState(null); // { title, list }

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams(filters.current);
    fetch(URLS.data + '?' + p.toString(), { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => { setKpis(d.kpis); allOrders.current = d.orders || []; renderCharts(d); renderTable(d.daily); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  // Mở danh sách đơn khi bấm vào biểu đồ tròn
  const openOrders = (kind, value) => {
    const all = allOrders.current;
    let list = [], title = '';
    if (kind === 'type') {
      list = all.filter(o => o.type === value);
      title = value === 'ship' ? 'Đơn giao hàng' : 'Đơn tại quầy';
    } else {
      list = all.filter(o => o.statusLabel === value);
      title = 'Đơn: ' + value;
    }
    setModal({ title, list });
  };

  const renderCharts = (d) => {
    const labels = d.trend.map(x => x.label);
    // Combo: số đơn (cột) + doanh thu (đường)
    const comboOpts = {
      chart: { type: 'line', height: 350, fontFamily: 'inherit', toolbar: { show: false } },
      series: [
        { name: 'Số đơn', type: 'column', data: d.trend.map(x => x.orders) },
        { name: 'Doanh thu', type: 'line', data: d.trend.map(x => x.revenue) },
      ],
      stroke: { width: [0, 3], curve: 'smooth' },
      colors: ['#1E8FA8', '#0F623F'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      xaxis: { categories: labels, labels: { rotate: -45, rotateAlways: false } },
      yaxis: [
        { title: { text: 'Số đơn' }, labels: { formatter: (v) => Math.round(v) } },
        { opposite: true, title: { text: 'Doanh thu' }, labels: { formatter: (v) => vnd(v) } },
      ],
      dataLabels: { enabled: false },
      legend: { position: 'top', horizontalAlign: 'right' },
      grid: { borderColor: 'rgba(0,0,0,.06)' },
      tooltip: { shared: true, intersect: false, y: { formatter: (v, o) => o.seriesIndex === 1 ? vnd(v) + 'đ' : vnd(v) + ' đơn' } },
    };
    if (combo.current) { combo.current.destroy(); combo.current = null; }
    if (comboEl.current) { combo.current = new ApexCharts(comboEl.current, comboOpts); combo.current.render(); }

    // Donut trạng thái (bấm để xem đơn)
    if (statusCh.current) { statusCh.current.destroy(); statusCh.current = null; }
    if (statusEl.current && d.status?.length) {
      statusCh.current = new ApexCharts(statusEl.current, {
        chart: { type: 'donut', height: 320, fontFamily: 'inherit', events: { dataPointSelection: (e, ctx, cfg) => openOrders('status', d.status[cfg.dataPointIndex].label) } },
        series: d.status.map(s => s.value),
        labels: d.status.map(s => s.label),
        colors: d.status.map(s => s.color),
        legend: { position: 'bottom' },
        dataLabels: { enabled: true, formatter: (v) => Math.round(v) + '%' },
        tooltip: { y: { formatter: (v) => vnd(v) + ' đơn' } },
      });
      statusCh.current.render();
    }

    // Donut Giao / Tại quầy (bấm để xem đơn)
    if (fulfillCh.current) { fulfillCh.current.destroy(); fulfillCh.current = null; }
    if (fulfillEl.current && d.fulfillment?.length) {
      fulfillCh.current = new ApexCharts(fulfillEl.current, {
        chart: { type: 'donut', height: 320, fontFamily: 'inherit', events: { dataPointSelection: (e, ctx, cfg) => openOrders('type', d.fulfillment[cfg.dataPointIndex].type) } },
        series: d.fulfillment.map(f => f.value),
        labels: d.fulfillment.map(f => f.label),
        colors: ['#6B4FA0', '#1E8FA8'],
        legend: { position: 'bottom' },
        dataLabels: { enabled: true, formatter: (v) => Math.round(v) + '%' },
        tooltip: { y: { formatter: (v) => vnd(v) + ' đơn' } },
      });
      fulfillCh.current.render();
    }

    // Đơn theo khung giờ
    if (hourCh.current) { hourCh.current.destroy(); hourCh.current = null; }
    if (hourEl.current && d.byHour) {
      hourCh.current = new ApexCharts(hourEl.current, {
        chart: { type: 'bar', height: 320, fontFamily: 'inherit', toolbar: { show: false } },
        series: [{ name: 'Số đơn', data: d.byHour }],
        xaxis: { categories: d.byHour.map((_, h) => h + 'h'), tickAmount: 12 },
        colors: ['#0F623F'],
        plotOptions: { bar: { borderRadius: 3, columnWidth: '70%' } },
        dataLabels: { enabled: false },
        grid: { borderColor: 'rgba(0,0,0,.06)' },
        tooltip: { y: { formatter: (v) => vnd(v) + ' đơn' } },
      });
      hourCh.current.render();
    }
  };

  const renderTable = (rows) => {
    const data = (rows || []).map(r => [
      r.date, r.orders, r.completed, r.cancelled, vnd(r.revenue) + 'đ',
    ]);
    if (dt.current) { dt.current.clear(); dt.current.rows.add(data); dt.current.draw(); return; }
    dt.current = $(tableEl.current).DataTable({
      data,
      columns: [{ title: 'Ngày' }, { title: 'Số đơn' }, { title: 'Hoàn tất' }, { title: 'Huỷ' }, { title: 'Doanh thu' }],
      order: [], pageLength: 10, lengthMenu: [10, 25, 50, 100],
      language: { search: 'Tìm:', lengthMenu: 'Hiện _MENU_ dòng', info: '_START_–_END_ / _TOTAL_ ngày', infoEmpty: 'Không có dữ liệu', zeroRecords: 'Không tìm thấy', paginate: { previous: '‹', next: '›' } },
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
    return () => { try { combo.current?.destroy(); statusCh.current?.destroy(); fulfillCh.current?.destroy(); hourCh.current?.destroy(); dt.current?.destroy(); } catch (e) { /* ignore */ } };
  }, []); // eslint-disable-line

  const setGranularity = (g) => { setGran(g); filters.current.granularity = g; load(); };

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Báo cáo" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="bag" size={19} /></button>
          <div><div className="crumb">Quản lý · Báo cáo</div><h1>Báo cáo đơn hàng</h1></div>
          <div className="topbar-spacer" />
          {loading && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Đang tải…</span>}
        </header>
        <div className="content">
          <div className="rp-tabs">
            {TABS.map(([href, label]) => (
              <a key={href} href={href} className={'rp-tab' + (href === '/admin/reports/orders' ? ' on' : '')}>{label}</a>
            ))}
          </div>

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

          <div className="rp-kpis">
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#1E8FA8' }}><Icon name="bag" size={20} color="#fff" /></div><div className="k-lbl">Tổng đơn</div><div className="k-val tnum">{kpis ? vnd(kpis.total) : '…'}</div><div className="k-sub">Mọi trạng thái</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#0F623F' }}><Icon name="coin" size={20} color="#fff" /></div><div className="k-lbl">Doanh thu</div><div className="k-val tnum">{kpis ? vnd(kpis.revenue) + 'đ' : '…'}</div><div className="k-sub">Đơn hoàn tất</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#C99A2E' }}><Icon name="receipt" size={20} color="#fff" /></div><div className="k-lbl">Giá trị đơn TB</div><div className="k-val tnum">{kpis ? vnd(kpis.aov) + 'đ' : '…'}</div><div className="k-sub">AOV (hoàn tất)</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#16A34A' }}><Icon name="check" size={20} color="#fff" /></div><div className="k-lbl">Đơn hoàn tất</div><div className="k-val tnum">{kpis ? vnd(kpis.completed) : '…'}</div><div className="k-sub">Đã giao thành công</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#D4584B' }}><Icon name="close" size={20} color="#fff" /></div><div className="k-lbl">Đơn huỷ</div><div className="k-val tnum">{kpis ? vnd(kpis.cancelled) : '…'}</div><div className="k-sub">{kpis ? `Tỷ lệ ${kpis.cancelRate}%` : ''}</div></div>
            <div className="rp-kpi"><div className="k-ic" style={{ background: '#6B4FA0' }}><Icon name="truck" size={20} color="#fff" /></div><div className="k-lbl">Giao / Tại quầy</div><div className="k-val tnum" style={{ fontSize: 20 }}>{kpis ? `${vnd(kpis.ship)} / ${vnd(kpis.pickup)}` : '…'}</div><div className="k-sub">Đơn giao vs tại quầy</div></div>
          </div>

          <div className="rp-card" style={{ marginBottom: 20 }}>
            <div className="rp-card-t">Doanh thu & số đơn theo thời gian</div>
            <div ref={comboEl} />
          </div>

          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 10 }}>
            💡 Bấm vào phần biểu đồ tròn (trạng thái, giao/tại quầy) để xem danh sách đơn tương ứng.
          </div>
          <div className="rp-charts">
            <div className="rp-card"><div className="rp-card-t">Cơ cấu trạng thái đơn</div><div ref={statusEl} /></div>
            <div className="rp-card"><div className="rp-card-t">Giao hàng / Tại quầy</div><div ref={fulfillEl} /></div>
          </div>

          <div className="rp-card" style={{ marginBottom: 20 }}>
            <div className="rp-card-t">Đơn theo khung giờ (giờ cao điểm)</div>
            <div ref={hourEl} />
          </div>

          <div className="rp-table-wrap">
            <div className="rp-card-t" style={{ marginBottom: 12 }}>Chi tiết theo ngày</div>
            <table ref={tableEl} className="display" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-scrim" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580, width: '100%' }}>
            <div className="modal-h">
              <div className="mh-ic"><Icon name="bag" size={20} /></div>
              <div><h3>{modal.title}</h3><p>{modal.list.length} đơn</p></div>
              <button className="x" onClick={() => setModal(null)}><Icon name="close" size={18} /></button>
            </div>
            <div className="modal-b" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {modal.list.length === 0 && <div style={{ padding: 16, color: 'var(--ink-3)', textAlign: 'center' }}>Không có đơn trong nhóm này.</div>}
              {modal.list.map((o, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', borderBottom: '1px solid var(--line, #f0f0f0)' }}>
                  <span style={{ flexShrink: 0, color: o.type === 'ship' ? '#6B4FA0' : '#1E8FA8' }}><Icon name={o.type === 'ship' ? 'truck' : 'bag'} size={16} /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{o.code} · <span style={{ fontWeight: 500 }}>{o.customer}</span></div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{o.date} · {o.statusLabel}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 13.5, whiteSpace: 'nowrap' }}>{vnd(o.total)}đ</div>
                </div>
              ))}
            </div>
            <div className="modal-f"><button className="btn ghost" onClick={() => setModal(null)}>Đóng</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
