/* global React, ReactDOM, Icon, fmt, REWARDS, REWARD_CATS, expStatus, RewardEditor, ConfirmDelete, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, ADMIN_REWARDS_DATA, NAV_URLS, adminHref */
const { useState, useEffect, useMemo } = React;

const RW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const TODAY = new Date().toISOString().slice(0, 10);

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


function fmtExpiry(iso) { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }

function RewardCard({ r, onEdit, onToggle, onDup, onDelete }) {
  const cat = REWARD_CATS[r.cat];
  const remaining = Math.max(0, r.qty - r.redeemed);
  const usedPct = Math.round((r.used / r.qty) * 100);
  const pendingPct = Math.round(((r.redeemed - r.used) / r.qty) * 100);
  const es = expStatus(r.expiry, TODAY);
  const expCls = es === "expired" ? "expired" : es === "soon" ? "soon" : "";

  return (
    <div className={"rw-card" + (r.status === "off" ? " inactive" : "")}>
      <div className="rw-thumb" style={{ background: r.img ? `url(${r.img}) center/cover` : r.grad }}>
        {!r.img && <span className="ti"><Icon name={cat.ic} size={46} color="#fff" /></span>}
        <span className="rw-cat"><Icon name={cat.ic} size={12} color="#fff" /> {cat.label}</span>
        <span className={"rw-status " + (r.status === "on" ? "on" : "off")}>{r.status === "on" ? "Active" : "Inactive"}</span>
      </div>

      <div className="rw-body">
        <div className="rw-name">{r.name}</div>
        <div className="rw-meta">
          <span className="rw-pts"><Icon name="coin" size={16} /> {fmt(r.points)} <span className="u">điểm</span></span>
          <span className={"rw-exp " + expCls}>
            <Icon name={es === "expired" ? "alert" : "clock"} size={13} />
            {es === "expired" ? "Hết hạn" : "HSD " + fmtExpiry(r.expiry)}
          </span>
        </div>
      </div>

      <div className="rw-track">
        <div className="rw-bar">
          <div className="seg-used" style={{ width: usedPct + "%" }} />
          <div className="seg-pending" style={{ width: pendingPct + "%" }} />
        </div>
        <div className="rw-legend">
          <span className="rw-lg"><span className="k used" /> Đã dùng <b>{fmt(r.used)}</b></span>
          <span className="rw-lg"><span className="k pending" /> Đã đổi <b>{fmt(r.redeemed)}</b></span>
          <span className="rw-lg"><span className="k left" /> Còn lại <b>{fmt(remaining)}</b></span>
        </div>
      </div>

      <div className="rw-actions">
        <button className="rw-btn primary" onClick={() => onEdit(r)}><Icon name="edit" size={14} /> Sửa</button>
        <button className="rw-btn" onClick={() => onToggle(r)} title={r.status === "on" ? "Ẩn (Inactive)" : "Kích hoạt (Active)"}>
          <Icon name={r.status === "on" ? "eyeoff" : "eye"} size={15} />
        </button>
        <button className="rw-btn rw-icon-btn" onClick={() => onDup(r)} title="Nhân bản"><Icon name="copy" size={15} /></button>
        <button className="rw-btn rw-icon-btn danger" onClick={() => onDelete(r)} title="Xoá"><Icon name="trash" size={15} /></button>
      </div>
    </div>
  );
}

function RewardsApp() {
  const [tw, setTweak] = useTweaks(RW_DEFAULTS);
  const [items, setItems] = useState(() => REWARDS.map(r => ({ ...r })));
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [sideOpen, setSideOpen] = useState(false);
  const [editor, setEditor] = useState(null); // {mode, reward}
  const [delTarget, setDelTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const stats = useMemo(() => {
    const active = items.filter(i => i.status === "on").length;
    const redeemed = items.reduce((s, i) => s + i.redeemed, 0);
    const used = items.reduce((s, i) => s + i.used, 0);
    const remaining = items.reduce((s, i) => s + Math.max(0, i.qty - i.redeemed), 0);
    return { total: items.length, active, redeemed, used, remaining };
  }, [items]);

  const filtered = useMemo(() => items.filter(i => {
    if (cat !== "all" && i.cat !== cat) return false;
    if (status !== "all" && i.status !== status) return false;
    if (q.trim() && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [items, cat, status, q]);

  const onSave = async (data) => {
    const payload = {
      name: data.name, cat: data.cat, points: data.points, qty: data.qty,
      expiry: data.expiry, status: data.status, grad: data.grad, img: data.img,
    };
    if (data.dbId) {
      const { ok, data: res } = await apiCall("PUT", `/admin/rewards/${data.dbId}`, payload);
      if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
      setItems(list => list.map(i => i.dbId === data.dbId ? res.reward : i));
      flash(`Đã cập nhật "${data.name}"`);
    } else {
      const { ok, data: res } = await apiCall("POST", "/admin/rewards", payload);
      if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
      setItems(list => [res.reward, ...list]);
      flash(`Đã tạo phần thưởng "${data.name}"`);
    }
    setEditor(null);
  };
  const onToggle = async (r) => {
    const { ok, data: res } = await apiCall("POST", `/admin/rewards/${r.dbId}/toggle`);
    if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
    setItems(list => list.map(i => i.dbId === r.dbId ? res.reward : i));
    flash(`"${r.name}" → ${r.status === "on" ? "Inactive" : "Active"}`);
  };
  const onDup = async (r) => {
    const { ok, data: res } = await apiCall("POST", `/admin/rewards/${r.dbId}/duplicate`);
    if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
    setItems(list => [res.reward, ...list]);
    flash(`Đã nhân bản "${r.name}"`);
  };
  const doDelete = async () => {
    const { ok, data: res } = await apiCall("DELETE", `/admin/rewards/${delTarget.dbId}`);
    if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); setDelTarget(null); return; }
    setItems(list => list.filter(i => i.dbId !== delTarget.dbId));
    flash(`Đã xoá "${delTarget.name}"`);
    setDelTarget(null);
  };

  const logout = async (e) => {
    e.preventDefault();
    await apiCall("POST", "/logout");
    location.href = NAV_URLS.login;
  };

  const NAV = [
    { ic: "chart", label: "Tổng quan" },
    { ic: "users", label: "Khách hàng" },
    { ic: "receipt", label: "Điểm & giao dịch" },
    { ic: "gift", label: "Đổi quà", on: true, badge: String(items.length) },
    { ic: "mega", label: "Chiến dịch" },
    { ic: "pin", label: "Cửa hàng" },
    { ic: "shield", label: "Phân quyền" },
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
          {NAV.map(n => (
            <a key={n.label} className={"side-link" + (n.on ? " on" : "")} href={adminHref(n.label)}>
              <Icon name={n.ic} size={19} /> {n.label}{n.badge && <span className="badge">{n.badge}</span>}
            </a>
          ))}
        </nav>
        <div className="side-sec">Hệ thống</div>
        <nav className="side-nav">
          <a className="side-link" href={NAV_URLS.adminSettings}><Icon name="gear" size={19} /> Cài đặt</a>
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="side-av">{ADMIN_REWARDS_DATA.admin.initials}</div>
            <div style={{ minWidth: 0 }}><div className="un">{ADMIN_REWARDS_DATA.admin.name}</div><div className="ur">{ADMIN_REWARDS_DATA.admin.email}</div></div>
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: "auto" }} onClick={logout} title="Đăng xuất"><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Đổi quà</div>
            <h1>Voucher &amp; quà tặng</h1>
          </div>
          <div className="topbar-spacer" />
          <div className="searchbox">
            <Icon name="search" size={18} color="var(--ink-3)" />
            <input placeholder="Tìm phần thưởng…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn primary" onClick={() => setEditor({ reward: null })}><Icon name="plus" size={16} color="#fff" /> Tạo phần thưởng</button>
        </header>

        <div className="content">
          <div className="stats">
            <div className="stat"><div className="stat-ic g"><Icon name="ticket" size={21} /></div>
              <div><div className="lbl">Tổng phần thưởng</div><div className="val tnum">{stats.total}</div><div className="chg up">{stats.active} đang hoạt động</div></div></div>
            <div className="stat"><div className="stat-ic y"><Icon name="gift" size={20} /></div>
              <div><div className="lbl">Lượt đã đổi</div><div className="val tnum">{fmt(stats.redeemed)}</div><div className="chg up">Trên toàn danh mục</div></div></div>
            <div className="stat"><div className="stat-ic a"><Icon name="check" size={21} /></div>
              <div><div className="lbl">Đã sử dụng</div><div className="val tnum">{fmt(stats.used)}</div><div className="chg up">{Math.round(stats.used / stats.redeemed * 100)}% lượt đổi</div></div></div>
            <div className="stat"><div className="stat-ic b"><Icon name="box" size={20} /></div>
              <div><div className="lbl">Còn lại trong kho</div><div className="val tnum">{fmt(stats.remaining)}</div><div className="chg up">Sẵn sàng phát hành</div></div></div>
          </div>

          {/* filters */}
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="toolbar" style={{ borderBottom: "none" }}>
              <div className="ttl">Danh mục phần thưởng <span className="ct">{filtered.length}</span></div>
              <div className="tb-spacer" />
              <div className="field">
                <span className="flbl">Loại</span>
                <select className="select" value={cat} onChange={e => setCat(e.target.value)}>
                  <option value="all">Tất cả loại</option>
                  {Object.entries(REWARD_CATS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                </select>
                <span className="chev"><Icon name="chevdown" size={16} /></span>
              </div>
              <div className="seg">
                <button className={status === "all" ? "on" : ""} onClick={() => setStatus("all")}>Tất cả</button>
                <button className={status === "on" ? "on ok" : ""} onClick={() => setStatus("on")}>Active</button>
                <button className={status === "off" ? "on off" : ""} onClick={() => setStatus("off")}>Inactive</button>
              </div>
            </div>
          </div>

          {/* grid */}
          <div className="rw-grid">
            <button className="rw-add" onClick={() => setEditor({ reward: null })}>
              <span className="plus-c"><Icon name="plus" size={26} color="currentColor" /></span>
              Tạo phần thưởng mới
            </button>
            {filtered.map(r => (
              <RewardCard key={r.id} r={r}
                onEdit={(x) => setEditor({ reward: x })}
                onToggle={onToggle} onDup={onDup} onDelete={(x) => setDelTarget(x)} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--ink-3)", fontWeight: 500 }}>
              Không có phần thưởng nào khớp bộ lọc.
            </div>
          )}
        </div>
      </div>

      {editor && <RewardEditor initial={editor.reward} onClose={() => setEditor(null)} onSave={onSave} />}
      {delTarget && <ConfirmDelete name={delTarget.name} onClose={() => setDelTarget(null)} onConfirm={doDelete} />}
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

ReactDOM.createRoot(document.getElementById("root")).render(<RewardsApp />);
