/* global React, ReactDOM, Icon, fmt, ADMIN_POINTS_DATA, LEDGER, fmtTs, TYPE_META, avColor, initials, AdjustModal, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, TweakRadio, NAV_URLS, adminHref */
const { useState, useEffect, useMemo } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false,
  "density": "regular"
}/*EDITMODE-END*/;

const PAGE = 8;

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

function TypeBadge({ type }) {
  const m = TYPE_META[type];
  return <span className={"type-badge " + m.cls}><span className="ti"><Icon name={m.ic} size={13} color="#fff" /></span>{m.label}</span>;
}

function PointsApp() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [custs, setCusts] = useState(() => ADMIN_POINTS_DATA.customers.map(c => ({ ...c })));
  const [ledger, setLedger] = useState(() => LEDGER.slice());
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [sideOpen, setSideOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
    r.setAttribute("data-density", tw.density);
  }, [tw.brand, tw.dark, tw.density]);

  const stats = useMemo(() => {
    const remaining = custs.reduce((s, c) => s + c.points, 0);
    const redeemed = ADMIN_POINTS_DATA.stats.redeemed;
    const issued = remaining + redeemed;
    return { issued, redeemed, remaining, count: ledger.length };
  }, [custs, ledger.length]);

  const filtered = useMemo(() => {
    return ledger.filter(e => {
      if (type !== "all" && e.type !== type) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        if (!e.cust.name.toLowerCase().includes(s) && !e.cust.id.toLowerCase().includes(s) &&
            !e.desc.toLowerCase().includes(s) && !(e.reason || "").toLowerCase().includes(s) && !e.id.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [ledger, type, q]);

  useEffect(() => { setPage(1); }, [q, type]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE);
  const start = filtered.length ? (page - 1) * PAGE + 1 : 0;
  const end = Math.min(page * PAGE, filtered.length);

  const onConfirm = async ({ customerId, mode, amount, reason, note }) => {
    const { ok, data } = await apiCall("POST", "/admin/points/adjust", {
      customer_id: customerId, mode, amount, reason, note,
    });
    if (!ok) {
      setToast(data.message || "Có lỗi xảy ra, vui lòng thử lại");
      setTimeout(() => setToast(null), 3400);
      return;
    }
    setLedger(l => [{ ...data.entry, ts: new Date(data.entry.ts) }, ...l]);
    setCusts(cs => cs.map(c => c.dbId === data.customer.dbId ? { ...c, points: data.customer.points } : c));
    setAdjustOpen(false);
    setToast(data.message);
    setTimeout(() => setToast(null), 3400);
  };

  const logout = async (e) => {
    e.preventDefault();
    await apiCall("POST", "/logout");
    location.href = NAV_URLS.login;
  };

  const NAV = [
    { ic: "chart", label: "Tổng quan" },
    { ic: "users", label: "Khách hàng", badge: String(custs.length) },
    { ic: "receipt", label: "Điểm & giao dịch", on: true },
    { ic: "bag", label: "Đơn hàng" },
    { ic: "truck", label: "Phí ship" },
    { ic: "gift", label: "Đổi quà" },
    { ic: "mega", label: "Chiến dịch" },
    { ic: "cup", label: "Thực đơn" },
    { ic: "percent", label: "Khuyến mãi" },
    { ic: "plus", label: "Variant / Tuỳ chọn" },
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
            <div className="side-av">{ADMIN_POINTS_DATA.admin.initials}</div>
            <div style={{ minWidth: 0 }}><div className="un">{ADMIN_POINTS_DATA.admin.name}</div><div className="ur">{ADMIN_POINTS_DATA.admin.email}</div></div>
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: "auto" }} onClick={logout} title="Đăng xuất"><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Điểm & giao dịch</div>
            <h1>Quản lý điểm &amp; giao dịch</h1>
          </div>
          <div className="topbar-spacer" />
          <div className="searchbox">
            <Icon name="search" size={18} color="var(--ink-3)" />
            <input placeholder="Tìm khách, mã GD, lý do…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn primary" onClick={() => setAdjustOpen(true)}><Icon name="edit" size={16} color="#fff" /> Điều chỉnh điểm</button>
        </header>

        <div className="content">
          {/* stats */}
          <div className="stats">
            <div className="stat"><div className="stat-ic g"><Icon name="coin" size={22} /></div>
              <div><div className="lbl">Tổng điểm phát hành</div><div className="val tnum">{fmt(stats.issued)}</div><div className="chg up"><Icon name="spark" size={13} /> Tích luỹ toàn hệ thống</div></div></div>
            <div className="stat"><div className="stat-ic r"><Icon name="gift" size={20} /></div>
              <div><div className="lbl">Điểm đã đổi / tiêu</div><div className="val tnum">{fmt(stats.redeemed)}</div><div className="chg up">{Math.round(stats.redeemed / stats.issued * 100)}% đã sử dụng</div></div></div>
            <div className="stat"><div className="stat-ic b"><Icon name="chart" size={20} /></div>
              <div><div className="lbl">Điểm còn lại (lưu hành)</div><div className="val tnum">{fmt(stats.remaining)}</div><div className="chg up">Đang chờ quy đổi</div></div></div>
            <div className="stat"><div className="stat-ic p"><Icon name="receipt" size={20} /></div>
              <div><div className="lbl">Tổng giao dịch</div><div className="val tnum">{fmt(stats.count)}</div><div className="chg up">Tích · Tiêu · Điều chỉnh</div></div></div>
          </div>

          {/* ledger */}
          <div className="panel">
            <div className="toolbar">
              <div className="ttl">Lịch sử giao dịch điểm <span className="ct">{filtered.length}</span></div>
              <div className="tb-spacer" />
              <div className="seg">
                <button className={type === "all" ? "on" : ""} onClick={() => setType("all")}>Tất cả</button>
                <button className={type === "earn" ? "on ok" : ""} onClick={() => setType("earn")}>Tích điểm</button>
                <button className={type === "redeem" ? "on" : ""} onClick={() => setType("redeem")}>Tiêu điểm</button>
                <button className={type === "adjust" ? "on" : ""} onClick={() => setType("adjust")}>Điều chỉnh</button>
              </div>
              <button className="btn primary sm" onClick={() => setAdjustOpen(true)}><Icon name="plus" size={16} color="#fff" /> Cộng / Trừ điểm</button>
            </div>

            <div className="tbl-wrap">
              <table className="tbl tbl-ledger">
                <thead>
                  <tr>
                    <th>Mã giao dịch</th>
                    <th>Khách hàng</th>
                    <th>Loại</th>
                    <th>Chi tiết</th>
                    <th>Nguồn</th>
                    <th style={{ textAlign: "right" }}>Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr className="empty"><td colSpan={6}>Không có giao dịch nào khớp bộ lọc.</td></tr>}
                  {rows.map(e => (
                    <tr key={e.id}>
                      <td><div className="gd-id">{e.id}</div><div className="gd-time">{fmtTs(e.ts)}</div></td>
                      <td>
                        <div className="cust">
                          <div className="cust-av" style={{ background: avColor(e.cust.name), width: 34, height: 34, fontSize: 13 }}>{initials(e.cust.name)}</div>
                          <div style={{ minWidth: 0 }}><div className="nm" title={e.cust.name}>{e.cust.name}</div><div className="em">{e.cust.id}</div></div>
                        </div>
                      </td>
                      <td><TypeBadge type={e.type} /></td>
                      <td>
                        <div className="gd-desc">{e.desc}
                          {e.reason && <div className="reason-tag"><Icon name="info" size={12} /> {e.reason}{e.note ? " — " + e.note : ""}</div>}
                        </div>
                      </td>
                      <td><div className="gd-src">{e.source}{e.staff && <span className="staff">bởi {e.staff}</span>}</div></td>
                      <td style={{ textAlign: "right" }}><span className={"amt " + (e.points > 0 ? "pos" : "neg")}>{e.points > 0 ? "+" : "−"}{fmt(Math.abs(e.points))}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <div className="info">Hiển thị <b>{start}–{end}</b> trên <b>{filtered.length}</b> giao dịch</div>
              <div className="pg-btns">
                <button className="pg" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}><Icon name="chev" size={16} color="currentColor" /></button>
                {Array.from({ length: pages }, (_, i) => i + 1).slice(Math.max(0, page - 3), Math.max(0, page - 3) + 6).map(p => (
                  <button key={p} className={"pg" + (p === page ? " on" : "")} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="pg" disabled={page === pages} onClick={() => setPage(p => Math.min(pages, p + 1))} style={{ transform: "scaleX(-1)" }}><Icon name="chev" size={16} color="currentColor" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {adjustOpen && <AdjustModal customers={custs} onClose={() => setAdjustOpen(false)} onConfirm={onConfirm} />}

      {toast && <div className="toast"><span className="tc"><Icon name="check" size={15} color="#fff" /></span>{toast}</div>}

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F", "#07432A"], ["#005A36", "#003D24"], ["#3E5C8A", "#2A4063"], ["#6B4FA0", "#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
        <TweakRadio label="Mật độ bảng" value={tw.density} options={["compact", "regular", "comfy"]} onChange={v => setTweak("density", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PointsApp />);
