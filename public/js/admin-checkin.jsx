/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, AdminSidebar, NAV_URLS */
const { useState, useEffect } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{ "brand": ["#0F623F", "#07432A"], "dark": false }/*EDITMODE-END*/;

const DATA = window.ADMIN_CHECKIN_DATA || { days: [], stats: { today: 0, total: 0, streak7: 0 } };
const ADMIN = window.ADMIN_USER || {};

function csrfToken() {
  const m = document.querySelector('meta[name="csrf-token"]'); return m ? m.content : "";
}

function AdminCheckin() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [sideOpen, setSideOpen] = useState(false);
  const [days, setDays] = useState(DATA.days.length === 7 ? DATA.days.map(d => ({ ...d })) : [
    { d: "Ngày 1", pts: 5 }, { d: "Ngày 2", pts: 5 }, { d: "Ngày 3", pts: 10 },
    { d: "Ngày 4", pts: 10 }, { d: "Ngày 5", pts: 15 }, { d: "Ngày 6", pts: 15 },
    { d: "Ngày 7", pts: 50, bonus: true },
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch("/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-TOKEN": csrfToken() },
        body: JSON.stringify({ days }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    } catch (e) {}
    setSaving(false);
  };

  const stats = DATA.stats || {};

  return (
    <div className="adm-wrap">
      <AdminSidebar activeLabel="Điểm danh" badges={{}} admin={ADMIN} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="adm-main">
        <div className="adm-topbar">
          <button className="adm-burger" onClick={() => setSideOpen(true)}><Icon name="menu" size={22} /></button>
          <div className="adm-page-title">
            <h1>Điểm danh hàng ngày</h1>
            <p>Cài đặt điểm thưởng cho từng ngày điểm danh trong chuỗi 7 ngày</p>
          </div>
        </div>

        {/* Stats */}
        <div className="adm-stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          <div className="adm-stat-card">
            <div className="asc-val">{stats.today ?? 0}</div>
            <div className="asc-lbl">Điểm danh hôm nay</div>
          </div>
          <div className="adm-stat-card">
            <div className="asc-val">{stats.total ?? 0}</div>
            <div className="asc-lbl">Tổng lượt điểm danh</div>
          </div>
          <div className="adm-stat-card">
            <div className="asc-val">{stats.streak7 ?? 0}</div>
            <div className="asc-lbl">Chuỗi 7 ngày hoàn thành</div>
          </div>
        </div>

        {/* Config editor */}
        <div className="adm-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>Cấu hình điểm thưởng</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)" }}>Thay đổi số điểm thưởng cho từng ngày trong chuỗi 7 ngày điểm danh.</p>
            </div>
            <button className="adm-btn primary" onClick={save} disabled={saving} style={{ flexShrink: 0 }}>
              {saving ? "Đang lưu…" : saved ? <><Icon name="check" size={16} color="#fff" /> Đã lưu</> : "Lưu cài đặt"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 14 }}>
            {days.map((day, i) => (
              <div key={i} style={{ background: "var(--bg-2)", borderRadius: 14, padding: "14px 10px", textAlign: "center", border: day.bonus ? "1.5px solid var(--brand)" : "1px solid var(--line)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {day.d} {day.bonus && <span style={{ color: "var(--brand)" }}>★</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <input
                    type="number" min={1} max={500} value={day.pts}
                    onChange={e => setDays(ds => ds.map((d, j) => j === i ? { ...d, pts: Math.max(1, parseInt(e.target.value) || 1) } : d))}
                    style={{ width: 64, textAlign: "center", fontWeight: 800, fontSize: 20, border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 4px", background: "var(--card)", color: "var(--ink)", fontFamily: "var(--display)" }}
                  />
                  <span style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>đ</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>điểm</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F","#07432A"],["#005A36","#003D24"],["#7A4A28","#56331A"],["#6B4FA0","#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AdminCheckin />);
