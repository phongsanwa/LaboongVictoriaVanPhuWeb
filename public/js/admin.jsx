/* global React, ReactDOM, Icon, fmt, TIERS, TIER_ORDER, STORES, CUSTOMERS, ADMIN_CUSTOMERS_DATA, avColor, initials, fmtVND, fmtDate, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, TweakRadio, NAV_URLS, adminHref */
const { useState, useEffect, useMemo, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false,
  "density": "regular"
}/*EDITMODE-END*/;

const PAGE_SIZE = 7;

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

function TierBadge({ tier }) {
  const t = TIERS[tier];
  return <span className={"badge-tier " + t.cls}><span className="tk" />{t.label}</span>;
}

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("all");
  const [store, setStore] = useState("all");
  const [status, setStatus] = useState("all");
  // Mặc định: khách đăng ký mới nhất hiển thị trên đầu
  const [sort, setSort] = useState({ key: "joined", dir: "desc" });
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState(null);
  const [customers, setCustomers] = useState(CUSTOMERS);
  const [sideOpen, setSideOpen] = useState(false);
  const [exp, setExp] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
    r.setAttribute("data-density", tw.density);
  }, [tw.brand, tw.dark, tw.density]);

  // filtering
  const filtered = useMemo(() => {
    let rows = customers.filter(c => {
      if (tier !== "all" && c.tier !== tier) return false;
      if (store !== "all" && c.store !== store) return false;
      if (status !== "all" && c.status !== status) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        if (!c.name.toLowerCase().includes(s) && !c.phone.replace(/\s/g, "").includes(s.replace(/\s/g, "")) && !c.email.toLowerCase().includes(s)) return false;
      }
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      if (sort.key === "points") return (a.points - b.points) * dir;
      if (sort.key === "joined") return (a.joined === b.joined ? a.customerId - b.customerId : (a.joined < b.joined ? -1 : 1)) * dir;
      if (sort.key === "name") return a.name.localeCompare(b.name, "vi") * dir;
      return 0;
    });
    return rows;
  }, [q, tier, store, status, sort, customers]);

  useEffect(() => { setPage(1); }, [q, tier, store, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const start = filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PAGE_SIZE, filtered.length);

  const toggleSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });

  // export
  const doExport = (type) => {
    setExp(false);
    const head = ["Mã KH", "Tên khách hàng", "SĐT", "Email", "Điểm", "Hạng", "Cửa hàng", "Ngày tham gia", "Trạng thái"];
    const lines = filtered.map(c => [c.id, c.name, c.phone, c.email, c.points, TIERS[c.tier].label, c.store, fmtDate(c.joined), c.status === "on" ? "Active" : "Inactive"]);
    const sep = type === "csv" ? "," : "\t";
    const esc = (v) => { v = String(v); return /[",\t\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const body = [head, ...lines].map(r => r.map(esc).join(sep)).join("\n");
    const bom = "\uFEFF";
    const mime = type === "csv" ? "text/csv" : "application/vnd.ms-excel";
    const ext = type === "csv" ? "csv" : "xls";
    const blob = new Blob([bom + body], { type: mime + ";charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `khach-hang-laboong-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  };

  const stats = useMemo(() => {
    const s = ADMIN_CUSTOMERS_DATA.stats;
    return { total: s.total, active: s.active, newM: s.newThisMonth, pts: s.points };
  }, []);

  const logout = async (e) => {
    e.preventDefault();
    await apiCall("POST", "/logout");
    location.href = NAV_URLS.login;
  };

  const [toggling, setToggling] = useState(null);
  const toggleStatus = async (c) => {
    if (toggling) return;
    setToggling(c.customerId);
    const { ok, data } = await apiCall("POST", `/admin/customers/${c.customerId}/toggle`);
    setToggling(null);
    if (!ok || !data.customer) return;
    setCustomers(cs => cs.map(x => x.customerId === c.customerId ? { ...x, ...data.customer } : x));
    setSel(prev => prev?.customerId === c.customerId ? { ...prev, ...data.customer } : prev);
  };

  return (
    <div className="shell">
      {/* ---------- Sidebar ---------- */}
      <AdminSidebar activeLabel="Khách hàng" badges={{ "Khách hàng": String(CUSTOMERS.length) }} admin={ADMIN_CUSTOMERS_DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />

      {/* ---------- Main ---------- */}
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Khách hàng</div>
            <h1>Quản lý khách hàng</h1>
          </div>
          <div className="topbar-spacer" />
          <div className="searchbox">
            <Icon name="search" size={18} color="var(--ink-3)" />
            <input placeholder="Tìm tên, SĐT, email…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="icon-btn" title="Thông báo"><Icon name="bell" size={19} /><span className="dot" /></button>
        </header>

        <div className="content">
          {/* stat strip */}
          <div className="stats">
            <div className="stat"><div className="stat-ic g"><Icon name="users" size={22} /></div>
              <div><div className="lbl">Tổng khách hàng</div><div className="val tnum">{stats.total}</div><div className="chg up"><Icon name="spark" size={13} /> +3 tuần này</div></div></div>
            <div className="stat"><div className="stat-ic a"><Icon name="check" size={22} /></div>
              <div><div className="lbl">Đang hoạt động</div><div className="val tnum">{stats.active}</div><div className="chg up">{Math.round(stats.active / stats.total * 100)}% tổng số</div></div></div>
            <div className="stat"><div className="stat-ic y"><Icon name="star" size={20} /></div>
              <div><div className="lbl">Khách mới tháng này</div><div className="val tnum">{stats.newM}</div><div className="chg up"><Icon name="spark" size={13} /> Tăng trưởng tốt</div></div></div>
            <div className="stat"><div className="stat-ic p"><Icon name="coin" size={22} /></div>
              <div><div className="lbl">Điểm đã phát hành</div><div className="val tnum">{fmt(stats.pts)}</div><div className="chg up">Trên toàn hệ thống</div></div></div>
          </div>

          {/* table panel */}
          <div className="panel">
            <div className="toolbar">
              <div className="ttl">Danh sách khách hàng <span className="ct">{filtered.length}</span></div>
              <div className="tb-spacer" />

              <div className="field">
                <span className="flbl">Hạng</span>
                <select className="select" value={tier} onChange={e => setTier(e.target.value)}>
                  <option value="all">Tất cả hạng</option>
                  {TIER_ORDER.map(k => <option key={k} value={k}>{TIERS[k].label}</option>)}
                </select>
                <span className="chev"><Icon name="chevdown" size={16} /></span>
              </div>

              <div className="field">
                <span className="flbl">Cửa hàng</span>
                <select className="select" value={store} onChange={e => setStore(e.target.value)}>
                  <option value="all">Tất cả cửa hàng</option>
                  {STORES.map(s => <option key={s.id ?? s} value={s.name ?? s}>{s.name ?? s}</option>)}
                </select>
                <span className="chev"><Icon name="chevdown" size={16} /></span>
              </div>

              <div className="seg">
                <button className={status === "all" ? "on" : ""} onClick={() => setStatus("all")}>Tất cả</button>
                <button className={status === "on" ? "on ok" : ""} onClick={() => setStatus("on")}>Active</button>
                <button className={status === "off" ? "on off" : ""} onClick={() => setStatus("off")}>Inactive</button>
              </div>

              <div className="menu-wrap">
                <button className="btn primary" onClick={() => setExp(v => !v)}><Icon name="download" size={17} color="#fff" /> Export</button>
                {exp && (<>
                  <div style={{ position: "fixed", inset: 0, zIndex: 25 }} onClick={() => setExp(false)} />
                  <div className="menu">
                    <button onClick={() => doExport("xls")}><span className="mi xls"><Icon name="receipt" size={17} /></span><span>Excel (.xls)<br /><span className="sub">Mở bằng Microsoft Excel</span></span></button>
                    <button onClick={() => doExport("csv")}><span className="mi csv"><Icon name="download" size={17} /></span><span>CSV (.csv)<br /><span className="sub">Dữ liệu thô, phân tách dấu phẩy</span></span></button>
                  </div>
                </>)}
              </div>
            </div>

            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => toggleSort("name")}><span className={"th-in" + (sort.key === "name" ? " act" : "")}>Khách hàng <Icon name="sort" size={14} color={sort.key === "name" ? "var(--brand)" : "currentColor"} /></span></th>
                    <th>Số điện thoại</th>
                    <th className="sortable" onClick={() => toggleSort("points")}><span className={"th-in" + (sort.key === "points" ? " act" : "")}>Điểm <Icon name="sort" size={14} color={sort.key === "points" ? "var(--brand)" : "currentColor"} /></span></th>
                    <th>Hạng</th>
                    <th className="sortable" onClick={() => toggleSort("joined")}><span className={"th-in" + (sort.key === "joined" ? " act" : "")}>Ngày tham gia <Icon name="sort" size={14} color={sort.key === "joined" ? "var(--brand)" : "currentColor"} /></span></th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr className="empty"><td colSpan={7}>Không tìm thấy khách hàng nào khớp bộ lọc.</td></tr>
                  )}
                  {pageRows.map(c => (
                    <tr key={c.id} onClick={() => setSel(c)}>
                      <td>
                        <div className="cust">
                          <div className="cust-av" style={{ background: avColor(c.name) }}>{initials(c.name)}</div>
                          <div style={{ minWidth: 0 }}>
                            <div className="nm" title={c.name}>{c.name}</div>
                            <div className="em">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="phone">{c.phone}</span></td>
                      <td><span className="pts tnum">{fmt(c.points)}<small>điểm</small></span></td>
                      <td><TierBadge tier={c.tier} /></td>
                      <td><span className="tnum" style={{ color: "var(--ink-2)", fontWeight: 500 }}>{fmtDate(c.joined)}</span></td>
                      <td>
                        <button
                          className={"status " + c.status}
                          disabled={toggling === c.customerId}
                          title={c.status === "on" ? "Đang hoạt động — bấm để vô hiệu hoá" : "Đã vô hiệu hoá — bấm để kích hoạt"}
                          onClick={e => { e.stopPropagation(); toggleStatus(c); }}
                          style={{ cursor: "pointer", border: "none", opacity: toggling === c.customerId ? 0.5 : 1 }}
                        >
                          {c.status === "on" ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="row-act" onClick={e => { e.stopPropagation(); setSel(c); }}>Chi tiết <Icon name="chev" size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <div className="info">Hiển thị <b>{start}–{end}</b> trên <b>{filtered.length}</b> khách hàng</div>
              <div className="pg-btns">
                <button className="pg" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}><Icon name="chev" size={16} color="currentColor" /></button>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={"pg" + (p === page ? " on" : "")} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="pg" disabled={page === pages} onClick={() => setPage(p => Math.min(pages, p + 1))} style={{ transform: "scaleX(-1)" }}><Icon name="chev" size={16} color="currentColor" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Detail drawer ---------- */}
      {sel && <Drawer c={sel} onClose={() => setSel(null)} onCustomerUpdated={updated => {
        setCustomers(cs => cs.map(c => c.customerId === updated.customerId ? { ...c, ...updated } : c));
        setSel(prev => prev?.customerId === updated.customerId ? { ...prev, ...updated } : prev);
      }} onCustomerDeleted={deleted => {
        setCustomers(cs => cs.filter(c => c.customerId !== deleted.customerId));
        setSel(null);
      }} />}

      {/* ---------- Tweaks ---------- */}
      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F", "#07432A"], ["#005A36", "#003D24"], ["#3E5C8A", "#2A4063"], ["#6B4FA0", "#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
        <TweakRadio label="Mật độ bảng" value={tw.density} options={["compact", "regular", "comfy"]}
          onChange={v => setTweak("density", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
