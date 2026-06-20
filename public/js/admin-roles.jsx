/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, NAV_URLS, adminHref */
const { useState, useEffect, useMemo } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const DATA = window.ADMIN_ROLES_DATA || {
  admin: { name: "Quản trị viên", email: "", initials: "QT" },
  roles: {
    cashier: { key: "cashier", label: "Thu ngân", ic: "scan", grad: "linear-gradient(150deg,#1E8FA8,#4FC3D9)", desc: "", count: 0, staff: [] },
    manager: { key: "manager", label: "Quản lý", ic: "shield", grad: "linear-gradient(150deg,#0F623F,#07432A)", desc: "", count: 0, staff: [] },
  },
  total: 0,
  permGroups: [],
  perms: {},
};

const ALL_PERMS = DATA.permGroups.flatMap(g => g.perms);
const TOTAL = DATA.total;

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

function AssignModal({ role, onClose, onAssign }) {
  const r = DATA.roles[role];
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const submit = async () => {
    if (!phone.trim()) { setError("Vui lòng nhập số điện thoại"); return; }
    setBusy(true);
    setError("");
    const ok = await onAssign(phone.trim());
    setBusy(false);
    if (!ok.success) { setError(ok.message); return; }
    onClose();
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic" style={{ background: r.grad, color: "#fff" }}><Icon name={r.ic} size={20} color="#fff" /></div>
          <div>
            <h3>Gán vai trò {r.label}</h3>
            <p>Nhập số điện thoại người dùng để gán làm {r.label.toLowerCase()}</p>
          </div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-b">
          <div className="fld">
            <label>Số điện thoại</label>
            <input className="inp" value={phone} onChange={e => setPhone(e.target.value)} placeholder="VD: 0912345678" autoFocus
              onKeyDown={e => { if (e.key === "Enter") submit(); }} />
          </div>
          {error && <div style={{ color: "var(--danger, #C0392B)", fontSize: 13, marginTop: 6 }}>{error}</div>}
        </div>
        <div className="modal-f">
          <button className="btn ghost" style={{ flex: ".6" }} onClick={onClose}>Huỷ</button>
          <button className="btn primary" disabled={busy} onClick={submit}>
            <Icon name="check" size={17} color="#fff" /> {busy ? "Đang gán…" : "Gán vai trò"}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [perms, setPerms] = useState(DATA.perms);
  const [saved, setSaved] = useState(DATA.perms);
  const [roles, setRoles] = useState(DATA.roles);
  const [sideOpen, setSideOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const counts = useMemo(() => ({
    cashier: ALL_PERMS.filter(p => perms[p.id]?.cashier).length,
    manager: ALL_PERMS.filter(p => perms[p.id]?.manager).length,
  }), [perms]);

  const dirty = useMemo(() => JSON.stringify(perms) !== JSON.stringify(saved), [perms, saved]);

  const toggle = (pid, role, lock) => {
    if (lock) return;
    setPerms(s => ({ ...s, [pid]: { ...s[pid], [role]: !s[pid][role] } }));
  };

  const save = async () => {
    setSaving(true);
    const { ok, data } = await apiCall("POST", "/admin/roles", { perms });
    setSaving(false);
    if (ok) {
      setSaved(perms);
      setToast(data.message || "Đã lưu thay đổi phân quyền");
    } else {
      setToast(data.message || "Có lỗi xảy ra, vui lòng thử lại");
    }
    setTimeout(() => setToast(null), 3000);
  };
  const reset = () => setPerms(saved);

  const handleAssign = async (phone) => {
    const { ok, data } = await apiCall("POST", "/admin/roles/assign", { phone, role: assigning });
    if (!ok) {
      const msg = data.errors?.phone?.[0] || data.message || "Có lỗi xảy ra, vui lòng thử lại";
      return { success: false, message: msg };
    }
    setRoles(data.roles);
    setToast(data.message);
    setTimeout(() => setToast(null), 3000);
    return { success: true };
  };

  const handleRemoveStaff = async (staffId) => {
    const { ok, data } = await apiCall("DELETE", `/admin/roles/staff/${staffId}`);
    if (!ok) { setToast(data.message || "Có lỗi xảy ra, vui lòng thử lại"); setTimeout(() => setToast(null), 3000); return; }
    setRoles(data.roles);
    setToast(data.message);
    setTimeout(() => setToast(null), 3000);
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
    { ic: "bag", label: "Đơn hàng" },
    { ic: "truck", label: "Phí ship" },
    { ic: "gift", label: "Đổi quà" },
    { ic: "mega", label: "Chiến dịch" },
    { ic: "cup", label: "Thực đơn" },
    { ic: "plus", label: "Variant / Tuỳ chọn" },
    { ic: "pin", label: "Cửa hàng" },
    { ic: "shield", label: "Phân quyền", on: true },
    { ic: "gear", label: "Cài đặt" },
  ];

  const RoleCard = ({ role }) => {
    const r = roles[role];
    const cnt = counts[role];
    return (
      <div className="role-card">
        <div className="rc-top">
          <div className="rc-ic" style={{ background: r.grad }}><Icon name={r.ic} size={24} color="#fff" /></div>
          <div>
            <div className="rc-name">{r.label}</div>
            <div className="rc-count"><Icon name="users" size={13} color="var(--ink-3)" /> {r.staff.length} nhân viên</div>
          </div>
          <button className="icon-btn" style={{ marginLeft: "auto" }} title={`Gán vai trò ${r.label}`} onClick={() => setAssigning(role)}>
            <Icon name="plus" size={16} />
          </button>
        </div>
        <div className="rc-desc">{r.desc}</div>
        <div className="rc-perms">
          <div className="rc-bar"><div className="rc-fill" style={{ width: (cnt / (TOTAL || 1) * 100) + "%", background: r.grad }} /></div>
          <span className="rc-frac">{cnt}/{TOTAL} quyền</span>
        </div>
        <div className="rc-team">
          {r.staff.map((m) => (
            <div key={m.id} className="rc-av" style={{ background: m.color, position: "relative" }} title={`${m.name} · ${m.phone}`}>
              {m.name.trim().split(/\s+/).slice(-1)[0][0]}
              <button className="rc-av-x" title="Gỡ khỏi vai trò" onClick={() => handleRemoveStaff(m.id)}>
                <Icon name="close" size={10} color="#fff" />
              </button>
            </div>
          ))}
          {r.staff.length === 0 && <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Chưa có nhân viên</span>}
        </div>
      </div>
    );
  };

  const Ptog = ({ pid, role, locked }) => {
    const on = perms[pid]?.[role];
    return (
      <button className={"ptog " + role + (on ? " on" : "") + (locked ? " locked" : "")}
        onClick={() => toggle(pid, role, locked)} title={locked ? "Quyền bắt buộc của Quản lý" : ""}>
        {locked ? <Icon name="lock" size={14} color="currentColor" />
          : on ? <Icon name="check" size={15} color="#fff" /> : <Icon name="close" size={14} color="currentColor" />}
        <span className="ptxt">{on ? "Có" : "Không"}</span>
      </button>
    );
  };

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
          {NAV.slice(0, 10).map(n => (
            <a key={n.label} className={"side-link" + (n.on ? " on" : "")} href={adminHref(n.label)}>
              <Icon name={n.ic} size={19} /> {n.label}
            </a>
          ))}
        </nav>
        <div className="side-sec">Hệ thống</div>
        <nav className="side-nav">
          {NAV.slice(10).map(n => (
            <a key={n.label} className={"side-link" + (n.on ? " on" : "")} href={adminHref(n.label)}>
              <Icon name={n.ic} size={19} /> {n.label}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="side-av">{DATA.admin.initials}</div>
            <div style={{ minWidth: 0 }}><div className="un">{DATA.admin.name}</div><div className="ur">{DATA.admin.email}</div></div>
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: "auto" }} onClick={logout} title="Đăng xuất"><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Hệ thống · Phân quyền</div>
            <h1>Phân quyền nhân viên</h1>
          </div>
          <div className="topbar-spacer" />
          {dirty && <button className="btn ghost" onClick={reset}>Hoàn tác</button>}
          <button className="btn primary" disabled={!dirty || saving} onClick={save}>
            <Icon name="check" size={16} color={(dirty && !saving) ? "#fff" : "currentColor"} /> {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </header>

        <div className="content">
          <div className="role-cards">
            <RoleCard role="cashier" />
            <RoleCard role="manager" />
          </div>

          <div className="panel">
            <div className="matrix-head">
              <div className="mh-feat">Chức năng / Quyền hạn</div>
              <div className="mh-role"><span className="mh-chip cashier"><Icon name="scan" size={14} color="currentColor" /> Thu ngân</span></div>
              <div className="mh-role"><span className="mh-chip manager"><Icon name="shield" size={14} color="currentColor" /> Quản lý</span></div>
            </div>

            {DATA.permGroups.map(g => (
              <div key={g.title}>
                <div className="pgroup-title"><span className="pgi"><Icon name={g.ic} size={15} color="currentColor" /></span>{g.title}</div>
                {g.perms.map(p => (
                  <div className="prow" key={p.id}>
                    <div>
                      <div className="pf-name">{p.name}</div>
                      <div className="pf-desc">{p.desc}</div>
                    </div>
                    <div className="pcell"><Ptog pid={p.id} role="cashier" /></div>
                    <div className="pcell"><Ptog pid={p.id} role="manager" locked={p.lockManager} /></div>
                  </div>
                ))}
              </div>
            ))}

            <div className="matrix-foot">
              <div className="mf-note"><Icon name="lock" size={15} color="var(--ink-3)" /> Quyền có ổ khoá là quyền bắt buộc của vai trò, không thể tắt.</div>
              <div className="mf-spacer" />
              {dirty && <div className="mf-note"><span className="dirty-dot" /> Có thay đổi chưa lưu</div>}
            </div>
          </div>
        </div>
      </div>

      {toast && <div className="toast"><span className="tc"><Icon name="check" size={15} color="#fff" /></span>{toast}</div>}

      {assigning && <AssignModal role={assigning} onClose={() => setAssigning(null)} onAssign={handleAssign} />}

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
