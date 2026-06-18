/* global React, ReactDOM, Icon, fmt, CATS, MENU, TAG_META, SIZE_OPTS, adminHref, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo, useRef } = React;

const MM_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const SWATCHES = [
  "linear-gradient(150deg,#6B4A2B,#9B7150)", "linear-gradient(150deg,#0F623F,#1AA86A)",
  "linear-gradient(150deg,#FF8A3D,#FFB85C)", "linear-gradient(150deg,#F2598A,#FF8FB3)",
  "linear-gradient(150deg,#8B6FB0,#B79CD6)", "linear-gradient(150deg,#1E8FA8,#4FC3D9)",
  "linear-gradient(150deg,#3E9B5F,#6FBF8A)", "linear-gradient(150deg,#E8973A,#F2B96B)",
];
const ALL_TAGS = [["hot", "Best"], ["veg", "Healthy"], ["new", "Mới"]];
const GROUP_ICONS = ["cup", "plant", "coin", "flame", "plus", "star", "gift", "cart", "bag", "spark"];

/* tuỳ chỉnh mặc định: món topping không có tuỳ chỉnh, món nước có đủ */
function defaultOpts(cat) {
  if (cat === "topping") return { sugar: false, ice: false, size: false, topping: false };
  return { sugar: true, ice: true, size: true, topping: true };
}
const OPT_META = [
  { key: "sugar", ic: "coin", label: "Lượng đường", desc: "0% · 30% · 50% · 70% · 100%" },
  { key: "ice", ic: "flame", label: "Lượng đá", desc: "0% · 30% · 50% · 70% · 100%" },
  { key: "size", ic: "cup", label: "Size cốc", desc: "M · L (+6k) · XL (+12k)" },
  { key: "topping", ic: "plus", label: "Thêm topping", desc: "Trân châu, kem phô mai, pudding…" },
];

/* seed availability + sold counts */
const seedItems = MENU.map((m, i) => ({ ...m, available: !(i % 9 === 4), sold: 40 + (i * 53) % 380, opts: defaultOpts(m.cat) }));

/* ---- editor modal ---- */
function MenuEditor({ initial, groups, onClose, onSave }) {
  const isEdit = !!initial.id;
  const [name, setName] = useState(initial.name || "");
  const [cat, setCat] = useState(initial.cat || groups[0].key);
  const [price, setPrice] = useState(initial.price || "");
  const [desc, setDesc] = useState(initial.desc || "");
  const [grad, setGrad] = useState(initial.grad || SWATCHES[0]);
  const [img, setImg] = useState(initial.img || null);
  const [tags, setTags] = useState(initial.tags || []);
  const [available, setAvailable] = useState(initial.available !== false);
  const [opts, setOpts] = useState(initial.opts || defaultOpts(initial.cat || groups[0].key));
  const fileRef = useRef(null);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const grpIcon = (groups.find(g => g.key === cat) || groups[0]).ic;
  const toggleTag = (t) => setTags(ts => ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]);
  const toggleOpt = (k) => setOpts(o => ({ ...o, [k]: !o[k] }));
  const valid = name.trim() && Number(price) > 0;
  const submit = () => { if (!valid) return; onSave({ ...initial, id: initial.id || ("new" + Date.now()), name: name.trim(), cat, price: Number(price), desc: desc.trim(), grad, img, tags, available, opts, sold: initial.sold || 0 }); };

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setImg(reader.result);
    reader.readAsDataURL(f);
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal menu-editor" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name={isEdit ? "edit" : "plus"} size={20} /></div>
          <div><h3>{isEdit ? "Sửa món" : "Thêm món mới"}</h3><p>{isEdit ? initial.name : "Điền thông tin món vào thực đơn"}</p></div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-b">
          {/* image upload */}
          <div className="me-thumb-row">
            <div className="me-img" onClick={() => fileRef.current && fileRef.current.click()}>
              {img
                ? <><img src={img} alt="" /><button className="me-img-clear" onClick={e => { e.stopPropagation(); setImg(null); }}><Icon name="close" size={13} color="#fff" /></button></>
                : <div className="me-img-ph" style={{ background: grad }}><Icon name={grpIcon} size={32} color="#fff" /></div>}
              <div className="me-img-over"><Icon name="camera" size={18} color="#fff" /><span>{img ? "Đổi ảnh" : "Tải ảnh"}</span></div>
            </div>
            <div className="me-img-side">
              <button className="me-upload-btn" onClick={() => fileRef.current && fileRef.current.click()}><Icon name="download" size={15} color="currentColor" style={{ transform: "rotate(180deg)" }} /> Tải ảnh món</button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
              <div className="me-img-hint">Ảnh JPG/PNG, nên dùng ảnh vuông. Không có ảnh sẽ dùng màu nền bên dưới.</div>
            </div>
          </div>

          {!img && (<>
            <div className="me-sub">Màu nền (khi chưa có ảnh)</div>
            <div className="me-swatches" style={{ marginTop: 0, marginBottom: 4 }}>
              {SWATCHES.map(s => <button key={s} className={"me-sw" + (grad === s ? " on" : "")} style={{ background: s }} onClick={() => setGrad(s)} />)}
            </div>
          </>)}

          <div className="fld" style={{ marginTop: 16 }}>
            <label>Tên món</label>
            <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Trà sữa trân châu đường đen" autoFocus />
          </div>

          <div className="two-col">
            <div className="fld">
              <label>Nhóm</label>
              <div className="field">
                <select className="select" style={{ width: "100%" }} value={cat} onChange={e => setCat(e.target.value)}>
                  {groups.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <span className="chev"><Icon name="chevdown" size={16} /></span>
              </div>
            </div>
            <div className="fld">
              <label>Giá (đồng)</label>
              <input className="inp tnum" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value.replace(/[^\d]/g, ""))} placeholder="45000" />
            </div>
          </div>

          <div className="fld">
            <label>Mô tả</label>
            <textarea className="inp" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả ngắn về món…" />
          </div>

          <div className="fld">
            <label>Nhãn</label>
            <div className="me-tags">
              {ALL_TAGS.map(([k, l]) => (
                <button key={k} className={"me-tag" + (tags.includes(k) ? " on" : "")} onClick={() => toggleTag(k)}>
                  <Icon name={TAG_META[k].ic} size={13} color="currentColor" /> {l}
                </button>
              ))}
            </div>
          </div>

          <div className="switch-row" onClick={() => setAvailable(a => !a)} style={{ cursor: "pointer" }}>
            <div><div className="sl">Còn hàng</div><div className="sd">Hiển thị & cho phép khách đặt món này</div></div>
            <div className={"switch" + (available ? " on" : "")} />
          </div>
        </div>
        <div className="modal-f">
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
          <button className="btn primary" disabled={!valid} onClick={submit}><Icon name="check" size={17} color="#fff" /> {isEdit ? "Lưu" : "Thêm món"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---- group manager modal ---- */
function GroupManager({ groups, counts, onClose, onSave }) {
  const [list, setList] = useState(groups.map(g => ({ ...g })));
  const [editing, setEditing] = useState(null); // key being edited or "new"
  const [draftName, setDraftName] = useState("");
  const [draftIc, setDraftIc] = useState(GROUP_ICONS[0]);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const startEdit = (g) => { setEditing(g.key); setDraftName(g.label); setDraftIc(g.ic); };
  const startNew = () => { setEditing("new"); setDraftName(""); setDraftIc(GROUP_ICONS[0]); };
  const commit = () => {
    if (!draftName.trim()) return;
    if (editing === "new") {
      const key = "g" + Date.now();
      setList(l => [...l, { key, label: draftName.trim(), ic: draftIc }]);
    } else {
      setList(l => l.map(g => g.key === editing ? { ...g, label: draftName.trim(), ic: draftIc } : g));
    }
    setEditing(null);
  };
  const del = (g) => {
    const c = counts[g.key] || 0;
    if (c > 0) { alert(`Nhóm "${g.label}" đang có ${c} món. Hãy chuyển hoặc xoá các món trước.`); return; }
    if (confirm(`Xoá nhóm "${g.label}"?`)) setList(l => l.filter(x => x.key !== g.key));
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name="grid" size={20} /></div>
          <div><h3>Quản lý nhóm món</h3><p>Thêm, sửa, xoá nhóm trong thực đơn</p></div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-b">
          <div className="gm-list">
            {list.map(g => (
              editing === g.key ? (
                <div key={g.key} style={{ border: "1.5px solid var(--brand)", borderRadius: "var(--r-md)", padding: 13, background: "var(--brand-soft)" }}>
                  <div className="gm-edit-row">
                    <input className="inp" value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Tên nhóm" autoFocus />
                    <button className="btn primary tiny" onClick={commit}>Lưu</button>
                  </div>
                  <div className="gm-icon-pick">
                    {GROUP_ICONS.map(ic => <button key={ic} className={"gm-ico" + (draftIc === ic ? " on" : "")} onClick={() => setDraftIc(ic)}><Icon name={ic} size={18} color="currentColor" /></button>)}
                  </div>
                </div>
              ) : (
                <div className="gm-row" key={g.key}>
                  <span className="gmi"><Icon name={g.ic} size={19} color="currentColor" /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="gmn">{g.label}</div>
                    <div className="gmc">{counts[g.key] || 0} món</div>
                  </div>
                  <div className="gm-acts">
                    <button className="mca" onClick={() => startEdit(g)} title="Sửa"><Icon name="edit" size={15} /></button>
                    <button className="mca del" onClick={() => del(g)} title="Xoá"><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              )
            ))}
          </div>
          {editing === "new" ? (
            <div style={{ border: "1.5px solid var(--brand)", borderRadius: "var(--r-md)", padding: 13, background: "var(--brand-soft)", marginTop: 10 }}>
              <div className="gm-edit-row">
                <input className="inp" value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Tên nhóm mới" autoFocus />
                <button className="btn primary tiny" onClick={commit}>Thêm</button>
              </div>
              <div className="gm-icon-pick">
                {GROUP_ICONS.map(ic => <button key={ic} className={"gm-ico" + (draftIc === ic ? " on" : "")} onClick={() => setDraftIc(ic)}><Icon name={ic} size={18} color="currentColor" /></button>)}
              </div>
            </div>
          ) : (
            <button className="gm-add" onClick={startNew}><Icon name="plus" size={16} color="currentColor" /> Thêm nhóm mới</button>
          )}
        </div>
        <div className="modal-f">
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
          <button className="btn primary" onClick={() => onSave(list)}><Icon name="check" size={17} color="#fff" /> Lưu thay đổi</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [tw, setTweak] = useTweaks(MM_DEFAULTS);
  const [groups, setGroups] = useState(() => CATS.map(c => ({ ...c })));
  const [items, setItems] = useState(() => seedItems.map(m => ({ ...m })));
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [editor, setEditor] = useState(null);
  const [groupMgr, setGroupMgr] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const grpIcon = (key) => (groups.find(g => g.key === key) || {}).ic || "cup";

  const filtered = useMemo(() => items.filter(m => {
    if (cat !== "all" && m.cat !== cat) return false;
    if (q.trim() && !m.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [items, cat, q]);

  const counts = useMemo(() => { const c = {}; items.forEach(m => { c[m.cat] = (c[m.cat] || 0) + 1; }); return c; }, [items]);
  const stats = useMemo(() => ({
    total: items.length,
    avail: items.filter(m => m.available).length,
    off: items.filter(m => !m.available).length,
  }), [items]);

  const toggleAvail = (id) => setItems(list => list.map(m => m.id === id ? { ...m, available: !m.available } : m));
  const save = (item) => {
    setItems(list => list.some(m => m.id === item.id) ? list.map(m => m.id === item.id ? item : m) : [item, ...list]);
    flash(items.some(m => m.id === item.id) ? `Đã cập nhật "${item.name}"` : `Đã thêm "${item.name}"`);
    setEditor(null);
  };
  const remove = (m) => { if (confirm(`Xoá món "${m.name}" khỏi thực đơn?`)) { setItems(list => list.filter(x => x.id !== m.id)); flash(`Đã xoá "${m.name}"`); } };
  const saveGroups = (list) => {
    setGroups(list);
    if (cat !== "all" && !list.some(g => g.key === cat)) setCat("all");
    flash("Đã lưu nhóm món");
    setGroupMgr(false);
  };

  const NAV = [
    { ic: "chart", label: "Tổng quan" },
    { ic: "users", label: "Khách hàng" },
    { ic: "receipt", label: "Điểm & giao dịch" },
    { ic: "gift", label: "Đổi quà" },
    { ic: "mega", label: "Chiến dịch" },
    { ic: "cup", label: "Thực đơn", on: true, badge: String(items.length) },
    { ic: "plus", label: "Variant / Tuỳ chọn" },
    { ic: "shield", label: "Phân quyền" },
    { ic: "gear", label: "Cài đặt" },
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
              <Icon name={n.ic} size={19} /> {n.label}{n.badge && <span className="badge">{n.badge}</span>}
            </a>
          ))}
        </nav>
        <div className="side-sec">Hệ thống</div>
        <nav className="side-nav">
          {NAV.slice(7).map(n => <a key={n.label} className="side-link" href={adminHref(n.label)}><Icon name={n.ic} size={19} /> {n.label}</a>)}
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="side-av">QT</div>
            <div style={{ minWidth: 0 }}><div className="un">Quản trị viên</div><div className="ur">admin@laboong.vn</div></div>
            <button className="icon-btn" style={{ width: 32, height: 32, marginLeft: "auto" }}><Icon name="logout" size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Thực đơn</div>
            <h1>Quản lý thực đơn</h1>
          </div>
          <div className="topbar-spacer" />
          <div className="searchbox">
            <Icon name="search" size={18} color="var(--ink-3)" />
            <input placeholder="Tìm món…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn ghost" onClick={() => setGroupMgr(true)}><Icon name="grid" size={16} /> Quản lý nhóm</button>
          <button className="btn primary" onClick={() => setEditor({})}><Icon name="plus" size={16} color="#fff" /> Thêm món</button>
        </header>

        <div className="content">
          <div className="stats" style={{ marginBottom: 18 }}>
            <div className="stat"><div className="stat-ic g"><Icon name="cup" size={22} /></div>
              <div><div className="lbl">Tổng số món</div><div className="val tnum">{stats.total}</div></div></div>
            <div className="stat"><div className="stat-ic a"><Icon name="check" size={22} /></div>
              <div><div className="lbl">Đang bán</div><div className="val tnum">{stats.avail}</div></div></div>
            <div className="stat"><div className="stat-ic p"><Icon name="eyeoff" size={20} /></div>
              <div><div className="lbl">Tạm hết / ẩn</div><div className="val tnum">{stats.off}</div></div></div>
            <button className="stat" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setGroupMgr(true)}><div className="stat-ic y"><Icon name="grid" size={20} /></div>
              <div><div className="lbl">Nhóm món</div><div className="val tnum">{groups.length}</div></div></button>
          </div>

          <div className="mcat-tabs">
            <button className={"mcat" + (cat === "all" ? " on" : "")} onClick={() => setCat("all")}>
              <Icon name="grid" size={15} color="currentColor" /> Tất cả <span className="mc-n">{items.length}</span>
            </button>
            {groups.map(c => {
              const n = counts[c.key] || 0;
              return (
                <button key={c.key} className={"mcat" + (cat === c.key ? " on" : "")} onClick={() => setCat(c.key)}>
                  <Icon name={c.ic} size={15} color="currentColor" /> {c.label} <span className="mc-n">{n}</span>
                </button>
              );
            })}
          </div>

          <div className="menu-grid">
            {filtered.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 48, color: "var(--ink-3)", fontWeight: 500 }}>Không có món nào khớp.</div>
            )}
            {filtered.map(m => (
              <div className={"mcard" + (m.available ? "" : " off")} key={m.id}>
                {!m.available && <span className="soldout-flag">Tạm hết</span>}
                <div className="mcard-avail">
                  <button className={"mswitch" + (m.available ? " on" : "")} onClick={() => toggleAvail(m.id)} title={m.available ? "Đang bán" : "Tạm hết"} />
                </div>
                <div className="mcard-thumb" style={{ background: m.img ? "none" : m.grad }}>
                  {m.img ? <img src={m.img} alt="" /> : <span className="ti"><Icon name={grpIcon(m.cat)} size={30} color="#fff" /></span>}
                </div>
                <div className="mcard-body">
                  {m.tags.length > 0 && (
                    <div className="mcard-tags">
                      {m.tags.map(t => <span key={t} className={"mtag " + t}>{TAG_META[t].l}</span>)}
                    </div>
                  )}
                  <div className="mcard-name">{m.name}</div>
                  <div className="mcard-desc">{m.desc || "—"}</div>
                  <div className="mcard-foot">
                    <span className="mcard-price tnum">{fmt(m.price)}đ</span>
                    <div className="mcard-acts">
                      <button className="mca" onClick={() => setEditor(m)} title="Sửa"><Icon name="edit" size={16} /></button>
                      <button className="mca del" onClick={() => remove(m)} title="Xoá"><Icon name="trash" size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editor && <MenuEditor initial={editor} groups={groups} onClose={() => setEditor(null)} onSave={save} />}
      {groupMgr && <GroupManager groups={groups} counts={counts} onClose={() => setGroupMgr(false)} onSave={saveGroups} />}
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
