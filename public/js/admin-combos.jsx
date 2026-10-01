/* global React, ReactDOM, Icon, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, NAV_URLS, adminHref */
const { useState, useEffect, useMemo, useRef } = React;

const CB_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const DATA = window.ADMIN_COMBOS_DATA || { admin: null, combos: [], products: [] };

/* ─── API helper ────────────────────────────────────────────────────── */
function csrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.content || "";
}
async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-TOKEN": csrfToken() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, data };
}

/* ─── Formatters ────────────────────────────────────────────────────── */
function fmtPrice(n) { return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ"; }
function fmtDate(iso) { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }

/* ─── Status badge ──────────────────────────────────────────────────── */
const STATUS_MAP = {
  active:   { label: "Đang bán",  cls: "on"  },
  inactive: { label: "Tạm dừng", cls: "off" },
  draft:    { label: "Nháp",     cls: "draft" },
};

/* ─── Combo card in list ────────────────────────────────────────────── */
function ComboCard({ c, onEdit, onToggle, onDelete }) {
  const st = STATUS_MAP[c.status] || STATUS_MAP.draft;
  return (
    <div className="combo-card">
      <div className="combo-img">
        {c.image_url
          ? <img src={c.image_url} alt={c.name} />
          : <div className="combo-img-ph"><Icon name="box" size={28} color="var(--ink-3)" /></div>}
        {c.saving_percent > 0 && <span className="combo-badge-save">-{c.saving_percent}%</span>}
      </div>

      <div className="combo-body">
        <div className="combo-name">{c.name}</div>
        {c.description && <div className="combo-desc">{c.description}</div>}

        <div className="combo-items-preview">
          {c.items.map((it, i) => (
            <span key={it.id} className="combo-item-tag">
              {it.quantity > 1 && <b>{it.quantity}×</b>} {it.product_name}
              {it.default_size_name && <span className="combo-size">{it.default_size_name}</span>}
              {i < c.items.length - 1 && " + "}
            </span>
          ))}
        </div>

        <div className="combo-pricing">
          <span className="combo-price">{fmtPrice(c.combo_price)}</span>
          {c.original_price > c.combo_price && (
            <span className="combo-orig">{fmtPrice(c.original_price)}</span>
          )}
        </div>

        <div className="combo-meta">
          {c.available_from && <span><Icon name="clock" size={13} /> {c.available_from}–{c.available_until}</span>}
          {c.max_per_day && <span><Icon name="target" size={13} /> Tối đa {c.max_per_day}/ngày</span>}
          {c.valid_until && <span><Icon name="cal" size={13} /> đến {fmtDate(c.valid_until)}</span>}
        </div>
      </div>

      <div className="combo-foot">
        <span className={"status " + st.cls}>{st.label}</span>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <button className="rw-btn" onClick={() => onToggle(c)}
            title={c.status === "active" ? "Tạm dừng" : "Kích hoạt"}>
            <Icon name={c.status === "active" ? "pause" : "play"} size={15} />
          </button>
          <button className="rw-btn" onClick={() => onEdit(c)} title="Chỉnh sửa">
            <Icon name="edit" size={15} />
          </button>
          <button className="rw-btn danger" onClick={() => onDelete(c)} title="Xoá">
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Item row inside editor ────────────────────────────────────────── */
function ComboItemRow({ item, products, onChange, onRemove }) {
  const prod = products.find(p => p.id === item.product_id);
  return (
    <div className="cb-item-row">
      <div className="cb-item-drag"><Icon name="dots" size={16} color="var(--ink-3)" /></div>

      {/* product select */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="sel-wrap" style={{ width: "100%" }}>
          <select className="sel-full" value={item.product_id || ""}
            onChange={e => onChange({ ...item, product_id: Number(e.target.value), default_size_variant_id: null })}>
            <option value="">— Chọn sản phẩm —</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} · {fmtPrice(p.base_price)}</option>
            ))}
          </select>
          <span className="chev"><Icon name="chevdown" size={15} /></span>
        </div>
      </div>

      {/* size select (only if product has sizes) */}
      {prod?.sizes?.length > 0 && (
        <div style={{ width: 90 }}>
          <div className="sel-wrap">
            <select className="sel-full" value={item.default_size_variant_id || ""}
              onChange={e => onChange({ ...item, default_size_variant_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Size</option>
              {prod.sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <span className="chev"><Icon name="chevdown" size={15} /></span>
          </div>
        </div>
      )}

      {/* qty */}
      <div style={{ width: 64 }}>
        <input className="inp" type="number" min="1" max="20" value={item.quantity}
          style={{ textAlign: "center", padding: "9px 6px" }}
          onChange={e => onChange({ ...item, quantity: Math.max(1, Number(e.target.value) || 1) })} />
      </div>

      <button className="icon-btn" style={{ color: "var(--danger, #E53935)", width: 32, height: 32 }}
        onClick={onRemove} title="Xoá khỏi combo"><Icon name="close" size={16} /></button>
    </div>
  );
}

/* ─── Combo editor modal ────────────────────────────────────────────── */
function ComboEditor({ initial, products, onClose, onSave }) {
  const isEdit = !!initial;
  const [name, setName]               = useState(initial?.name || "");
  const [desc, setDesc]               = useState(initial?.description || "");
  const [comboPrice, setComboPrice]   = useState(initial?.combo_price ?? "");
  const [status, setStatus]           = useState(initial?.status || "draft");
  const [maxDay, setMaxDay]           = useState(initial?.max_per_day ?? "");
  const [fromTime, setFromTime]       = useState(initial?.available_from || "");
  const [untilTime, setUntilTime]     = useState(initial?.available_until || "");
  const [validFrom, setValidFrom]     = useState(initial?.valid_from || "");
  const [validUntil, setValidUntil]   = useState(initial?.valid_until || "");
  const [items, setItems]             = useState(
    initial?.items?.map(it => ({ ...it, _key: it.id })) || []
  );
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState("");

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  /* computed original price */
  const originalPrice = useMemo(() => items.reduce((sum, it) => {
    const p = products.find(p => p.id === it.product_id);
    const sizeExtra = it.default_size_variant_id
      ? (p?.sizes?.find(s => s.id === it.default_size_variant_id)?.extra_price || 0)
      : 0;
    return sum + ((p?.base_price || 0) + sizeExtra) * it.quantity;
  }, 0), [items, products]);

  const saving_pct = comboPrice > 0 && originalPrice > 0
    ? Math.round((1 - comboPrice / originalPrice) * 100) : 0;

  const addItem = () => {
    setItems(prev => [...prev, { _key: Date.now(), product_id: null, quantity: 1, default_size_variant_id: null, sort_order: prev.length }]);
  };

  const changeItem = (idx, updated) => {
    setItems(prev => prev.map((it, i) => i === idx ? updated : it));
  };

  const removeItem = idx => setItems(prev => prev.filter((_, i) => i !== idx));

  const valid = name.trim() && comboPrice !== "" && Number(comboPrice) >= 0
    && items.length > 0 && items.every(it => it.product_id);

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setErr("");
    const payload = {
      name: name.trim(),
      description: desc.trim() || null,
      combo_price: Number(comboPrice),
      status,
      max_per_day: maxDay !== "" ? Number(maxDay) : null,
      available_from:  fromTime  || null,
      available_until: untilTime || null,
      valid_from:  validFrom  || null,
      valid_until: validUntil || null,
      sort_order: initial?.sort_order ?? 0,
      items: items.map((it, i) => ({
        product_id:              it.product_id,
        quantity:                it.quantity,
        default_size_variant_id: it.default_size_variant_id ?? null,
        sort_order:              i,
      })),
    };
    const url    = isEdit ? `/admin/combos/${initial.id}` : "/admin/combos";
    const method = isEdit ? "PUT" : "POST";
    const { ok, data } = await api(method, url, payload);
    setSaving(false);
    if (!ok) { setErr(data.message || "Có lỗi xảy ra, vui lòng thử lại"); return; }
    onSave(data.combo);
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name="box" size={20} /></div>
          <div>
            <h3>{isEdit ? "Chỉnh sửa combo" : "Tạo combo mới"}</h3>
            <p>{isEdit ? `Đang sửa: ${initial.name}` : "Gộp nhiều món thành 1 combo ưu đãi"}</p>
          </div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-b" style={{ maxHeight: "72vh" }}>
          {err && <div className="modal-err"><Icon name="alert" size={15} /> {err}</div>}

          {/* tên + mô tả */}
          <div className="fld">
            <label>Tên combo <span style={{ color: "var(--danger,#E53935)" }}>*</span></label>
            <input className="inp" value={name} onChange={e => setName(e.target.value)}
              placeholder="VD: Combo Gia đình 4 người" autoFocus />
          </div>
          <div className="fld">
            <label>Mô tả ngắn</label>
            <textarea className="inp" value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="VD: Gồm 2 trà sữa size L + 2 trà trái cây, tiết kiệm 30%" rows={2} />
          </div>

          {/* sản phẩm trong combo */}
          <div className="fld">
            <label>Sản phẩm trong combo <span style={{ color: "var(--danger,#E53935)" }}>*</span></label>
            {items.length === 0 && (
              <div className="cb-empty-items">Chưa có sản phẩm nào. Nhấn "+ Thêm món" để bắt đầu.</div>
            )}
            <div className="cb-items-list">
              {items.map((it, i) => (
                <ComboItemRow key={it._key ?? i} item={it} products={products}
                  onChange={updated => changeItem(i, updated)}
                  onRemove={() => removeItem(i)} />
              ))}
            </div>
            <button className="btn ghost" style={{ marginTop: 8, width: "100%" }} onClick={addItem}>
              <Icon name="plus" size={16} /> Thêm món vào combo
            </button>
          </div>

          {/* giá */}
          <div className="cb-price-block">
            <div className="fld" style={{ marginBottom: 0 }}>
              <label>Giá combo <span style={{ color: "var(--danger,#E53935)" }}>*</span></label>
              <div className="amt-row">
                <input className="inp" type="number" min="0" step="1000" value={comboPrice}
                  onChange={e => setComboPrice(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="VD: 89000" />
                <span style={{ marginLeft: 10, fontWeight: 700, color: "var(--brand)", fontSize: 15 }}>đ</span>
              </div>
            </div>
            {originalPrice > 0 && (
              <div className="cb-price-summary">
                <span>Giá gốc: <b>{fmtPrice(originalPrice)}</b></span>
                {saving_pct > 0 && <span className="cb-save-badge">Tiết kiệm {saving_pct}%</span>}
              </div>
            )}
          </div>

          {/* cài đặt nâng cao */}
          <div className="cb-advanced">
            <div className="cb-adv-title" onClick={e => e.currentTarget.closest(".cb-advanced").classList.toggle("open")}>
              <Icon name="gear" size={15} /> Cài đặt nâng cao
              <Icon name="chevdown" size={14} style={{ marginLeft: "auto" }} />
            </div>
            <div className="cb-adv-body">
              <div className="two-col">
                <div className="fld">
                  <label>Giờ bắt đầu bán</label>
                  <input className="inp" type="time" value={fromTime} onChange={e => setFromTime(e.target.value)} />
                </div>
                <div className="fld">
                  <label>Giờ kết thúc bán</label>
                  <input className="inp" type="time" value={untilTime} onChange={e => setUntilTime(e.target.value)} />
                </div>
              </div>
              <div className="two-col">
                <div className="fld">
                  <label>Ngày bắt đầu</label>
                  <input className="inp" type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
                </div>
                <div className="fld">
                  <label>Ngày kết thúc</label>
                  <input className="inp" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                </div>
              </div>
              <div className="fld" style={{ marginBottom: 0 }}>
                <label>Giới hạn số lượng / ngày</label>
                <div className="amt-row">
                  <input className="inp" type="number" min="1" value={maxDay}
                    onChange={e => setMaxDay(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Không giới hạn" style={{ maxWidth: 180 }} />
                  <span style={{ marginLeft: 10, color: "var(--ink-2)", fontSize: 13 }}>combo/ngày</span>
                </div>
              </div>
            </div>
          </div>

          {/* trạng thái */}
          <div className="fld" style={{ marginTop: 16, marginBottom: 0 }}>
            <label>Trạng thái</label>
            <div className="seg" style={{ width: "100%", justifyContent: "stretch" }}>
              {[["draft","Nháp"],["active","Đang bán"],["inactive","Tạm dừng"]].map(([v, l]) => (
                <button key={v} className={"" + (status === v ? "on" + (v === "active" ? " ok" : v === "inactive" ? " off" : "") : "")}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setStatus(v)}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-f">
          <button className="btn ghost" style={{ flex: ".5" }} onClick={onClose}>Huỷ</button>
          <button className="btn primary" disabled={!valid || saving} onClick={submit}>
            {saving
              ? <><span className="spin" style={{ width: 16, height: 16, borderWidth: 2 }} /> Đang lưu…</>
              : <><Icon name="check" size={17} color="#fff" /> {isEdit ? "Lưu thay đổi" : "Tạo combo"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Confirm delete ────────────────────────────────────────────────── */
function ConfirmDelete({ name, onClose, onConfirm }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal confirm" onClick={e => e.stopPropagation()}>
        <div className="ci"><Icon name="trash" size={26} /></div>
        <h3>Xoá combo?</h3>
        <p>Bạn sắp xoá <b>{name}</b>. Hành động này không thể hoàn tác.</p>
        <div className="row">
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
          <button className="btn danger" onClick={onConfirm}><Icon name="trash" size={16} color="#fff" /> Xoá</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ──────────────────────────────────────────────────────── */
function CombosApp() {
  const [tw, setTweak] = useTweaks(CB_DEFAULTS);
  const [combos, setCombos]   = useState(() => DATA.combos.map(c => ({ ...c })));
  const products               = DATA.products;
  const [q, setQ]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sideOpen, setSideOpen] = useState(false);
  const [editor, setEditor]   = useState(null);   // null | { combo }
  const [delTarget, setDelTarget] = useState(null);
  const [toast, setToast]     = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const flash = msg => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const stats = useMemo(() => ({
    total:    combos.length,
    active:   combos.filter(c => c.status === "active").length,
    draft:    combos.filter(c => c.status === "draft").length,
    products: new Set(combos.flatMap(c => c.items.map(it => it.product_id))).size,
  }), [combos]);

  const filtered = useMemo(() => combos.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (q.trim() && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [combos, statusFilter, q]);

  const onSave = (combo) => {
    setCombos(prev => {
      const idx = prev.findIndex(c => c.id === combo.id);
      return idx >= 0 ? prev.map(c => c.id === combo.id ? combo : c) : [combo, ...prev];
    });
    flash(editor?.combo ? `Đã cập nhật "${combo.name}"` : `Đã tạo combo "${combo.name}"`);
    setEditor(null);
  };

  const onToggle = async (c) => {
    const { ok, data } = await api("POST", `/admin/combos/${c.id}/toggle`);
    if (!ok) { flash(data.message || "Có lỗi xảy ra"); return; }
    setCombos(prev => prev.map(x => x.id === c.id ? data.combo : x));
    flash(`"${c.name}" → ${data.combo.status === "active" ? "Đang bán" : "Tạm dừng"}`);
  };

  const doDelete = async () => {
    const { ok, data } = await api("DELETE", `/admin/combos/${delTarget.id}`);
    if (!ok) { flash(data.message || "Có lỗi xảy ra"); setDelTarget(null); return; }
    setCombos(prev => prev.filter(c => c.id !== delTarget.id));
    flash(`Đã xoá "${delTarget.name}"`);
    setDelTarget(null);
  };

  const logout = async e => {
    e.preventDefault();
    await api("POST", "/logout");
    location.href = NAV_URLS.login;
  };

  const NAV = [
    { ic: "chart",   label: "Tổng quan" },
    { ic: "users",   label: "Khách hàng" },
    { ic: "receipt", label: "Điểm & giao dịch" },
    { ic: "gift",    label: "Đổi quà" },
    { ic: "mega",    label: "Chiến dịch" },
    { ic: "box",     label: "Combo", on: true, badge: combos.filter(c => c.status === "active").length || null },
    { ic: "pin",     label: "Cửa hàng" },
    { ic: "shield",  label: "Phân quyền" },
    { ic: "gear",    label: "Cài đặt" },
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
          {NAV.slice(0, 7).map(n => (
            <a key={n.label} className={"side-link" + (n.on ? " on" : "")} href={adminHref(n.label)}>
              <Icon name={n.ic} size={19} /> {n.label}
              {n.badge ? <span className="badge">{n.badge}</span> : null}
            </a>
          ))}
        </nav>
        <div className="side-sec">Hệ thống</div>
        <nav className="side-nav">
          {NAV.slice(7).map(n => (
            <a key={n.label} className="side-link" href={adminHref(n.label)}>
              <Icon name={n.ic} size={19} /> {n.label}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="side-av">{DATA.admin?.initials}</div>
            <div style={{ minWidth: 0 }}>
              <div className="un">{DATA.admin?.name}</div>
              <div className="ur">{DATA.admin?.email}</div>
            </div>
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: "auto" }} onClick={logout} title="Đăng xuất">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Menu</div>
            <h1>Combo &amp; Bundle</h1>
          </div>
          <div className="topbar-spacer" />
          <div className="searchbox">
            <Icon name="search" size={18} color="var(--ink-3)" />
            <input placeholder="Tìm combo…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn primary" onClick={() => setEditor({ combo: null })}>
            <Icon name="plus" size={16} color="#fff" /> Tạo combo
          </button>
        </header>

        <div className="content">
          {/* stat row */}
          <div className="stats">
            <div className="stat">
              <div className="stat-ic g"><Icon name="box" size={20} /></div>
              <div>
                <div className="lbl">Tổng combo</div>
                <div className="val tnum">{stats.total}</div>
                <div className="chg up">{stats.active} đang bán</div>
              </div>
            </div>
            <div className="stat">
              <div className="stat-ic a"><Icon name="play" size={20} /></div>
              <div>
                <div className="lbl">Đang bán</div>
                <div className="val tnum">{stats.active}</div>
                <div className="chg up">Hiển thị cho khách</div>
              </div>
            </div>
            <div className="stat">
              <div className="stat-ic y"><Icon name="edit" size={20} /></div>
              <div>
                <div className="lbl">Bản nháp</div>
                <div className="val tnum">{stats.draft}</div>
                <div className="chg">Chưa xuất bản</div>
              </div>
            </div>
            <div className="stat">
              <div className="stat-ic b"><Icon name="cup" size={20} /></div>
              <div>
                <div className="lbl">Sản phẩm tham gia</div>
                <div className="val tnum">{stats.products}</div>
                <div className="chg up">Sản phẩm trong combo</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="toolbar">
              <div className="ttl">Danh sách combo <span className="ct">{filtered.length}</span></div>
              <div className="tb-spacer" />
              <div className="seg">
                <button className={statusFilter === "all"      ? "on"      : ""} onClick={() => setStatusFilter("all")}>Tất cả</button>
                <button className={statusFilter === "active"   ? "on ok"   : ""} onClick={() => setStatusFilter("active")}>Đang bán</button>
                <button className={statusFilter === "draft"    ? "on"      : ""} onClick={() => setStatusFilter("draft")}>Nháp</button>
                <button className={statusFilter === "inactive" ? "on off"  : ""} onClick={() => setStatusFilter("inactive")}>Tạm dừng</button>
              </div>
            </div>

            {filtered.length === 0
              ? <div className="cb-empty-state">
                  <Icon name="box" size={40} color="var(--ink-3)" />
                  <p>{q ? "Không tìm thấy combo nào." : "Chưa có combo nào. Tạo combo đầu tiên!"}</p>
                  {!q && <button className="btn primary" onClick={() => setEditor({ combo: null })}>
                    <Icon name="plus" size={16} color="#fff" /> Tạo combo
                  </button>}
                </div>
              : <div className="combo-grid">
                  {filtered.map(c => (
                    <ComboCard key={c.id} c={c}
                      onEdit={x => setEditor({ combo: x })}
                      onToggle={onToggle}
                      onDelete={x => setDelTarget(x)} />
                  ))}
                </div>}
          </div>
        </div>
      </div>

      {editor && (
        <ComboEditor
          initial={editor.combo}
          products={products}
          onClose={() => setEditor(null)}
          onSave={onSave} />
      )}
      {delTarget && (
        <ConfirmDelete
          name={delTarget.name}
          onClose={() => setDelTarget(null)}
          onConfirm={doDelete} />
      )}
      {toast && (
        <div className="toast">
          <span className="tc"><Icon name="check" size={15} color="#fff" /></span>{toast}
        </div>
      )}

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F","#07432A"],["#005A36","#003D24"],["#3E5C8A","#2A4063"],["#6B4FA0","#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CombosApp />);
