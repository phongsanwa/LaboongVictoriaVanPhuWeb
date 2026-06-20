/* global React, ReactDOM, Icon, fmt, VARIANT_GROUPS, adminHref, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo } = React;

const VG_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const TYPE_LABEL = { level: "Mức %", size: "Có phụ phí", addon: "Topping" };

const TYPE_OPTS = [
  { value: "level",  label: "Mức % (không phụ phí)", desc: "VD: lượng đường, lượng đá" },
  { value: "size",   label: "Có phụ phí",             desc: "VD: size cốc, cỡ phần" },
  { value: "addon",  label: "Topping (chọn nhiều)",   desc: "VD: topping thêm, sauce" },
];

const GROUP_ICONS = ["cup", "coin", "flame", "plus", "star", "gift", "grid", "receipt", "bell", "heart", "globe", "rocket", "cake", "bike"];

/* ─── Live-mode globals ──────────────────────────────────────────────── */
const LIVE      = !!window.ADMIN_VARIANTS_DATA;
const LIVE_URLS = window.ADMIN_VARIANTS_DATA?.urls || {};

function csrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

async function apiFetch(method, url, body) {
  const opts = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'X-CSRF-TOKEN':  csrfToken(),
      'Accept':        'application/json',
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Có lỗi xảy ra');
  return json;
}

/* ─── Initial groups: DB data (live) or static data (demo) ──────────── */
function makeInitialGroups() {
  if (LIVE) {
    return window.ADMIN_VARIANTS_DATA.groups.map(g => ({
      ...g, options: g.options.map(o => ({ ...o })),
    }));
  }
  const src = typeof VARIANT_GROUPS !== 'undefined' ? VARIANT_GROUPS : [];
  return src.map(g => ({ ...g, options: g.options.map(o => ({ ...o })) }));
}

/* ─── GroupEditor modal (demo mode only) ────────────────────────────── */
function GroupEditor({ initial, onClose, onSave }) {
  const isEdit = !!(initial.key);
  const [label,    setLabel]    = useState(initial.label    || "");
  const [type,     setType]     = useState(initial.type     || "level");
  const [required, setRequired] = useState(initial.required !== false);
  const [ic,       setIc]       = useState(initial.ic       || GROUP_ICONS[0]);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const valid  = label.trim().length > 0;
  const submit = () => { if (!valid) return; onSave({ ...initial, label: label.trim(), type, required, ic }); };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name={isEdit ? "edit" : "plus"} size={20} /></div>
          <div>
            <h3>{isEdit ? "Sửa nhóm variant" : "Thêm nhóm variant"}</h3>
            <p>{isEdit ? `Đang sửa "${initial.label}"` : "Tạo nhóm tuỳ chọn mới"}</p>
          </div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-b">
          <div className="fld">
            <label>Tên nhóm</label>
            <input className="inp" value={label} onChange={e => setLabel(e.target.value)}
              placeholder="VD: Lượng đường, Size cốc, Topping…" autoFocus
              onKeyDown={e => { if (e.key === "Enter") submit(); }} />
          </div>

          <div className="fld">
            <label>Loại variant</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TYPE_OPTS.map(t => (
                <label key={t.value} style={{
                  display: "flex", alignItems: "center", gap: 11,
                  padding: "11px 13px",
                  border: `1.5px solid ${type === t.value ? "var(--brand)" : "var(--line)"}`,
                  borderRadius: "var(--r-sm)", cursor: "pointer",
                  background: type === t.value ? "var(--brand-soft)" : "transparent", transition: ".14s",
                }}>
                  <input type="radio" name="vtype" value={t.value} checked={type === t.value}
                    onChange={() => setType(t.value)} style={{ accentColor: "var(--brand)", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 1 }}>{t.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="fld">
            <label>Icon nhóm</label>
            <div className="gm-icon-pick">
              {GROUP_ICONS.map(name => (
                <button key={name} className={"gm-ico" + (ic === name ? " on" : "")} onClick={() => setIc(name)}>
                  <Icon name={name} size={18} color="currentColor" />
                </button>
              ))}
            </div>
          </div>

          <div className="switch-row" onClick={() => setRequired(r => !r)} style={{ cursor: "pointer" }}>
            <div>
              <div className="sl">Bắt buộc chọn</div>
              <div className="sd">Khách phải chọn 1 lựa chọn trong nhóm này</div>
            </div>
            <div className={"switch" + (required ? " on" : "")} />
          </div>
        </div>

        <div className="modal-f">
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
          <button className="btn primary" disabled={!valid} onClick={submit}>
            <Icon name="check" size={17} color="#fff" /> {isEdit ? "Lưu nhóm" : "Thêm nhóm"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────── */
function App() {
  const [tw, setTweak] = useTweaks(VG_DEFAULTS);
  const [groups,      setGroups]      = useState(makeInitialGroups);
  const [sideOpen,    setSideOpen]    = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [draftName,   setDraftName]   = useState("");
  const [draftPrice,  setDraftPrice]  = useState("");
  const [groupEditor, setGroupEditor] = useState(null);
  const [search,      setSearch]      = useState("");
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const flash = (m, ok = true) => {
    setToast({ msg: m, ok });
    setTimeout(() => setToast(null), 2800);
  };

  const stats = useMemo(() => {
    const all = groups.flatMap(g => g.options);
    return { groups: groups.length, total: all.length, off: all.filter(o => !o.available).length };
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .filter(g => g.label.toLowerCase().includes(q) || g.options.some(o => o.label.toLowerCase().includes(q)))
      .map(g => ({
        ...g,
        options: g.label.toLowerCase().includes(q)
          ? g.options
          : g.options.filter(o => o.label.toLowerCase().includes(q)),
      }));
  }, [groups, search]);

  const setGroup = (gKey, fn) => setGroups(gs => gs.map(g => g.key === gKey ? fn(g) : g));

  /* ── Toggle single option ─── */
  const toggleAvail = async (gKey, oId) => {
    const g = groups.find(x => x.key === gKey);
    const o = g?.options.find(x => x.id === oId);
    if (!o) return;

    if (LIVE) {
      setSaving(true);
      try {
        const data = await apiFetch('POST', LIVE_URLS.toggleOption, { group_key: gKey, name: oId });
        setGroup(gKey, g => ({ ...g, options: g.options.map(x => x.id === oId ? { ...x, available: data.available } : x) }));
        flash(data.available ? `Đã bật lại "${o.label}"` : `Đã tắt "${o.label}" (báo hết)`);
      } catch (e) {
        flash(e.message, false);
      } finally {
        setSaving(false);
      }
    } else {
      setGroup(gKey, g => ({ ...g, options: g.options.map(x => x.id === oId ? { ...x, available: !x.available } : x) }));
      flash(o.available ? `Đã tắt "${o.label}" (báo hết)` : `Đã bật lại "${o.label}"`);
    }
  };

  /* ── Toggle all options in a group ─── */
  const toggleAllAvail = async (gKey) => {
    const g = groups.find(x => x.key === gKey);
    if (!g) return;
    const allOn = g.options.length > 0 && g.options.every(o => o.available);

    if (LIVE) {
      setSaving(true);
      try {
        const data = await apiFetch('POST', LIVE_URLS.toggleAll, { group_key: gKey });
        setGroup(gKey, g => ({ ...g, options: g.options.map(o => ({ ...o, available: data.available })) }));
        flash(data.available ? `Đã bật lại toàn bộ "${g.label}"` : `Đã báo hết toàn bộ "${g.label}"`);
      } catch (e) {
        flash(e.message, false);
      } finally {
        setSaving(false);
      }
    } else {
      setGroup(gKey, g => ({ ...g, options: g.options.map(o => ({ ...o, available: !allOn })) }));
      flash(allOn ? `Đã báo hết toàn bộ "${g.label}"` : `Đã bật lại toàn bộ "${g.label}"`);
    }
  };

  const setDefault = (gKey, oId) =>
    setGroup(gKey, g => ({ ...g, options: g.options.map(o => ({ ...o, def: o.id === oId })) }));

  /* ── Delete single option ─── */
  const del = async (gKey, oId) => {
    const g = groups.find(x => x.key === gKey);
    const o = g?.options.find(x => x.id === oId);
    if (!o || !confirm(`Xoá lựa chọn "${o.label}"?`)) return;

    if (LIVE) {
      setSaving(true);
      try {
        await apiFetch('DELETE', LIVE_URLS.deleteOption, { group_key: gKey, name: oId });
        setGroup(gKey, g => ({ ...g, options: g.options.filter(x => x.id !== oId) }));
        flash(`Đã xoá "${o.label}"`);
      } catch (e) {
        flash(e.message, false);
      } finally {
        setSaving(false);
      }
    } else {
      setGroup(gKey, g => ({ ...g, options: g.options.filter(x => x.id !== oId) }));
    }
  };

  /* ── Delete entire group ─── */
  const delGroup = async (gKey) => {
    const g = groups.find(x => x.key === gKey);
    if (!confirm(`Xoá nhóm "${g.label}" và tất cả ${g.options.length} lựa chọn bên trong?`)) return;

    if (LIVE) {
      setSaving(true);
      try {
        const url = LIVE_URLS.destroyGroup.replace('__ID__', g.id);
        await apiFetch('DELETE', url);
        setGroups(gs => gs.filter(x => x.key !== gKey));
        flash(`Đã xoá nhóm "${g.label}"`);
      } catch (e) {
        flash(e.message, false);
      } finally {
        setSaving(false);
      }
    } else {
      setGroups(gs => gs.filter(x => x.key !== gKey));
      flash(`Đã xoá nhóm "${g.label}"`);
    }
  };

  /* ── Save group (create or update) ─── */
  const saveGroup = async (updated) => {
    if (LIVE) {
      setSaving(true);
      try {
        const isEdit = !!(updated.key);
        const body   = { label: updated.label, ic: updated.ic, type: updated.type, required: updated.required };
        let result;
        if (isEdit) {
          const url = LIVE_URLS.updateGroup.replace('__ID__', updated.id);
          result = await apiFetch('POST', url, body);
          setGroups(gs => gs.map(g => g.key === updated.key ? result.group : g));
          flash(`Đã cập nhật nhóm "${updated.label}"`);
        } else {
          result = await apiFetch('POST', LIVE_URLS.storeGroup, body);
          setGroups(gs => [...gs, result.group]);
          flash(`Đã thêm nhóm "${updated.label}"`);
        }
      } catch (e) {
        flash(e.message, false);
      } finally {
        setSaving(false);
      }
      setGroupEditor(null);
    } else {
      if (!updated.key) {
        setGroups(gs => [...gs, { ...updated, key: "vg" + Date.now(), options: [] }]);
        flash(`Đã thêm nhóm "${updated.label}"`);
      } else {
        setGroups(gs => gs.map(g => g.key === updated.key ? { ...g, ...updated } : g));
        flash(`Đã cập nhật nhóm "${updated.label}"`);
      }
      setGroupEditor(null);
    }
  };

  /* ── Inline option edit / add ─── */
  const startEdit = (gKey, o) => { setEditing({ gKey, oId: o.id }); setDraftName(o.label); setDraftPrice(o.extra ? String(o.extra) : ""); };
  const startAdd  = (gKey)    => { setEditing({ gKey, oId: "new" }); setDraftName(""); setDraftPrice(""); };

  const commit = async () => {
    if (!draftName.trim() || saving) return;
    const { gKey, oId } = editing;
    const extra = parseInt(draftPrice.replace(/[^\d]/g, ""), 10) || 0;

    if (LIVE) {
      setSaving(true);
      try {
        if (oId === "new") {
          const data = await apiFetch('POST', LIVE_URLS.storeOption, { group_key: gKey, name: draftName.trim(), extra_price: extra });
          setGroup(gKey, g => ({ ...g, options: [...g.options, data.option] }));
          flash("Đã thêm lựa chọn");
        } else {
          const data = await apiFetch('PUT', LIVE_URLS.updateOption, { group_key: gKey, old_name: oId, name: draftName.trim(), extra_price: extra });
          setGroup(gKey, g => ({ ...g, options: g.options.map(o => o.id === oId ? data.option : o) }));
          flash("Đã cập nhật lựa chọn");
        }
        setEditing(null);
      } catch (e) {
        flash(e.message, false);
      } finally {
        setSaving(false);
      }
    } else {
      if (oId === "new") {
        setGroup(gKey, g => ({ ...g, options: [...g.options, { id: "o" + Date.now(), label: draftName.trim(), extra, available: true, def: false }] }));
        flash("Đã thêm lựa chọn");
      } else {
        setGroup(gKey, g => ({ ...g, options: g.options.map(o => o.id === oId ? { ...o, label: draftName.trim(), extra } : o) }));
        flash("Đã cập nhật lựa chọn");
      }
      setEditing(null);
    }
  };

  const NAV = [
    { ic: "chart",   label: "Tổng quan" },
    { ic: "users",   label: "Khách hàng" },
    { ic: "receipt", label: "Điểm & giao dịch" },
    { ic: "bag",     label: "Đơn hàng" },
    { ic: "truck",   label: "Phí ship" },
    { ic: "gift",    label: "Đổi quà" },
    { ic: "mega",    label: "Chiến dịch" },
    { ic: "cup",     label: "Thực đơn" },
    { ic: "plus",    label: "Variant / Tuỳ chọn", on: true },
    { ic: "shield",  label: "Phân quyền" },
    { ic: "gear",    label: "Cài đặt" },
  ];

  const priceText = (g, o) => {
    if (g.type === "level") return null;
    return o.extra > 0 ? `+${fmt(o.extra)}đ` : "Miễn phí";
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
          {NAV.slice(0, 9).map(n => (
            <a key={n.label} className={"side-link" + (n.on ? " on" : "")} href={adminHref(n.label)}>
              <Icon name={n.ic} size={19} /> {n.label}
            </a>
          ))}
        </nav>
        <div className="side-sec">Hệ thống</div>
        <nav className="side-nav">
          {NAV.slice(9).map(n => (
            <a key={n.label} className="side-link" href={adminHref(n.label)}>
              <Icon name={n.ic} size={19} /> {n.label}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-user">
            {window.ADMIN_VARIANTS_DATA?.admin ? (
              <>
                <div className="side-av">{window.ADMIN_VARIANTS_DATA.admin.initials}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="un">{window.ADMIN_VARIANTS_DATA.admin.name}</div>
                  <div className="ur">{window.ADMIN_VARIANTS_DATA.admin.email}</div>
                </div>
              </>
            ) : (
              <>
                <div className="side-av">QT</div>
                <div style={{ minWidth: 0 }}>
                  <div className="un">Quản trị viên</div>
                  <div className="ur">admin@laboong.vn</div>
                </div>
              </>
            )}
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: "auto" }}>
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Variant / Tuỳ chọn</div>
            <h1>Quản lý variant</h1>
          </div>
          <div className="topbar-spacer" />
          <div className="searchbox">
            <Icon name="search" size={18} color="var(--ink-3)" />
            <input placeholder="Tìm nhóm, lựa chọn…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn primary" onClick={() => setGroupEditor({})} disabled={saving}>
            <Icon name="plus" size={16} color="#fff" /> Thêm nhóm
          </button>
          {LIVE && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: "var(--r-sm)", background: "var(--ok-bg)", color: "var(--ok)", fontSize: 13, fontWeight: 700 }}>
              <Icon name="check" size={15} color="var(--ok)" /> Kết nối cơ sở dữ liệu
            </div>
          )}
        </header>

        <div className="content">
          <div className="stats" style={{ marginBottom: 20 }}>
            <div className="stat">
              <div className="stat-ic g"><Icon name="plus" size={22} /></div>
              <div><div className="lbl">Nhóm variant</div><div className="val tnum">{stats.groups}</div></div>
            </div>
            <div className="stat">
              <div className="stat-ic b"><Icon name="grid" size={20} /></div>
              <div><div className="lbl">Tổng lựa chọn</div><div className="val tnum">{stats.total}</div></div>
            </div>
            <div className="stat">
              <div className="stat-ic p"><Icon name="eyeoff" size={20} /></div>
              <div><div className="lbl">Đang báo hết</div><div className="val tnum">{stats.off}</div></div>
            </div>
            <div className="stat">
              <div className="stat-ic a"><Icon name="check" size={22} /></div>
              <div><div className="lbl">Đang bán</div><div className="val tnum">{stats.total - stats.off}</div></div>
            </div>
          </div>

          {filteredGroups.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ink-3)", fontWeight: 500 }}>
              {search ? `Không tìm thấy kết quả cho "${search}"` : "Chưa có nhóm variant nào."}
            </div>
          )}

          {filteredGroups.map(g => {
            const allOn = g.options.length > 0 && g.options.every(o => o.available);
            return (
              <div className="vgroup" key={g.key}>
                <div className="vgroup-h">
                  <span className="vgi"><Icon name={g.ic} size={21} color="currentColor" /></span>
                  <div className="vgtitle">
                    <div className="vgn">{g.label}</div>
                    <div className="vgmeta">{g.required ? "Bắt buộc chọn 1" : "Chọn nhiều · không bắt buộc"}</div>
                  </div>
                  <span className="vgtype">{TYPE_LABEL[g.type]}</span>
                  <span className="vgcount">{g.options.filter(o => o.available).length}/{g.options.length} đang bán</span>
                  <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
                    <button className="vopt-edit" title={allOn ? "Báo hết cả nhóm" : "Bật lại cả nhóm"}
                      disabled={saving || g.options.length === 0}
                      onClick={() => toggleAllAvail(g.key)}>
                      <Icon name={allOn ? "eyeoff" : "eye"} size={15} />
                    </button>
                    <>
                      <button className="vopt-edit" title="Sửa nhóm" disabled={saving} onClick={() => setGroupEditor(g)}>
                        <Icon name="edit" size={15} />
                      </button>
                      <button className="vopt-edit del" title="Xoá nhóm" disabled={saving} onClick={() => delGroup(g.key)}>
                        <Icon name="trash" size={15} />
                      </button>
                    </>
                  </div>
                </div>

                <div className="vopts">
                  {g.options.map(o => (
                    editing && editing.gKey === g.key && editing.oId === o.id ? (
                      <div className="vopt-editing" key={o.id}>
                        <input className="vin-name" value={draftName} onChange={e => setDraftName(e.target.value)}
                          placeholder="Tên lựa chọn" autoFocus
                          onKeyDown={e => { if (e.key === "Enter") commit(); }} />
                        {g.type !== "level" && (
                          <input className="vin-price tnum" inputMode="numeric" value={draftPrice}
                            onChange={e => setDraftPrice(e.target.value.replace(/[^\d]/g, ""))}
                            placeholder="Phụ phí (đ)" />
                        )}
                        <button className="btn primary tiny" onClick={commit} disabled={saving}>
                          {saving ? "…" : "Lưu"}
                        </button>
                        <button className="btn ghost tiny" onClick={() => setEditing(null)} disabled={saving}>Huỷ</button>
                      </div>
                    ) : (
                      <div className={"vopt-row" + (o.available ? "" : " off")} key={o.id}>
                        <span className="vopt-drag"><Icon name="dots" size={16} color="currentColor" /></span>
                        <span className="vopt-name">
                          {o.label}
                          {o.def && <span className="vdef">Mặc định</span>}
                          {!o.available && <span className="soldout">Hết</span>}
                        </span>
                        {priceText(g, o) && (
                          <span className={"vopt-extra" + (o.extra > 0 ? "" : " free")}>{priceText(g, o)}</span>
                        )}
                        <div className="vopt-acts">
                          {g.required && !o.def && (
                            <button className="vopt-edit" title="Đặt mặc định" onClick={() => setDefault(g.key, o.id)}>
                              <Icon name="star" size={15} />
                            </button>
                          )}
                          <button className="vopt-edit" title="Sửa" onClick={() => startEdit(g.key, o)}>
                            <Icon name="edit" size={15} />
                          </button>
                          <button className="vopt-edit del" title="Xoá" onClick={() => del(g.key, o.id)}>
                            <Icon name="trash" size={15} />
                          </button>
                          <button className={"switch" + (o.available ? " on" : "")}
                            title={o.available ? "Đang bán — bấm để báo hết" : "Đang hết — bấm để bật lại"}
                            disabled={saving}
                            onClick={() => toggleAvail(g.key, o.id)} />
                        </div>
                      </div>
                    )
                  ))}

                  {editing && editing.gKey === g.key && editing.oId === "new" ? (
                    <div className="vopt-editing">
                      <input className="vin-name" value={draftName} onChange={e => setDraftName(e.target.value)}
                        placeholder="Tên lựa chọn mới" autoFocus
                        onKeyDown={e => { if (e.key === "Enter") commit(); }} />
                      {g.type !== "level" && (
                        <input className="vin-price tnum" inputMode="numeric" value={draftPrice}
                          onChange={e => setDraftPrice(e.target.value.replace(/[^\d]/g, ""))}
                          placeholder="Phụ phí (đ)" />
                      )}
                      <button className="btn primary tiny" onClick={commit} disabled={saving}>
                        {saving ? "…" : "Thêm"}
                      </button>
                      <button className="btn ghost tiny" onClick={() => setEditing(null)} disabled={saving}>Huỷ</button>
                    </div>
                  ) : (
                    <button className="vopt-add" onClick={() => startAdd(g.key)}>
                      <Icon name="plus" size={15} color="currentColor" /> Thêm lựa chọn vào "{g.label}"
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <div className="toast">
          <span className="tc" style={{ background: toast.ok ? "var(--ok)" : "var(--danger)" }}>
            <Icon name={toast.ok ? "check" : "close"} size={15} color="#fff" />
          </span>
          {toast.msg}
        </div>
      )}

      {groupEditor !== null && (
        <GroupEditor initial={groupEditor} onClose={() => setGroupEditor(null)} onSave={saveGroup} />
      )}

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
