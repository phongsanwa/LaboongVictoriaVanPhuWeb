/* global React, ReactDOM, Icon, fmt, Sparkline, AreaChart, GroupBars, Donut, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect } = React;

const DB_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const MONTHS = ["T7", "T8", "T9", "T10", "T11", "T12", "T1", "T2", "T3", "T4", "T5", "T6"];
const REVENUE = [182, 195, 188, 210, 232, 256, 224, 218, 241, 250, 263, 286]; // triệu đ
const POINTS = [
  { m: "T1", a: 142, b: 48 }, { m: "T2", a: 138, b: 52 }, { m: "T3", a: 165, b: 61 },
  { m: "T4", a: 158, b: 58 }, { m: "T5", a: 178, b: 67 }, { m: "T6", a: 182, b: 62 },
];

const TIERS = [
  { label: "Đồng", value: 845, color: "#A9743F" },
  { label: "Bạc", value: 562, color: "#7C8794" },
  { label: "Vàng", value: 318, color: "#C99A2E" },
  { label: "Kim Cương", value: 95, color: "#1E8FA8" },
];
const TIER_TOTAL = TIERS.reduce((s, t) => s + t.value, 0);

const STORES = [
  { name: "Victoria Văn Phú", v: 286, max: 286 },
  { name: "Times City", v: 241, max: 286 },
  { name: "Royal City", v: 218, max: 286 },
  { name: "Aeon Hà Đông", v: 176, max: 286 },
  { name: "Vincom Bà Triệu", v: 152, max: 286 },
];

const REWARDS = [
  { name: "Voucher giảm 30.000đ", cat: "Voucher", count: 486, grad: "linear-gradient(135deg,#FF8A5B,#FF6FA5)", ic: "ticket" },
  { name: "Trà sữa size L miễn phí", cat: "Đồ uống", count: 312, grad: "linear-gradient(135deg,#0F623F,#1AA86A)", ic: "cup" },
  { name: "Topping trân châu", cat: "Nâng cấp", count: 268, grad: "linear-gradient(135deg,#A9743F,#C99A6A)", ic: "sparkle2" },
  { name: "Voucher giảm 50.000đ", cat: "Voucher", count: 184, grad: "linear-gradient(135deg,#C99A2E,#E0B84A)", ic: "ticket" },
];

const FEED = [
  { ic: "rocket", c: "var(--brand)", bg: "var(--brand-soft)", tx: <>Chiến dịch <b>Chào hè giảm 25%</b> đạt <b>712 chuyển đổi</b></>, t: "12 phút trước" },
  { ic: "gift", c: "#E0518A", bg: "color-mix(in srgb,#FF6FA5 14%, var(--panel))", tx: <>Khách <b>Đỗ Khánh Linh</b> đổi <b>Ly giữ nhiệt</b> (2.500 điểm)</>, t: "34 phút trước" },
  { ic: "users", c: "var(--diamond)", bg: "var(--diamond-bg)", tx: <><b>8 khách hàng mới</b> đăng ký hôm nay</>, t: "1 giờ trước" },
  { ic: "bellpush", c: "var(--gold)", bg: "var(--gold-bg)", tx: <>Đã gửi push <b>"Voucher sắp hết hạn"</b> tới 1.820 người</>, t: "2 giờ trước" },
  { ic: "coin", c: "var(--brand)", bg: "var(--brand-soft)", tx: <>Phát hành <b>+182.400 điểm</b> trong tháng 6</>, t: "Hôm nay" },
];

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

  const NAV = [
    { ic: "chart", label: "Tổng quan", on: true },
    { ic: "users", label: "Khách hàng" },
    { ic: "receipt", label: "Điểm & giao dịch" },
    { ic: "gift", label: "Đổi quà" },
    { ic: "mega", label: "Chiến dịch" },
    { ic: "shield", label: "Phân quyền" },
    { ic: "gear", label: "Cài đặt" },
  ];

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
          {NAV.slice(0, 5).map(n => (
            <a key={n.label} className={"side-link" + (n.on ? " on" : "")} href={adminHref(n.label)}><Icon name={n.ic} size={19} /> {n.label}</a>
          ))}
        </nav>
        <div className="side-sec">Hệ thống</div>
        <nav className="side-nav">
          {NAV.slice(5).map(n => (
            <a key={n.label} className="side-link" href={adminHref(n.label)}><Icon name={n.ic} size={19} /> {n.label}</a>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="side-av">QT</div>
            <div style={{ minWidth: 0 }}><div className="un">Quản trị viên</div><div className="ur">admin@laboong.vn</div></div>
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: "auto" }}><Icon name="logout" size={16} /></button>
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
          <button className="btn primary"><Icon name="download" size={16} color="#fff" /> Xuất báo cáo</button>
        </header>

        <div className="content">
          {/* KPI row */}
          <div className="stats" style={{ marginBottom: 16 }}>
            <div className="kpi">
              <div className="kpi-top"><span className="kpi-ic stat-ic g"><Icon name="chart" size={19} /></span><span className="kpi-lbl">Doanh thu tháng</span><span className="kpi-chg up"><Icon name="spark" size={11} /> 8.7%</span></div>
              <div className="kpi-val">286<small>tr đ</small></div>
              <div className="kpi-spark"><Sparkline data={REVENUE.slice(-7)} /></div>
            </div>
            <div className="kpi">
              <div className="kpi-top"><span className="kpi-ic stat-ic b"><Icon name="users" size={19} /></span><span className="kpi-lbl">Khách hàng mới</span><span className="kpi-chg up"><Icon name="spark" size={11} /> 12%</span></div>
              <div className="kpi-val">245</div>
              <div className="kpi-spark"><Sparkline data={[28, 31, 30, 38, 35, 42, 41]} color="var(--diamond)" /></div>
            </div>
            <div className="kpi">
              <div className="kpi-top"><span className="kpi-ic stat-ic y"><Icon name="coin" size={19} /></span><span className="kpi-lbl">Điểm phát hành</span><span className="kpi-chg up"><Icon name="spark" size={11} /> 5.2%</span></div>
              <div className="kpi-val">1,82<small>tr</small></div>
              <div className="kpi-spark"><Sparkline data={POINTS.map(p => p.a)} color="var(--gold)" /></div>
            </div>
            <div className="kpi">
              <div className="kpi-top"><span className="kpi-ic stat-ic p"><Icon name="gift" size={19} /></span><span className="kpi-lbl">Tỷ lệ đổi điểm</span><span className="kpi-chg down"><Icon name="spark" size={11} /> 1.4%</span></div>
              <div className="kpi-val">34<small>%</small></div>
              <div className="kpi-spark"><Sparkline data={[31, 33, 36, 34, 35, 34, 34]} color="#E0518A" /></div>
            </div>
          </div>

          <div className="dash-grid">
            {/* revenue area */}
            <div className="chart-panel span2">
              <div className="chart-h">
                <div><div className="ct">Doanh thu 12 tháng</div><div className="cs">Đơn vị: triệu đồng</div></div>
                <div className="cv"><div className="n">2.665 tr</div><div className="d">+12.4% so với năm trước</div></div>
              </div>
              <div className="chart-area"><AreaChart data={REVENUE} /></div>
              <div className="bar-x">{MONTHS.map(m => <span key={m}>{m}</span>)}</div>
            </div>

            {/* points issued vs redeemed */}
            <div className="chart-panel">
              <div className="chart-h"><div><div className="ct">Điểm phát hành & đổi</div><div className="cs">6 tháng gần nhất (nghìn điểm)</div></div></div>
              <div className="legend">
                <span className="lg"><span className="sw" style={{ background: "var(--brand)" }} /> Phát hành</span>
                <span className="lg"><span className="sw" style={{ background: "var(--gold)" }} /> Đã đổi</span>
              </div>
              <div className="chart-area"><GroupBars data={POINTS} /></div>
              <div className="bar-x">{POINTS.map(p => <span key={p.m}>{p.m}</span>)}</div>
            </div>

            {/* tier donut */}
            <div className="chart-panel">
              <div className="chart-h"><div><div className="ct">Phân bố hạng thành viên</div><div className="cs">Tổng {fmt(TIER_TOTAL)} thành viên</div></div></div>
              <div className="donut-wrap">
                <div className="donut-svg">
                  <Donut segments={TIERS} total={TIER_TOTAL} />
                  <div className="donut-center"><div className="dn">{fmt(TIER_TOTAL)}</div><div className="dl">thành viên</div></div>
                </div>
                <div className="donut-legend">
                  {TIERS.map(t => (
                    <div className="dleg" key={t.label}>
                      <span className="sw" style={{ background: t.color }} /><span className="dt">{t.label}</span>
                      <span className="dv">{fmt(t.value)}</span><span className="dp">{Math.round(t.value / TIER_TOTAL * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* top stores */}
            <div className="chart-panel">
              <div className="chart-h"><div><div className="ct">Doanh thu theo cửa hàng</div><div className="cs">Tháng 6 · triệu đồng</div></div></div>
              <div className="hbars">
                {STORES.map((s, i) => (
                  <div className="hbar" key={s.name}>
                    <div className="ht">
                      <span className="hname"><span className="hrank">{i + 1}</span><span className="hnt">{s.name}</span></span>
                      <span className="hval">{s.v} tr</span>
                    </div>
                    <div className="htrack"><div className="hfill" style={{ width: (s.v / s.max * 100) + "%" }} /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* top rewards */}
            <div className="chart-panel">
              <div className="chart-h"><div><div className="ct">Quà được đổi nhiều nhất</div><div className="cs">Tháng 6</div></div></div>
              <div className="toplist">
                {REWARDS.map(r => (
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
                {FEED.map((f, i) => (
                  <div className="feeditem" key={i}>
                    <span className="feed-ic" style={{ background: f.bg, color: f.c }}><Icon name={f.ic} size={17} color="currentColor" /></span>
                    <div><div className="feed-tx">{f.tx}</div><div className="feed-time">{f.t}</div></div>
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
