/* global React, ReactDOM, Icon, AdminSidebar, ApexCharts, flatpickr */
const { useState, useEffect, useRef } = React;

const DATA = window.ADMIN_REPORT_DATA || {};
const URLS = DATA.urls || {};
const $ = window.jQuery;

const vnd = (n) => (Number(n) || 0).toLocaleString('vi-VN');
const BRAND = '#0F623F';

/* KPI meta: [key, nhãn, icon, màu, hàm phụ đề] */
const KPI_DEFS = [
  ['total',              'Tổng số khách hàng',        'users',   '#0F623F', () => 'Toàn hệ thống'],
  ['new',                'Khách hàng mới',            'star',    '#1E8FA8', () => 'Trong khoảng đã chọn'],
  ['returning',          'Khách hàng quay lại',       'refresh', '#6B4FA0', () => 'Mua từ 2 đơn trở lên'],
  ['active',             'Đang hoạt động',            'check',   '#16A34A', (k) => `Mua trong ${k.activeDays} ngày`],
  ['inactive',           'Không mua gần đây',         'clock',   '#D4584B', (k) => `Quá ${k.inactiveDays} ngày chưa mua`],
  ['returnRate',         'Tỷ lệ khách quay lại',      'percent', '#C99A2E', () => 'Quay lại / đã mua', '%'],
  ['aov',                'Giá trị đơn TB (AOV)',      'coin',    '#0F623F', () => 'Đơn hoàn tất trong khoảng', 'đ'],
  ['revenuePerCustomer', 'Doanh thu TB / khách',      'bag',     '#3E7CB1', () => 'Chi tiêu trọn đời / khách', 'đ'],
];

function App() {
  const [kpis, setKpis] = useState(DATA.defaults ? null : null);
  const [loading, setLoading] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);

  const filters = useRef({
    from: DATA.defaults?.from || '',
    to: DATA.defaults?.to || '',
    inactive_days: DATA.defaults?.inactive_days || 30,
    store_id: '',
  });

  const newChartEl = useRef(null);
  const structChartEl = useRef(null);
  const newChart = useRef(null);
  const structChart = useRef(null);
  const tableEl = useRef(null);
  const dt = useRef(null);

  /* ── Tải dữ liệu theo bộ lọc ── */
  const load = () => {
    setLoading(true);
    const p = new URLSearchParams(filters.current);
    fetch(URLS.data + '?' + p.toString(), { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => { setKpis(d.kpis); renderCharts(d); renderTable(d.customers); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  /* ── Biểu đồ (ApexCharts) ── */
  const renderCharts = (d) => {
    const cats = d.newByMonth.map(x => x.label);
    const vals = d.newByMonth.map(x => x.value);

    if (!newChart.current && newChartEl.current) {
      newChart.current = new ApexCharts(newChartEl.current, {
        chart: { type: 'bar', height: 300, fontFamily: 'inherit', toolbar: { show: false } },
        series: [{ name: 'Khách mới', data: vals }],
        xaxis: { categories: cats },
        colors: [BRAND],
        plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
        dataLabels: { enabled: false },
        grid: { borderColor: 'rgba(0,0,0,.06)' },
      });
      newChart.current.render();
    } else if (newChart.current) {
      newChart.current.updateOptions({ xaxis: { categories: cats } }, false, false);
      newChart.current.updateSeries([{ name: 'Khách mới', data: vals }]);
    }

    const s = d.structure;
    const donut = [s.returning, s.oneTime, s.never];
    if (!structChart.current && structChartEl.current) {
      structChart.current = new ApexCharts(structChartEl.current, {
        chart: { type: 'donut', height: 300, fontFamily: 'inherit' },
        series: donut,
        labels: ['Quay lại', 'Mua 1 lần', 'Chưa mua'],
        colors: ['#6B4FA0', '#1E8FA8', '#C9CCD1'],
        legend: { position: 'bottom' },
        dataLabels: { enabled: true, formatter: (v) => Math.round(v) + '%' },
      });
      structChart.current.render();
    } else if (structChart.current) {
      structChart.current.updateSeries(donut);
    }
  };

  /* ── Bảng (DataTables) ── */
  const renderTable = (rows) => {
    const tagLabel = { active: 'Đang hoạt động', inactive: 'Không mua gần đây', idle: 'Bình thường', never: 'Chưa mua' };
    const data = rows.map(r => [
      r.name,
      r.phone || '—',
      r.store,
      r.orders,
      vnd(r.spent) + 'đ',
      r.last,
      `<span class="rp-tag ${r.status}">${tagLabel[r.status] || r.status}</span>`,
    ]);

    if (dt.current) {
      dt.current.clear();
      dt.current.rows.add(data);
      dt.current.draw();
      return;
    }
    dt.current = $(tableEl.current).DataTable({
      data,
      columns: [
        { title: 'Khách hàng' }, { title: 'SĐT' }, { title: 'Cửa hàng' },
        { title: 'Số đơn' }, { title: 'Chi tiêu' }, { title: 'Mua gần nhất' }, { title: 'Trạng thái' },
      ],
      order: [[4, 'desc']],
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100],
      language: {
        search: 'Tìm:', lengthMenu: 'Hiện _MENU_ dòng', info: '_START_–_END_ / _TOTAL_ khách',
        infoEmpty: 'Không có khách', zeroRecords: 'Không tìm thấy', paginate: { previous: '‹', next: '›' },
      },
    });
  };

  /* ── Khởi tạo bộ lọc (Flatpickr + Select2) ── */
  useEffect(() => {
    // Flatpickr: khoảng ngày
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

    // Select2: cửa hàng + số ngày không mua
    if ($ && $.fn.select2) {
      $('#rp-store').select2({ minimumResultsForSearch: Infinity, width: '100%' })
        .on('change', function () { filters.current.store_id = this.value; load(); });
      $('#rp-inactive').select2({ minimumResultsForSearch: Infinity, width: '100%' })
        .on('change', function () { filters.current.inactive_days = this.value; load(); });
    }

    load();
    return () => {
      try { newChart.current?.destroy(); structChart.current?.destroy(); } catch (e) { /* ignore */ }
      try { dt.current?.destroy(); } catch (e) { /* ignore */ }
    };
  }, []); // eslint-disable-line

  const kpiValue = (def) => {
    if (!kpis) return '…';
    const [key, , , , , suffix] = def;
    const v = kpis[key];
    if (suffix === 'đ') return vnd(v) + 'đ';
    if (suffix === '%') return v + '%';
    return vnd(v);
  };

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Báo cáo" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="chart" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Báo cáo</div>
            <h1>Báo cáo khách hàng</h1>
          </div>
          <div className="topbar-spacer" />
          {loading && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Đang tải…</span>}
        </header>

        <div className="content">
          {/* Tabs chuyển báo cáo */}
          <div className="rp-tabs">
            <a href="/admin/reports/customers" className="rp-tab on">Tổng quan khách hàng</a>
            <a href="/admin/reports/new-customers" className="rp-tab">Khách hàng mới</a>
            <a href="/admin/reports/returning" className="rp-tab">Khách quay lại</a>
            <a href="/admin/reports/top-spenders" className="rp-tab">Top chi tiêu</a>
            <a href="/admin/reports/rfm" className="rp-tab">Phân tích RFM</a>
            <a href="/admin/reports/cohort" className="rp-tab">Cohort giữ chân</a>
            <a href="/admin/reports/orders" className="rp-tab">Đơn hàng</a>
          </div>

          {/* Bộ lọc */}
          <div className="rp-filters">
            <div className="rp-fld">
              <label>Khoảng ngày (khách mới / doanh thu)</label>
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
              <label>Không mua trong</label>
              <select id="rp-inactive" defaultValue={String(filters.current.inactive_days)}>
                {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} ngày</option>)}
              </select>
            </div>
          </div>

          {/* KPI */}
          <div className="rp-kpis">
            {KPI_DEFS.map(def => (
              <div className="rp-kpi" key={def[0]}>
                <div className="k-ic" style={{ background: def[3] }}><Icon name={def[2]} size={20} color="#fff" /></div>
                <div className="k-lbl">{def[1]}</div>
                <div className="k-val tnum">{kpiValue(def)}</div>
                <div className="k-sub">{kpis ? def[4](kpis) : ''}</div>
              </div>
            ))}
          </div>

          {/* Biểu đồ */}
          <div className="rp-charts">
            <div className="rp-card">
              <div className="rp-card-t">Khách hàng mới theo tháng</div>
              <div ref={newChartEl} />
            </div>
            <div className="rp-card">
              <div className="rp-card-t">Cơ cấu khách hàng</div>
              <div ref={structChartEl} />
            </div>
          </div>

          {/* Bảng */}
          <div className="rp-table-wrap">
            <div className="rp-card-t" style={{ marginBottom: 12 }}>Danh sách khách hàng</div>
            <table ref={tableEl} className="display" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
