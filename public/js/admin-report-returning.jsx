/* global React, ReactDOM, Icon, AdminSidebar, ApexCharts, flatpickr */
const { useState, useEffect, useRef } = React;

const DATA = window.ADMIN_REPORT_DATA || {};
const URLS = DATA.urls || {};
const $ = window.jQuery;
const vnd = (n) => (Number(n) || 0).toLocaleString('vi-VN');

function App() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);

  const filters = useRef({
    from: DATA.defaults?.from || '',
    to: DATA.defaults?.to || '',
    store_id: '',
  });

  const funnelEl = useRef(null);
  const distEl = useRef(null);
  const funnel = useRef(null);
  const dist = useRef(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams(filters.current);
    fetch(URLS.data + '?' + p.toString(), { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => { setKpis(d.kpis); renderCharts(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const renderCharts = (d) => {
    // Funnel: ≥1 → ≥2 → ≥3 (thanh ngang kiểu phễu)
    const fVals = d.funnel.map(x => x.value);
    const fCats = d.funnel.map(x => x.label);
    if (!funnel.current && funnelEl.current) {
      funnel.current = new ApexCharts(funnelEl.current, {
        chart: { type: 'bar', height: 320, fontFamily: 'inherit', toolbar: { show: false } },
        series: [{ name: 'Khách', data: fVals }],
        xaxis: { categories: fCats },
        plotOptions: { bar: { horizontal: true, barHeight: '62%', borderRadius: 4, distributed: true, isFunnel: true } },
        colors: ['#1E8FA8', '#0F623F', '#C99A2E'],
        dataLabels: { enabled: true, formatter: (val, opt) => opt.w.globals.labels[opt.dataPointIndex] + ': ' + vnd(val), style: { fontSize: '13px', fontWeight: 700 }, dropShadow: { enabled: true } },
        legend: { show: false },
        grid: { show: false },
        tooltip: { enabled: true, y: { formatter: (v) => vnd(v) + ' khách' } },
      });
      funnel.current.render();
    } else if (funnel.current) {
      funnel.current.updateOptions({ xaxis: { categories: fCats } }, false, false);
      funnel.current.updateSeries([{ name: 'Khách', data: fVals }]);
    }

    // Phân bố số lần mua
    const dVals = d.distribution.map(x => x.value);
    const dCats = d.distribution.map(x => x.label);
    if (!dist.current && distEl.current) {
      dist.current = new ApexCharts(distEl.current, {
        chart: { type: 'bar', height: 320, fontFamily: 'inherit', toolbar: { show: false } },
        series: [{ name: 'Số khách', data: dVals }],
        xaxis: { categories: dCats },
        plotOptions: { bar: { borderRadius: 6, columnWidth: '55%', distributed: true } },
        colors: ['#B9C0C7', '#8FB8C9', '#4FA3C2', '#1E8FA8', '#0F623F'],
        dataLabels: { enabled: true, formatter: (v) => vnd(v) },
        legend: { show: false },
        grid: { borderColor: 'rgba(0,0,0,.06)' },
        tooltip: { y: { formatter: (v) => vnd(v) + ' khách' } },
      });
      dist.current.render();
    } else if (dist.current) {
      dist.current.updateOptions({ xaxis: { categories: dCats } }, false, false);
      dist.current.updateSeries([{ name: 'Số khách', data: dVals }]);
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
    return () => { try { funnel.current?.destroy(); dist.current?.destroy(); } catch (e) { /* ignore */ } };
  }, []); // eslint-disable-line

  const gapText = kpis ? (kpis.avgGap == null ? 'Chưa đủ dữ liệu' : `${vnd(kpis.avgGap)} ngày`) : '…';

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Báo cáo" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="refresh" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Báo cáo</div>
            <h1>Báo cáo khách hàng quay lại</h1>
          </div>
          <div className="topbar-spacer" />
          {loading && <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Đang tải…</span>}
        </header>

        <div className="content">
          <div className="rp-tabs">
            <a href="/admin/reports/customers" className="rp-tab">Tổng quan khách hàng</a>
            <a href="/admin/reports/new-customers" className="rp-tab">Khách hàng mới</a>
            <a href="/admin/reports/returning" className="rp-tab on">Khách quay lại</a>
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

          <div className="rp-kpis" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))' }}>
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: '#1E8FA8' }}><Icon name="star" size={20} color="#fff" /></div>
              <div className="k-lbl">Mua lần đầu</div>
              <div className="k-val tnum">{kpis ? vnd(kpis.firstOnly) : '…'}</div>
              <div className="k-sub">Chỉ mua 1 lần</div>
            </div>
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: '#0F623F' }}><Icon name="refresh" size={20} color="#fff" /></div>
              <div className="k-lbl">Mua từ lần 2</div>
              <div className="k-val tnum">{kpis ? vnd(kpis.repeat2) : '…'}</div>
              <div className="k-sub">Quay lại ≥ 2 lần</div>
            </div>
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: '#C99A2E' }}><Icon name="heart" size={20} color="#fff" /></div>
              <div className="k-lbl">Mua từ lần 3+</div>
              <div className="k-val tnum">{kpis ? vnd(kpis.loyal3) : '…'}</div>
              <div className="k-sub">Khách trung thành</div>
            </div>
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: '#6B4FA0' }}><Icon name="percent" size={20} color="#fff" /></div>
              <div className="k-lbl">Tỷ lệ khách quay lại</div>
              <div className="k-val tnum">{kpis ? kpis.returnRate + '%' : '…'}</div>
              <div className="k-sub">Quay lại / đã mua</div>
            </div>
            <div className="rp-kpi">
              <div className="k-ic" style={{ background: '#3E7CB1' }}><Icon name="clock" size={20} color="#fff" /></div>
              <div className="k-lbl">TB giữa 2 lần mua</div>
              <div className="k-val tnum">{gapText}</div>
              <div className="k-sub">Càng ngắn càng tốt</div>
            </div>
          </div>

          <div className="rp-charts">
            <div className="rp-card">
              <div className="rp-card-t">Phễu quay lại (≥1 → ≥2 → ≥3 lần)</div>
              <div ref={funnelEl} />
            </div>
            <div className="rp-card">
              <div className="rp-card-t">Phân bố số lần mua</div>
              <div ref={distEl} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
