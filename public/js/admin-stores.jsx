/* global React, ReactDOM, Icon, fmt, StoreEditor, ConfirmDeleteStore, STORE_DAYS, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, NAV_URLS, adminHref */
const { useState, useEffect, useMemo } = React;

const ST_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const ADMIN_STORES_DATA = window.ADMIN_STORES_DATA || { admin: null, stores: [] };

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

function fmtDays(days) {
  if (days.length === 7) return "Cả tuần";
  if (days.length === 0) return "Chưa đặt";
  return days.map(i => STORE_DAYS[i].replace("Thứ ", "T").replace("Chủ nhật", "CN")).join(", ");
}

function StoresApp() {
  const [tw, setTweak] = useTweaks(ST_DEFAULTS);
  const [items, setItems] = useState(() => ADMIN_STORES_DATA.stores.map(s => ({ ...s })));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sideOpen, setSideOpen] = useState(false);
  const [editor, setEditor] = useState(null); // {store}
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
    const active = items.filter(i => i.status === "active").length;
    const cities = new Set(items.map(i => i.city)).size;
    const staff = items.reduce((s, i) => s + i.staffCount, 0);
    const customers = items.reduce((s, i) => s + i.customerCount, 0);
    return { total: items.length, active, cities, staff, customers };
  }, [items]);

  const filtered = useMemo(() => items.filter(i => {
    if (status !== "all" && i.status !== status) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      if (!i.name.toLowerCase().includes(needle) && !i.address.toLowerCase().includes(needle) && !i.city.toLowerCase().includes(needle)) return false;
    }
    return true;
  }), [items, status, q]);

  const onSave = async (data) => {
    const payload = {
      name: data.name, address: data.address, city: data.city, phone: data.phone, email: data.email,
      latitude: data.latitude, longitude: data.longitude,
      opening_time: data.opening_time, closing_time: data.closing_time,
      operating_days: data.operating_days, status: data.status,
    };
    if (data.id) {
      const { ok, data: res } = await apiCall("PUT", `/admin/stores/${data.id}`, payload);
      if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
      setItems(list => list.map(i => i.id === data.id ? res.store : i));
      flash(`Đã cập nhật "${data.name}"`);
    } else {
      const { ok, data: res } = await apiCall("POST", "/admin/stores", payload);
      if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
      setItems(list => [...list, res.store]);
      flash(`Đã thêm cửa hàng "${data.name}"`);
    }
    setEditor(null);
  };

  const onToggle = async (s) => {
    const { ok, data: res } = await apiCall("POST", `/admin/stores/${s.id}/toggle`);
    if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
    setItems(list => list.map(i => i.id === s.id ? res.store : i));
    flash(`"${s.name}" → ${s.status === "active" ? "Inactive" : "Active"}`);
  };

  const doDelete = async () => {
    const { ok, data: res } = await apiCall("DELETE", `/admin/stores/${delTarget.id}`);
    if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại"); setDelTarget(null); return; }
    setItems(list => list.filter(i => i.id !== delTarget.id));
    flash(`Đã xoá "${delTarget.name}"`);
    setDelTarget(null);
  };

  const logout = async (e) => {
    e.preventDefault();
    await apiCall("POST", "/logout");
    location.href = NAV_URLS.login;
  };

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Cửa hàng" badges={{ "Cửa hàng": String(items.length) }} admin={ADMIN_STORES_DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Cửa hàng</div>
            <h1>Cửa hàng</h1>
          </div>
          <div className="topbar-spacer" />
          <div className="searchbox">
            <Icon name="search" size={18} color="var(--ink-3)" />
            <input placeholder="Tìm cửa hàng…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn primary" onClick={() => setEditor({ store: null })}><Icon name="plus" size={16} color="#fff" /> Thêm cửa hàng</button>
        </header>

        <div className="content">
          <div className="stats">
            <div className="stat"><div className="stat-ic g"><Icon name="pin" size={20} /></div>
              <div><div className="lbl">Tổng cửa hàng</div><div className="val tnum">{stats.total}</div><div className="chg up">{stats.active} đang hoạt động</div></div></div>
            <div className="stat"><div className="stat-ic y"><Icon name="home" size={20} /></div>
              <div><div className="lbl">Thành phố</div><div className="val tnum">{stats.cities}</div><div className="chg up">Khu vực phục vụ</div></div></div>
            <div className="stat"><div className="stat-ic a"><Icon name="users" size={20} /></div>
              <div><div className="lbl">Nhân sự</div><div className="val tnum">{fmt(stats.staff)}</div><div className="chg up">Trên toàn hệ thống</div></div></div>
            <div className="stat"><div className="stat-ic b"><Icon name="user" size={20} /></div>
              <div><div className="lbl">Khách hàng gắn cửa hàng</div><div className="val tnum">{fmt(stats.customers)}</div><div className="chg up">Cửa hàng yêu thích</div></div></div>
          </div>

          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="toolbar">
              <div className="ttl">Danh sách cửa hàng <span className="ct">{filtered.length}</span></div>
              <div className="tb-spacer" />
              <div className="seg">
                <button className={status === "all" ? "on" : ""} onClick={() => setStatus("all")}>Tất cả</button>
                <button className={status === "active" ? "on ok" : ""} onClick={() => setStatus("active")}>Active</button>
                <button className={status === "inactive" ? "on off" : ""} onClick={() => setStatus("inactive")}>Inactive</button>
              </div>
            </div>

            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Cửa hàng</th>
                    <th>Liên hệ</th>
                    <th>Giờ mở cửa</th>
                    <th>Nhân sự</th>
                    <th>Khách hàng</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr className="empty"><td colSpan={7}>Không tìm thấy cửa hàng nào khớp bộ lọc.</td></tr>
                  )}
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="cust">
                          <div className="cust-av" style={{ background: "var(--brand)" }}><Icon name="pin" size={17} color="#fff" /></div>
                          <div style={{ minWidth: 0 }}>
                            <div className="nm" title={s.name}>{s.name}</div>
                            <div className="em" title={s.address}>{s.address}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{s.phone}</div>
                        {s.email && <div className="em">{s.email}</div>}
                      </td>
                      <td>{s.opening_time} – {s.closing_time}<div className="em">{fmtDays(s.operating_days)}</div></td>
                      <td>{fmt(s.staffCount)}</td>
                      <td>{fmt(s.customerCount)}</td>
                      <td><span className={"status " + (s.status === "active" ? "on" : "off")}>{s.status === "active" ? "Active" : "Inactive"}</span></td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button className="rw-btn" onClick={() => setEditor({ store: s })} title="Chỉnh sửa"><Icon name="edit" size={15} /></button>
                          <button className="rw-btn" onClick={() => onToggle(s)} title={s.status === "active" ? "Ẩn (Inactive)" : "Kích hoạt (Active)"}>
                            <Icon name={s.status === "active" ? "eyeoff" : "eye"} size={15} />
                          </button>
                          <button className="rw-btn rw-icon-btn danger" onClick={() => setDelTarget(s)} title="Xoá"><Icon name="trash" size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {editor && <StoreEditor initial={editor.store} onClose={() => setEditor(null)} onSave={onSave} />}
      {delTarget && <ConfirmDeleteStore name={delTarget.name} onClose={() => setDelTarget(null)} onConfirm={doDelete} />}
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

ReactDOM.createRoot(document.getElementById("root")).render(<StoresApp />);
