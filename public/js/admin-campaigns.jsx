/* global React, ReactDOM, Icon, fmt, CAMPAIGNS, CAMP_TYPES, AUDIENCES, CAMP_STATUS, CAMP_REWARDS, CampaignWizard, PushComposer, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, ADMIN_CAMPAIGNS_DATA, NAV_URLS, adminHref */
const { useState, useEffect, useMemo } = React;

const CM_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

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

function fmtD(iso) { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }

function CampaignRow({ c, onEdit, onPush, onToggle }) {
  const t = CAMP_TYPES[c.type];
  const aud = AUDIENCES[c.audience];
  const st = CAMP_STATUS[c.status];
  const convRate = c.opened ? Math.round((c.converted / c.opened) * 100) : 0;

  return (
    <div className="camp-row">
      <div className="camp-ic" style={{ background: t.grad }}><span className="ti"><Icon name={t.ic} size={24} color="#fff" /></span></div>

      <div className="camp-main">
        <div className="camp-name">{c.name}</div>
        <div className="camp-cond">{c.condition}</div>
        <div className="camp-tags">
          <span className="ctag type" style={{ background: t.color }}><Icon name={t.ic} size={11} color="#fff" /> {t.short}{c.type === "discount" && c.value ? ` ${c.value}%` : c.type === "x2" && c.value && c.value !== 2 ? ` ×${c.value}` : c.type === "birthday" && c.bonus_points ? ` +${fmt(c.bonus_points)}đ` : ""}</span>
          <span className="ctag"><Icon name={aud.ic} size={11} /> {aud.label}</span>
          {c.pushSent && <span className="ctag push"><Icon name="bellpush" size={11} /> Đã gửi push</span>}
        </div>
      </div>

      <div className="camp-when">
        <div className="lbl">Thời gian</div>
        <div className="dt"><Icon name="calrange" size={14} color="var(--ink-3)" /> {fmtD(c.start)}</div>
        <div className="dt camp-end" style={{ marginTop: 4, color: "var(--ink-2)" }}>→ {fmtD(c.end)}</div>
      </div>

      <div className="camp-metrics">
        <div className="cmetric"><div className="mv tnum">{fmt(c.reach)}</div><div className="ml">Tiếp cận</div></div>
        <div className="cmetric"><div className="mv tnum">{fmt(c.opened)}</div><div className="ml">Lượt mở</div></div>
        <div className="cmetric"><div className="mv accent tnum">{fmt(c.converted)}</div><div className="ml">Chuyển đổi {convRate ? `· ${convRate}%` : ""}</div></div>
      </div>

      <div className="camp-actions">
        <span className={"cstat " + st.cls}>{st.label}</span>
        <button className="cact push" onClick={() => onPush(c)} disabled={c.status === "ended"} title="Gửi push notification"><Icon name="bellpush" size={16} /></button>
        <button className="cact" onClick={() => onToggle(c)} title={c.status === "running" ? "Tạm dừng" : "Kích hoạt"}>
          <Icon name={c.status === "running" ? "pause" : "play"} size={15} />
        </button>
        <button className="cact" onClick={() => onEdit(c)} title="Chỉnh sửa"><Icon name="edit" size={15} /></button>
      </div>
    </div>
  );
}

function CampaignsApp() {
  const [tw, setTweak] = useTweaks(CM_DEFAULTS);
  const [items, setItems] = useState(() => CAMPAIGNS.map(c => ({ ...c })));
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [sideOpen, setSideOpen] = useState(false);
  const [wizard, setWizard] = useState(null);
  const [push, setPush] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const stats = useMemo(() => {
    const running = items.filter(i => i.status === "running").length;
    const scheduled = items.filter(i => i.status === "scheduled").length;
    const reach = items.filter(i => i.status === "running").reduce((s, i) => s + i.reach, 0);
    const converted = items.reduce((s, i) => s + i.converted, 0);
    return { running, scheduled, reach, converted };
  }, [items]);

  const filtered = useMemo(() => items.filter(i => {
    if (type !== "all" && i.type !== type) return false;
    if (status !== "all" && i.status !== status) return false;
    if (q.trim() && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [items, type, status, q]);

  const onSave = async (data) => {
    const payload = {
      name: data.name, type: data.type, value: data.value ?? null,
      start: data.start, end: data.end, condition: data.condition, audience: data.audience,
    };
    if (data.dbId) {
      const { ok, data: res } = await apiCall("PUT", `/admin/campaigns/${data.dbId}`, payload);
      if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
      setItems(list => list.map(i => i.dbId === data.dbId ? res.campaign : i));
      flash(`Đã cập nhật "${data.name}"`);
    } else {
      const { ok, data: res } = await apiCall("POST", "/admin/campaigns", payload);
      if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
      setItems(list => [res.campaign, ...list]);
      flash(`Đã tạo chiến dịch "${data.name}" (${res.campaign.status === "scheduled" ? "đã lên lịch" : "đang chạy"})`);
    }
    setWizard(null);
  };
  const onToggle = async (c) => {
    const { ok, data: res } = await apiCall("POST", `/admin/campaigns/${c.dbId}/toggle`);
    if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
    setItems(list => list.map(i => i.dbId === c.dbId ? res.campaign : i));
    if (c.status === "ended" || c.status === "draft") {
      flash(`"${c.name}" đã được kích hoạt`);
    } else {
      flash(`"${c.name}" → ${res.campaign.status === "running" ? "Đang chạy" : "Tạm dừng"}`);
    }
  };
  const onSend = async (title, count) => {
    const { ok, data: res } = await apiCall("POST", `/admin/campaigns/${push.dbId}/push`);
    if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
    setItems(list => list.map(i => i.dbId === push.dbId ? res.campaign : i));
    flash(`Đã gửi thông báo "${title}" tới ${fmt(count)} người`);
    setPush(null);
  };

  const logout = async (e) => {
    e.preventDefault();
    await apiCall("POST", "/logout");
    location.href = NAV_URLS.login;
  };

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Chiến dịch" badges={{ "Chiến dịch": String(items.length) }} admin={ADMIN_CAMPAIGNS_DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Chiến dịch</div>
            <h1>Campaign &amp; Promotion</h1>
          </div>
          <div className="topbar-spacer" />
          <div className="searchbox">
            <Icon name="search" size={18} color="var(--ink-3)" />
            <input placeholder="Tìm chiến dịch…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn primary" onClick={() => setWizard({ camp: null })}><Icon name="rocket" size={16} color="#fff" /> Tạo chiến dịch</button>
        </header>

        <div className="content">
          <div className="stats">
            <div className="stat"><div className="stat-ic a"><Icon name="play" size={20} /></div>
              <div><div className="lbl">Đang chạy</div><div className="val tnum">{stats.running}</div><div className="chg up">Chiến dịch hoạt động</div></div></div>
            <div className="stat"><div className="stat-ic b"><Icon name="calrange" size={20} /></div>
              <div><div className="lbl">Đã lên lịch</div><div className="val tnum">{stats.scheduled}</div><div className="chg up">Sắp khởi chạy</div></div></div>
            <div className="stat"><div className="stat-ic g"><Icon name="target" size={21} /></div>
              <div><div className="lbl">Tiếp cận (đang chạy)</div><div className="val tnum">{fmt(stats.reach)}</div><div className="chg up">Lượt tiếp cận</div></div></div>
            <div className="stat"><div className="stat-ic y"><Icon name="sparkle2" size={20} /></div>
              <div><div className="lbl">Tổng chuyển đổi</div><div className="val tnum">{fmt(stats.converted)}</div><div className="chg up">Đơn từ chiến dịch</div></div></div>
          </div>

          <div className="panel">
            <div className="toolbar">
              <div className="ttl">Danh sách chiến dịch <span className="ct">{filtered.length}</span></div>
              <div className="tb-spacer" />
              <div className="field">
                <span className="flbl">Loại</span>
                <select className="select" value={type} onChange={e => setType(e.target.value)}>
                  <option value="all">Tất cả loại</option>
                  {Object.entries(CAMP_TYPES).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                </select>
                <span className="chev"><Icon name="chevdown" size={16} /></span>
              </div>
              <div className="seg">
                <button className={status === "all" ? "on" : ""} onClick={() => setStatus("all")}>Tất cả</button>
                <button className={status === "running" ? "on ok" : ""} onClick={() => setStatus("running")}>Đang chạy</button>
                <button className={status === "scheduled" ? "on" : ""} onClick={() => setStatus("scheduled")}>Lên lịch</button>
                <button className={status === "ended" ? "on off" : ""} onClick={() => setStatus("ended")}>Kết thúc</button>
              </div>
            </div>

            <div className="camp-list">
              {filtered.length === 0 && <div style={{ textAlign: "center", padding: 48, color: "var(--ink-3)", fontWeight: 500 }}>Không có chiến dịch nào khớp bộ lọc.</div>}
              {filtered.map(c => (
                <CampaignRow key={c.id} c={c} onEdit={(x) => setWizard({ camp: x })} onPush={(x) => setPush(x)} onToggle={onToggle} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {wizard && <CampaignWizard initial={wizard.camp} onClose={() => setWizard(null)} onSave={onSave} />}
      {push && <PushComposer campaign={push} onClose={() => setPush(null)} onSend={onSend} />}
      {toast && <div className="toast"><span className="tc"><Icon name="check" size={15} color="#fff" /></span>{toast}</div>}

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

ReactDOM.createRoot(document.getElementById("root")).render(<CampaignsApp />);
