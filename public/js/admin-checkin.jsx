/* global React, ReactDOM, Icon, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, AdminSidebar */
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
    <div className="shell">
      <AdminSidebar activeLabel="Điểm danh" badges={{}} admin={ADMIN} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Điểm danh</div>
            <h1>Điểm danh hàng ngày</h1>
          </div>
          <div className="topbar-spacer" />
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? "Đang lưu…" : saved ? <><Icon name="check" size={16} color="#fff" /> Đã lưu</> : <><Icon name="gear" size={16} color="#fff" /> Lưu cài đặt</>}
          </button>
        </header>

        <div className="content">
          {/* Stats */}
          <div className="stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="stat">
              <div className="stat-ic g"><Icon name="cal" size={20} /></div>
              <div>
                <div className="lbl">Điểm danh hôm nay</div>
                <div className="val tnum">{fmt(stats.today ?? 0)}</div>
                <div className="chg up">lượt</div>
              </div>
            </div>
            <div className="stat">
              <div className="stat-ic a"><Icon name="spark" size={20} /></div>
              <div>
                <div className="lbl">Tổng lượt điểm danh</div>
                <div className="val tnum">{fmt(stats.total ?? 0)}</div>
                <div className="chg up">tất cả thời gian</div>
              </div>
            </div>
            <div className="stat">
              <div className="stat-ic y"><Icon name="gift" size={20} /></div>
              <div>
                <div className="lbl">Chuỗi 7 ngày hoàn thành</div>
                <div className="val tnum">{fmt(stats.streak7 ?? 0)}</div>
                <div className="chg up">lượt hoàn thành</div>
              </div>
            </div>
          </div>

          {/* Config editor */}
          <div className="panel" style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 17, marginBottom: 4 }}>Cấu hình điểm thưởng</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)" }}>Thay đổi số điểm thưởng cho từng ngày trong chuỗi 7 ngày điểm danh. Ngày 7 là ngày thưởng đặc biệt.</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 14 }}>
              {days.map((day, i) => (
                <div key={i} style={{
                  background: "var(--bg)",
                  borderRadius: 14,
                  padding: "16px 12px",
                  textAlign: "center",
                  border: day.bonus ? "2px solid var(--brand)" : "1px solid var(--line-2)",
                  position: "relative",
                }}>
                  {day.bonus && (
                    <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "var(--brand)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
                      Thưởng đặc biệt
                    </div>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 700, color: day.bonus ? "var(--brand)" : "var(--ink-3)", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".04em" }}>
                    {day.d}
                  </div>
                  <input
                    type="number" min={1} max={500} value={day.pts}
                    onChange={e => setDays(ds => ds.map((d, j) => j === i ? { ...d, pts: Math.max(1, parseInt(e.target.value) || 1) } : d))}
                    style={{ width: 72, textAlign: "center", fontWeight: 800, fontSize: 22, border: "1.5px solid var(--line)", borderRadius: 8, padding: "8px 4px", background: "var(--panel)", color: "var(--ink)", fontFamily: "var(--display)", outline: "none" }}
                    onFocus={e => e.target.style.borderColor = "var(--brand)"}
                    onBlur={e => e.target.style.borderColor = "var(--line)"}
                  />
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8, fontWeight: 600 }}>điểm</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, padding: "12px 16px", background: "var(--brand-soft)", borderRadius: 10, fontSize: 13, color: "var(--brand-ink)", display: "flex", gap: 9, alignItems: "flex-start" }}>
              <Icon name="info" size={17} color="var(--brand)" />
              <span>Chuỗi điểm danh reset về Ngày 1 nếu khách hàng bỏ lỡ một ngày. Sau khi hoàn thành 7 ngày, chuỗi sẽ tự động bắt đầu lại từ đầu.</span>
            </div>
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
