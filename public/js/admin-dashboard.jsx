/* global React, ReactDOM, Icon, fmt, Sparkline, AreaChart, GroupBars, Donut, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, NAV_URLS, adminHref */
const { useState, useEffect } = React;

const DB_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const EMPTY_KPI = { value: 0, changePct: 0, sparkline: [0, 0, 0, 0, 0, 0, 0] };

const DATA = window.ADMIN_DASHBOARD_DATA || {
  admin: { name: "Quản trị viên", email: "", initials: "QT" },
  months: [], revenue: [], revenueTotal: 0,
  kpis: { revenue: EMPTY_KPI, newCustomers: EMPTY_KPI, pointsIssued: EMPTY_KPI, redemptionRate: EMPTY_KPI },
  points: [], tiers: [], tierTotal: 0, stores: [], rewards: [], feed: [],
};

function csrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : "";
}
async function apiCall(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-CSRF-TOKEN": csrfToken(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }
  return { ok: res.ok, status: res.status, data };
}

/* ---- percent helpers ---- */
function pctAbs(n) {
  const v = Math.round(Math.abs(n) * 10) / 10;
  return (Number.isInteger(v) ? v.toString() : v.toFixed(1)) + "%";
}
function pctSigned(n) {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return sign + pctAbs(n);
}

/* ---- CSV export of the dashboard's real series ---- */
function exportCsv(data) {
  const rows = [];
  rows.push(["Doanh thu 12 tháng (triệu đồng)"]);
  rows.push(["Tháng", ...data.months]);
  rows.push(["Doanh thu", ...data.revenue]);
  rows.push([]);
  rows.push(["Điểm phát hành & đổi (điểm)"]);
  rows.push(["Tháng", ...data.points.map(p => p.m)]);
  rows.push(["Phát hành", ...data.points.map(p => p.a)]);
  rows.push(["Đã đổi", ...data.points.map(p => p.b)]);
  rows.push([]);
  rows.push(["Phân bố hạng thành viên"]);
  data.tiers.forEach(t => rows.push([t.label, t.value]));
  rows.push([]);
  rows.push(["Doanh thu theo cửa hàng (triệu đồng, tháng này)"]);
  data.stores.forEach(s => rows.push([s.name, s.v]));
  rows.push([]);
  rows.push(["Quà được đổi nhiều nhất (tháng này)"]);
  data.rewards.forEach(r => rows.push([r.name, r.count]));

  const csv = "﻿" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laboong-bao-cao-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function EmptyRow({ label }) {
  return <div style={{ textAlign: "center", color: "var(--ink-3)", padding: "32px 12px", fontWeight: 500, fontSize: 13 }}>{label}</div>;
}

function App() {
  const [tw, setTweak] = useTweaks(DB_DEFAULTS);
  const [range, setRange] = useState("30d");
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const logout = async (e) => {
    e.preventDefault();
    await apiCall("POST", "/logout");
    location.href = NAV_URLS.login;
  };

  const NAV = [
    { ic: "chart", label: "Tổng quan", on: true },
    { ic: "users", label: "Khách hàng" },
    { ic: "receipt", label: "Điểm & giao dịch" },
    { ic: "gift", label: "Đổi quà" },
    { ic: "mega", label: "Chiến dịch" },
    { ic: "pin", label: "Cửa hàng" },
    { ic: "shield", label: "Phân quyền" },
    { ic: "gear", label: "Cài đặt" },
  ];

  const { revenue: kRevenue, newCustomers: kCust, pointsIssued: kPoints, redemptionRate: kRate } = DATA.kpis;

  return (
    <div className="shell">
      {sideOpen && <div className="scrim" style={{ zIndex: 55 }} onClick={() => setSideOpen(false)} />}
      <aside className={"side" + (sideOpen ? " open" : "")}>
        <div className="side-brand">
          <div className="side-mark"><span>L</span></div>
          <div><div className="nm">Laboong</div><div className="sb">Bảng quản trị</div></div>
        </div>
        <div className="side-sec">Quản lý</div>
        <nav className="side-nav">
          {NAV.slice(0, 6).map(n => (
            <a key={n.label} className={"side-link" + (n.on ? " on" : "")} href={adminHref(n.label)}><Icon name={n.ic} size={19} /> {n.label}</a>
          ))}
        </nav>
        <div className="side-sec">Hệ thống</div>
        <nav className="side-nav">
          {NAV.slice(6).map(n => (
            <a key={n.label} className="side-link" href={adminHref(n.label)}><Icon name={n.ic} size={19} /> {n.label}</a>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="side-av">{DATA.admin.initials}</div>
            <div style={{ minWidth: 0 }}><div className="un">{DATA.admin.name}</div><div className="ur">{DATA.admin.email}</div></div>
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: "auto" }} onClick={logout} title="Đăng xuất"><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Tổng quan</div>
            <h1>Tổng quan</h1>
          </div>
          <div className="topbar-spacer" />
          <div className="range-seg">
            {[["7d", "7 ngày"], ["30d", "30 ngày"], ["12m", "12 tháng"]].map(([k, l]) => (
              <button key={k} className={range === k ? "on" : ""} onClick={() => setRange(k)}>{l}</button>
            ))}
          </div>
          <button className="btn primary" onClick={() => exportCsv(DATA)}><Icon name="download" size={16} color="#fff" /> Xuất báo cáo</button>
        </header>

        <div className="content">
          {/* KPI row */}
          <div className="stats" style={{ marginBottom: 16 }}>
            <div className="kpi">
              <div className="kpi-top"><span className="kpi-ic stat-ic g"><Icon name="chart" size={19} /></span><span className="kpi-lbl">Doanh thu tháng</span><span className={"kpi-chg " + (kRevenue.changePct >= 0 ? "up" : "down")}><Icon name="spark" size={11} /> {pctAbs(kRevenue.changePct)}</span></div>
              <div className="kpi-val">{fmt(kRevenue.value)}<small> tr đ</small></div>
              <div className="kpi-spark"><Sparkline data={kRevenue.sparkline} /></div>
            </div>
            <div className="kpi">
              <div className="kpi-top"><span className="kpi-ic stat-ic b"><Icon name="users" size={19} /></span><span className="kpi-lbl">Khách hàng mới</span><span className={"kpi-chg " + (kCust.changePct >= 0 ? "up" : "down")}><Icon name="spark" size={11} /> {pctAbs(kCust.changePct)}</span></div>
              <div className="kpi-val">{fmt(kCust.value)}</div>
              <div className="kpi-spark"><Sparkline data={kCust.sparkline} color="var(--diamond)" /></div>
            </div>
            <div className="kpi">
              <div className="kpi-top"><span className="kpi-ic stat-ic y"><Icon name="coin" size={19} /></span><span className="kpi-lbl">Điểm phát hành</span><span className={"kpi-chg " + (kPoints.changePct >= 0 ? "up" : "down")}><Icon name="spark" size={11} /> {pctAbs(kPoints.changePct)}</span></div>
              <div className="kpi-val">{fmt(kPoints.value)}<small> điểm</small></div>
              <div className="kpi-spark"><Sparkline data={kPoints.sparkline} color="var(--gold)" /></div>
            </div>
            <div className="kpi">
              <div className="kpi-top"><span className="kpi-ic stat-ic p"><Icon name="gift" size={19} /></span><span className="kpi-lbl">Tỷ lệ đổi điểm</span><span className={"kpi-chg " + (kRate.changePct >= 0 ? "up" : "down")}><Icon name="spark" size={11} /> {pctAbs(kRate.changePct)}</span></div>
              <div className="kpi-val">{fmt(Math.round(kRate.value))}<small>%</small></div>
              <div className="kpi-spark"><Sparkline data={kRate.sparkline} color="#E0518A" /></div>
            </div>
          </div>

          <div className="dash-grid">
            {/* revenue area */}
            <div className="chart-panel span2">
              <div className="chart-h">
                <div><div className="ct">Doanh thu 12 tháng</div><div className="cs">Đơn vị: triệu đồng</div></div>
                <div className="cv"><div className="n">{fmt(DATA.revenueTotal)} tr</div><div className="d">{pctSigned(DATA.kpis.revenue.changePct)} so với tháng trước</div></div>
              </div>
              <div className="chart-area"><AreaChart data={DATA.revenue} /></div>
              <div className="bar-x">{DATA.months.map((m, i) => <span key={i}>{m}</span>)}</div>
            </div>

            {/* points issued vs redeemed */}
            <div className="chart-panel">
              <div className="chart-h"><div><div className="ct">Điểm phát hành & đổi</div><div className="cs">6 tháng gần nhất (điểm)</div></div></div>
              <div className="legend">
                <span className="lg"><span className="sw" style={{ background: "var(--brand)" }} /> Phát hành</span>
                <span className="lg"><span className="sw" style={{ background: "var(--gold)" }} /> Đã đổi</span>
              </div>
              <div className="chart-area"><GroupBars data={DATA.points} /></div>
              <div className="bar-x">{DATA.points.map((p, i) => <span key={i}>{p.m}</span>)}</div>
            </div>

            {/* tier donut */}
            <div className="chart-panel">
              <div className="chart-h"><div><div className="ct">Phân bố hạng thành viên</div><div className="cs">Tổng {fmt(DATA.tierTotal)} thành viên</div></div></div>
              <div className="donut-wrap">
                <div className="donut-svg">
                  <Donut segments={DATA.tiers} total={DATA.tierTotal} />
                  <div className="donut-center"><div className="dn">{fmt(DATA.tierTotal)}</div><div className="dl">thành viên</div></div>
                </div>
                <div className="donut-legend">
                  {DATA.tiers.map(t => (
                    <div className="dleg" key={t.label}>
                      <span className="sw" style={{ background: t.color }} /><span className="dt">{t.label}</span>
                      <span className="dv">{fmt(t.value)}</span><span className="dp">{Math.round(t.value / (DATA.tierTotal || 1) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* top stores */}
            <div className="chart-panel">
              <div className="chart-h"><div><div className="ct">Doanh thu theo cửa hàng</div><div className="cs">Tháng này · triệu đồng</div></div></div>
              <div className="hbars">
                {DATA.stores.map((s, i) => (
                  <div className="hbar" key={s.name}>
                    <div className="ht">
                      <span className="hname"><span className="hrank">{i + 1}</span><span className="hnt">{s.name}</span></span>
                      <span className="hval">{fmt(s.v)} tr</span>
                    </div>
                    <div className="htrack"><div className="hfill" style={{ width: (s.v / (s.max || 1) * 100) + "%" }} /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* top rewards */}
            <div className="chart-panel">
              <div className="chart-h"><div><div className="ct">Quà được đổi nhiều nhất</div><div className="cs">Tháng này</div></div></div>
              <div className="toplist">
                {DATA.rewards.length === 0 && <EmptyRow label="Chưa có lượt đổi quà nào" />}
                {DATA.rewards.map(r => (
                  <div className="topitem" key={r.name}>
                    <span className="tic" style={{ background: r.grad }}><Icon name={r.ic} size={19} color="#fff" /></span>
                    <div style={{ minWidth: 0 }}><div className="tn">{r.name}</div><div className="tm">{r.cat}</div></div>
                    <div className="tcount"><div className="tv">{fmt(r.count)}</div><div className="tl">lượt đổi</div></div>
                  </div>
                ))}
              </div>
            </div>

            {/* activity feed */}
            <div className="chart-panel span2">
              <div className="chart-h"><div><div className="ct">Hoạt động gần đây</div></div></div>
              <div className="feed">
                {DATA.feed.length === 0 && <EmptyRow label="Chưa có hoạt động nào" />}
                {DATA.feed.map((f, i) => (
                  <div className="feeditem" key={i}>
                    <span className="feed-ic" style={{ background: f.bg, color: f.c }}><Icon name={f.ic} size={17} color="currentColor" /></span>
                    <div><div className="feed-tx">{f.segments.map((s, j) => s.b ? <b key={j}>{s.text}</b> : <span key={j}>{s.text}</span>)}</div><div className="feed-time">{f.t}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F", "#07432A"], ["#005A36", "#003D24"], ["#3E5C8A", "#2A4063"], ["#6B4FA0", "#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
