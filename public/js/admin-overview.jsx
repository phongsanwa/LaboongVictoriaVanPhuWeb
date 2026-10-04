/* global React, ReactDOM, OPS_C, OpsHeader, useNarrowScreen */
// Tổng quan hoạt động kinh doanh
const { useState, useMemo } = React;

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
function longDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]}, ${d} tháng ${m}, ${y}`;
}
const OVDATA = window.ADMIN_OVERVIEW_DATA || { admin: {}, stores: [], today: "", kpis: {}, chart7d: [], store_compare: [] };

function fmtVnd(n) { return Math.round(n || 0).toLocaleString("vi-VN") + "đ"; }
function fmtM(n) { return (Math.round((n || 0) / 100000) / 10).toFixed(1) + " tr"; }

// Simple bar chart rendered as divs
function MiniBarChart({ days }) {
  const maxRev = Math.max(...days.map(d => d.revenue), 0.01);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180, padding: "0 4px" }}>
      {days.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
          <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4, height: "100%" }}>
            <div style={{ width: "40%", borderRadius: "6px 6px 0 0", background: d.today ? "#0F623F" : "#3D8B63", height: `${Math.round((d.revenue / maxRev) * 100)}%` }} />
            <div style={{ width: "40%", borderRadius: "6px 6px 0 0", background: "#F2C744", height: `${Math.max(2, Math.round(((d.profit || 0) / maxRev) * 100))}%` }} />
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: d.today ? "#0F623F" : "var(--ink-3)" }}>{d.date}</div>
        </div>
      ))}
    </div>
  );
}

function OverviewApp() {
  const narrow = useNarrowScreen(640);
  const [activeStore, setActiveStore] = useState("all");

  const stores = OVDATA.stores || [];
  const kpis = OVDATA.kpis || {};
  const chart7d = OVDATA.chart7d || [];
  const storeCompare = OVDATA.store_compare || [];
  const admin = OVDATA.admin || {};
  const today = OVDATA.today || new Date().toISOString().slice(0, 10);


  const storeTabs = [{ key: "all", label: "Toàn hệ thống" }, ...stores.map(s => ({ key: String(s.id), label: s.name }))];

  const activeKpis = useMemo(() => {
    if (activeStore === "all") return kpis;
    const sc = storeCompare.find(s => String(s.id) === activeStore);
    if (!sc) return kpis;
    return {
      revenue_today: sc.revenue_today,
      net_profit_today: sc.net_profit_today,
      gross_margin_pct: sc.margin_pct,
      cups_today: sc.cups_today,
      breakeven_cups: kpis.breakeven_cups,
    };
  }, [activeStore, kpis, storeCompare]);

  const kpiCards = [
    { label: "Doanh thu hôm nay", value: fmtVnd(activeKpis.revenue_today), delta: `${(activeKpis.cups_today || 0)} ly đã bán`, deltaColor: "var(--ok)" },
    { label: "Lợi nhuận ròng", value: fmtVnd(activeKpis.net_profit_today), delta: `Biên ${Math.round(activeKpis.gross_margin_pct || 0)}%`, deltaColor: (activeKpis.gross_margin_pct || 0) >= 30 ? "var(--ok)" : "var(--danger)" },
    { label: "Biên lợi nhuận gộp", value: `${Math.round(activeKpis.gross_margin_pct || 0)}%`, delta: "Hôm nay", deltaColor: "var(--ink-3)" },
    { label: "Điểm hòa vốn", value: `${kpis.breakeven_cups ? Math.ceil(kpis.breakeven_cups) : "—"} ly/ngày`, delta: `Đang bán ${activeKpis.cups_today || 0} ly`, deltaColor: (activeKpis.cups_today || 0) >= (kpis.breakeven_cups || 0) ? "var(--ok)" : "var(--danger)" },
  ];

  const todayDate = new Date(today);
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const todayLabel = dayNames[todayDate.getDay()];

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 64, background: OPS_C.bg, color: OPS_C.ink }}>
      <OpsHeader admin={admin} links={[{ href: "/admin", label: "← Trang quản trị" }]}
        center={
          <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.12)", padding: 4, borderRadius: 12, flexWrap: "wrap" }}>
            {storeTabs.map(t => (
              <div key={t.key} onClick={() => setActiveStore(t.key)} style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", background: activeStore === t.key ? "#fff" : "transparent", color: activeStore === t.key ? OPS_C.brand : "rgba(255,255,255,0.85)" }}>{t.label}</div>
            ))}
          </div>
        } />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: narrow ? "24px 16px 0" : "36px 24px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 26 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.4px" }}>{activeStore === "all" ? "Tổng quan hoạt động" : (stores.find(s => String(s.id) === activeStore) || {}).name}</div>
              <div style={{ fontSize: 14.5, color: OPS_C.ink2, marginTop: 4 }}>{longDate(today)} · {stores.length} cửa hàng đang hoạt động</div>
            </div>
            <a href="/admin/reports" style={{ fontSize: 13, fontWeight: 700, color: OPS_C.brand, textDecoration: "none", background: OPS_C.okBg, padding: "8px 14px", borderRadius: 10 }}>
              Xem báo cáo chi tiết →
            </a>
          </div>

          {/* daily entry status */}
          <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
            {stores.map(s => (
              <a key={s.id} href="/admin/daily-entries" style={{ flex: 1, minWidth: 260, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 16, background: s.is_saved_today ? "#F0F7F3" : "#FCF3E4", border: `1px solid ${s.is_saved_today ? "#D7EADF" : "#F2E1C2"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: s.is_saved_today ? "#3D8B63" : "#E0983F", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>
                    {s.is_saved_today ? "✓" : "!"}
                  </div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1A2420" }}>{s.name}</div>
                    <div style={{ fontSize: 12.5, color: s.is_saved_today ? "#3D8B63" : "#B4762A", fontWeight: 600 }}>
                      {s.is_saved_today ? `Đã nhập · ${fmtVnd(s.today_revenue)} · ${s.today_cups} ly` : "Chưa nhập doanh thu hôm nay"}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: s.is_saved_today ? "#3D8B63" : "#B4762A", background: "#fff", padding: "6px 12px", borderRadius: 20 }}>
                  {s.is_saved_today ? "Xem lại" : "Nhập ngay"}
                </div>
              </a>
            ))}
          </div>

          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 16, marginBottom: 24 }}>
            {kpiCards.map(k => (
              <div key={k.label} style={{ background: "var(--panel)", borderRadius: 18, padding: 22, border: "1px solid var(--line)" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{k.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", marginTop: 10 }}>{k.value}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: k.deltaColor, marginTop: 6 }}>{k.delta}</div>
              </div>
            ))}
          </div>

          {/* Chart + store compare */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px,1fr))", gap: 20, marginBottom: 24 }}>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800 }}>Doanh thu & lợi nhuận 7 ngày qua</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", background: "var(--brand-soft, #EAF3EE)", padding: "5px 10px", borderRadius: 8 }}>7 ngày</div>
              </div>
              <MiniBarChart days={chart7d.map(d => ({ ...d, today: d.date === todayLabel }))} />
              <div style={{ display: "flex", gap: 20, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: "#3D8B63" }} /> Doanh thu
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: "#F2C744" }} /> Lợi nhuận ròng
                </div>
              </div>
            </div>

            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800 }}>So sánh cửa hàng hôm nay</div>
              {storeCompare.map(s => (
                <div key={s.id} style={{ borderRadius: 14, padding: 16, background: s.margin_pct >= 25 ? "#F5F8F5" : "#FBF6EF" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800 }}>{s.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: s.margin_pct >= 25 ? "#3D8B63" : "#C0552B" }}>{Math.round(s.margin_pct || 0)}%</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
                    <span>Doanh thu: {fmtVnd(s.revenue_today)}</span>
                    <span>Lãi ròng: {fmtVnd(s.net_profit_today)}</span>
                  </div>
                </div>
              ))}
              {storeCompare.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--ink-3)", fontSize: 14, padding: "20px 0" }}>Chưa có dữ liệu hôm nay</div>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div style={{ marginBottom: 12, fontSize: 15.5, fontWeight: 800 }}>Truy cập nhanh</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16 }}>
            {[
              { title: "Nguyên liệu", desc: "Danh sách & đơn giá nhập", color: "#0F623F", href: "/admin/ingredients" },
              { title: "Công thức món", desc: "COGS và biên lợi nhuận", color: "#3D8B63", href: "/admin/recipes" },
              { title: "Nhập liệu hằng ngày", desc: "Ghi doanh thu & chi phí", color: "#F2C744", href: "/admin/daily-entries" },
              { title: "Báo cáo & hòa vốn", desc: "Lợi nhuận theo thời gian", color: "#E8845C", href: "/admin/reports" },
              { title: "Cài đặt cửa hàng", desc: "Thông tin quán & chi phí cố định", color: "#6B756F", href: "/admin/store-settings" },
            ].map(q => (
              <a key={q.href} href={q.href} style={{ display: "block", textDecoration: "none", background: "var(--panel)", borderRadius: 16, padding: 20, border: "1px solid var(--line)" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: q.color, marginBottom: 14 }} />
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>{q.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.4 }}>{q.desc}</div>
              </a>
            ))}
          </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(OverviewApp));
