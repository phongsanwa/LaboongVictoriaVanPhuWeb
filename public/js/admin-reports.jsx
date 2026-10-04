/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
// Báo cáo & điểm hòa vốn
const { useState, useMemo, useEffect } = React;

const RP_DEFAULTS = { brand: ["#0F623F", "#07432A"], dark: false };
const RPDATA = window.ADMIN_REPORTS_DATA || { admin: {}, stores: [], entries: {}, monthly_costs: {}, recipes: [] };

const SCALE_M = 0.75;

function fmtVnd(n) { return Math.round(n || 0).toLocaleString("vi-VN") + "đ"; }

// Aggregate entries for a store or all stores within last N days
function aggregateEntries(entries, storeIds, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);

  let totalRev = 0, totalCogs = 0, totalExp = 0, totalCups = 0;
  const byDate = {};
  const byRecipe = {};

  storeIds.forEach(sid => {
    const storeEntries = entries[sid] || [];
    storeEntries.forEach(e => {
      const d = new Date(e.date);
      if (d < cutoff) return;
      totalRev += e.revenue;
      totalCogs += e.cogs;
      totalExp += e.expenses_total;
      totalCups += e.cups;
      byDate[e.date] = (byDate[e.date] || { rev: 0, cogs: 0, exp: 0 });
      byDate[e.date].rev += e.revenue;
      byDate[e.date].cogs += e.cogs;
      byDate[e.date].exp += e.expenses_total;
      (e.sales || []).forEach(s => {
        if (!byRecipe[s.recipe_id]) byRecipe[s.recipe_id] = { name: s.recipe_name, cups: 0, revenue: 0, cogs: 0 };
        const r = byRecipe[s.recipe_id];
        r.cups += s.qty_m + s.qty_l;
        r.revenue += s.qty_m * s.price_m + s.qty_l * s.price_l;
        r.cogs += s.qty_m * (s.cogs_l * SCALE_M) + s.qty_l * s.cogs_l;
      });
    });
  });

  return { totalRev, totalCogs, totalExp, totalCups, byDate, byRecipe };
}

function getDailyFixed(monthly_costs, storeIds, ym) {
  let total = 0;
  storeIds.forEach(sid => {
    const mc = (monthly_costs[sid] || {})[ym];
    if (mc) total += mc;
  });
  return total;
}

function currentYM() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function buildChartData(byDate, range, fixedDaily) {
  const now = new Date();
  const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  if (range === "7d") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - 6 + i);
      const key = d.toISOString().slice(0, 10);
      const day = byDate[key] || { rev: 0, cogs: 0, exp: 0 };
      return { label: DAY_NAMES[d.getDay()], rev: day.rev, cogs: day.cogs, profit: day.rev - day.cogs - fixedDaily };
    });
  }
  if (range === "4w") {
    return Array.from({ length: 4 }, (_, i) => {
      const start = new Date(now); start.setDate(start.getDate() - (3 - i) * 7 - 6);
      const end = new Date(now); end.setDate(end.getDate() - (3 - i) * 7);
      let rev = 0, cogs = 0;
      for (const [k, v] of Object.entries(byDate)) {
        const d = new Date(k);
        if (d >= start && d <= end) { rev += v.rev; cogs += v.cogs; }
      }
      return { label: `Tuần ${i + 1}`, rev, cogs, profit: rev - cogs - fixedDaily * 7 };
    });
  }
  // 12m
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let rev = 0, cogs = 0;
    for (const [k, v] of Object.entries(byDate)) {
      if (k.slice(0, 7) === ym) { rev += v.rev; cogs += v.cogs; }
    }
    return { label: `T${d.getMonth() + 1}`, rev, cogs, profit: rev - cogs - fixedDaily * 30 };
  });
}

function BarChart({ bars }) {
  const maxRev = Math.max(...bars.map(b => b.rev), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180, padding: "0 4px" }}>
      {bars.map((b, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
          <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, height: "100%" }}>
            <div style={{ width: "30%", borderRadius: "5px 5px 0 0", background: "#3D8B63", height: `${Math.round((b.rev / maxRev) * 100)}%` }} />
            <div style={{ width: "30%", borderRadius: "5px 5px 0 0", background: "#E8845C", height: `${Math.round((b.cogs / maxRev) * 100)}%` }} />
            <div style={{ width: "30%", borderRadius: "5px 5px 0 0", background: "#F2C744", height: `${Math.max(2, Math.round((Math.max(b.profit, 0) / maxRev) * 100))}%` }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)" }}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}

function ReportsApp() {
  const [tw, setTweak] = useTweaks(RP_DEFAULTS);
  const [sideOpen, setSideOpen] = useState(false);
  const [activeStore, setActiveStore] = useState("all");
  const [range, setRange] = useState("7d");

  const stores = RPDATA.stores || [];
  const admin = RPDATA.admin || {};
  const entries = RPDATA.entries || {};
  const monthly_costs = RPDATA.monthly_costs || {};

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b); r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const storeIds = useMemo(() => activeStore === "all" ? stores.map(s => s.id) : [parseInt(activeStore)], [activeStore, stores]);
  const rangeDays = range === "7d" ? 7 : range === "4w" ? 28 : 365;

  const { totalRev, totalCogs, totalExp, totalCups, byDate, byRecipe } = useMemo(
    () => aggregateEntries(entries, storeIds, rangeDays),
    [entries, storeIds, rangeDays]
  );

  const ym = currentYM();
  const fixedMonthly = useMemo(() => getDailyFixed(monthly_costs, storeIds, ym) * 30, [monthly_costs, storeIds, ym]);
  const fixedPeriod = useMemo(() => {
    const days = range === "7d" ? 7 : range === "4w" ? 28 : 365;
    return getDailyFixed(monthly_costs, storeIds, ym) * days;
  }, [monthly_costs, storeIds, ym, range]);
  const fixedDaily = getDailyFixed(monthly_costs, storeIds, ym);

  const netProfit = totalRev - totalCogs - fixedPeriod;
  const grossMarginPct = totalRev > 0 ? Math.round((totalRev - totalCogs) / totalRev * 100) : 0;
  const netMarginPct = totalRev > 0 ? Math.round(netProfit / totalRev * 100) : 0;

  // Breakeven
  const avgMarginPerCup = totalCups > 0 ? (totalRev - totalCogs) / totalCups : 0;
  const breakevenCups = fixedDaily > 0 && avgMarginPerCup > 0 ? Math.ceil(fixedDaily / avgMarginPerCup) : 0;
  const safetyRatio = breakevenCups > 0 && totalCups > 0 ? (totalCups / rangeDays) / breakevenCups : 0;
  const safetyColor = safetyRatio >= 1.5 ? "#3D8B63" : safetyRatio >= 1.05 ? "#B4762A" : "#C0552B";
  const safetyLabel = safetyRatio >= 1.5 ? "An toàn" : safetyRatio >= 1.05 ? "Sát ngưỡng" : "Dưới hòa vốn";

  const chartBars = useMemo(() => buildChartData(byDate, range, fixedDaily), [byDate, range, fixedDaily]);

  const dishRanking = useMemo(() => Object.values(byRecipe)
    .map(r => ({ ...r, contribution: r.revenue - r.cogs, marginPct: r.revenue > 0 ? Math.round((r.revenue - r.cogs) / r.revenue * 100) : 0 }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 6), [byRecipe]);

  const fixedItems = useMemo(() => {
    const labels = { rent: "Thuê mặt bằng", salary: "Lương nhân viên", utility: "Điện nước", depreciation: "Khấu hao máy móc" };
    const totals = {};
    storeIds.forEach(sid => {
      const mc = monthly_costs[sid];
      if (!mc) return;
      const costs = mc[ym];
      if (costs) {
        Object.entries(costs).forEach(([k, v]) => {
          if (typeof v === "number") totals[k] = (totals[k] || 0) + v;
        });
      }
    });
    return Object.entries(totals).map(([k, v]) => ({ label: labels[k] || k, value: v }));
  }, [monthly_costs, storeIds, ym]);

  const storeTabs = [{ key: "all", label: "Toàn hệ thống" }, ...stores.map(s => ({ key: String(s.id), label: s.name }))];
  const rangeTabs = [{ key: "7d", label: "7 ngày" }, { key: "4w", label: "4 tuần" }, { key: "12m", label: "12 tháng" }];

  const activeStoreLabel = storeTabs.find(t => t.key === activeStore)?.label || "Toàn hệ thống";

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 64, background: "var(--bg, #F7F5F0)" }}>
      {/* topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, padding: "18px 24px", background: "var(--brand)", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <a href="/admin" style={{ width: 38, height: 38, borderRadius: 10, background: "#F2C744", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "var(--brand)", fontSize: 18, textDecoration: "none" }}>L</a>
          <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.2px" }}>Laboong</div>
          <a href="/admin/overview" style={{ marginLeft: 14, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)", textDecoration: "none", padding: "7px 12px", borderRadius: 9, background: "rgba(255,255,255,0.1)" }}>← Tổng quan</a>
        </div>
        <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.12)", padding: 4, borderRadius: 12, flexShrink: 0 }}>
          {storeTabs.map(t => (
            <button key={t.key} onClick={() => setActiveStore(t.key)} style={{ padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, border: "none", background: activeStore === t.key ? "#fff" : "transparent", color: activeStore === t.key ? "var(--brand)" : "rgba(255,255,255,0.85)" }}>{t.label}</button>
          ))}
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E8845C", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{admin.initials}</div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 24px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--ink, #1A2420)", letterSpacing: "-0.4px" }}>Báo cáo & điểm hòa vốn — {activeStoreLabel}</div>
            <div style={{ fontSize: 14.5, color: "var(--ink-2, #6B756F)", marginTop: 4 }}>Doanh thu, giá vốn, chi phí cố định phân bổ → lợi nhuận ròng và điểm hòa vốn</div>
          </div>
          <div style={{ display: "flex", gap: 6, background: "#EFEBDF", padding: 4, borderRadius: 11 }}>
            {rangeTabs.map(r => (
              <button key={r.key} onClick={() => setRange(r.key)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", border: "none", background: range === r.key ? "#fff" : "transparent", color: range === r.key ? "var(--brand)" : "#6B756F" }}>{r.label}</button>
            ))}
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Doanh thu", value: fmtVnd(totalRev), color: "#1A2420", note: `${rangeTabs.find(r=>r.key===range)?.label} · ${totalCups} ly` },
            { label: "Giá vốn (COGS)", value: fmtVnd(totalCogs), color: "#E8845C", note: `${grossMarginPct}% biên gộp` },
            { label: "Chi phí cố định phân bổ", value: fmtVnd(fixedPeriod), color: "#C0552B", note: `${fmtVnd(fixedDaily)}/ngày` },
            { label: "Lợi nhuận ròng", value: fmtVnd(netProfit), color: netProfit >= 0 ? "#0F623F" : "#C0552B", note: `Biên ${netMarginPct}%` },
          ].map(k => (
            <div key={k.label} style={{ background: "#fff", borderRadius: 18, padding: 22, border: "1px solid #EAE6DC" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#8A9189", textTransform: "uppercase", letterSpacing: "0.4px" }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: k.color, marginTop: 10 }}>{k.value}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#8A9189", marginTop: 6 }}>{k.note}</div>
            </div>
          ))}
        </div>

        {/* Breakeven */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #EAE6DC", padding: 26, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#8A9189", textTransform: "uppercase" }}>Điểm hòa vốn</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#1A2420", marginTop: 6 }}>{breakevenCups} <span style={{ fontSize: 16, fontWeight: 700, color: "#8A9189" }}>ly / ngày</span></div>
              <div style={{ fontSize: 12.5, color: "#8A9189", marginTop: 6, maxWidth: 380, lineHeight: 1.5 }}>
                Cần bán tối thiểu {breakevenCups} ly/ngày để trang trải chi phí cố định ({fmtVnd(fixedDaily)}/ngày) với biên lợi nhuận gộp trung bình {fmtVnd(Math.round(avgMarginPerCup))}/ly.
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: "#1A2420", marginBottom: 8 }}>
                <span>Đang bán: {Math.round(totalCups / rangeDays)} ly/ngày (TB)</span>
                <span style={{ color: safetyColor }}>{safetyLabel}</span>
              </div>
              <div style={{ height: 14, borderRadius: 8, background: "#F0EDE5", overflow: "hidden", position: "relative" }}>
                {breakevenCups > 0 && (
                  <>
                    <div style={{ height: "100%", borderRadius: 8, background: safetyColor, width: `${Math.min(100, Math.round((totalCups / rangeDays) / (breakevenCups * 1.5) * 100))}%` }} />
                    <div style={{ position: "absolute", top: 0, left: `${Math.min(95, Math.round(breakevenCups / (breakevenCups * 1.5) * 100))}%`, width: 2, height: "100%", background: "#1A2420" }} />
                  </>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8A9189", marginTop: 4 }}>
                <span>0</span><span>Hòa vốn: {breakevenCups} ly</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart + dish ranking */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px,1fr))", gap: 20, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #EAE6DC" }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: "#1A2420", marginBottom: 20 }}>Doanh thu, giá vốn & lợi nhuận</div>
            <BarChart bars={chartBars} />
            <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 16, borderTop: "1px solid #F0EDE5", flexWrap: "wrap" }}>
              {[["#3D8B63","Doanh thu"],["#E8845C","Giá vốn"],["#F2C744","Lợi nhuận ròng"]].map(([c,l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#6B756F", fontWeight: 600 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} /> {l}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #EAE6DC" }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: "#1A2420", marginBottom: 16 }}>Xếp hạng lợi nhuận theo món</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dishRanking.length === 0 && (
                <div style={{ textAlign: "center", color: "#8A9189", padding: "24px 0", fontSize: 14 }}>Chưa có dữ liệu bán hàng</div>
              )}
              {dishRanking.map(d => (
                <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: d.contribution >= 0 ? "#F5F9F6" : "#FBF3F0" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1A2420" }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: "#8A9189", marginTop: 2 }}>{d.cups} ly · biên {d.marginPct}%</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: d.contribution >= 0 ? "#3D8B63" : "#C0552B" }}>
                    {d.contribution >= 0 ? "+" : ""}{fmtVnd(d.contribution)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fixed cost breakdown */}
        {fixedItems.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #EAE6DC" }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: "#1A2420", marginBottom: 16 }}>Chi phí cố định phân bổ mỗi ngày</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14 }}>
              {fixedItems.map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 12, color: "#8A9189", fontWeight: 700 }}>{f.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1A2420", marginTop: 4 }}>{fmtVnd(f.value)}/tháng</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(ReportsApp));
