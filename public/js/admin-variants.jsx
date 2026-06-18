/* global React, ReactDOM, Icon, fmt, VARIANT_GROUPS, adminHref, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo } = React;

const VG_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const TYPE_LABEL = { level: "Mức %", size: "Có phụ phí", addon: "Topping" };

function App() {
  const [tw, setTweak] = useTweaks(VG_DEFAULTS);
  const [groups, setGroups] = useState(() => VARIANT_GROUPS.map(g => ({ ...g, options: g.options.map(o => ({ ...o })) })));
  const [sideOpen, setSideOpen] = useState(false);
  const [editing, setEditing] = useState(null);   // {gKey, oId} or {gKey, oId:"new"}
  const [draftName, setDraftName] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const stats = useMemo(() => {
    const all = groups.flatMap(g => g.options);
    return { groups: groups.length, total: all.length, off: all.filter(o => !o.available).length };
  }, [groups]);

  const setGroup = (gKey, fn) => setGroups(gs => gs.map(g => g.key === gKey ? fn(g) : g));

  const toggleAvail = (gKey, oId) => {
    setGroup(gKey, g => ({ ...g, options: g.options.map(o => o.id === oId ? { ...o, available: !o.available } : o) }));
    const g = groups.find(x => x.key === gKey); const o = g.options.find(x => x.id === oId);
    flash(o.available ? `Đã tắt "${o.label}" (báo hết)` : `Đã bật lại "${o.label}"`);
  };
  const setDefault = (gKey, oId) => setGroup(gKey, g => ({ ...g, options: g.options.map(o => ({ ...o, def: o.id === oId })) }));
  const del = (gKey, oId) => {
    const g = groups.find(x => x.key === gKey); const o = g.options.find(x => x.id === oId);
    if (confirm(`Xoá lựa chọn "${o.label}"?`)) setGroup(gKey, g => ({ ...g, options: g.options.filter(x => x.id !== oId) }));
  };
  const startEdit = (gKey, o) => { setEditing({ gKey, oId: o.id }); setDraftName(o.label); setDraftPrice(o.extra ? String(o.extra) : ""); };
  const startAdd = (gKey) => { setEditing({ gKey, oId: "new" }); setDraftName(""); setDraftPrice(""); };
  const commit = () => {
    if (!draftName.trim()) return;
    const { gKey, oId } = editing;
    const extra = parseInt(draftPrice.replace(/[^\d]/g, ""), 10) || 0;
    if (oId === "new") {
      setGroup(gKey, g => ({ ...g, options: [...g.options, { id: "o" + Date.now(), label: draftName.trim(), extra, available: true, def: false }] }));
      flash("Đã thêm lựa chọn");
    } else {
      setGroup(gKey, g => ({ ...g, options: g.options.map(o => o.id === oId ? { ...o, label: draftName.trim(), extra } : o) }));
      flash("Đã cập nhật lựa chọn");
    }
    setEditing(null);
  };

  const NAV = [
    { ic: "chart", label: "Tổng quan" },
    { ic: "users", label: "Khách hàng" },
    { ic: "receipt", label: "Điểm & giao dịch" },
    { ic: "gift", label: "Đổi quà" },
    { ic: "mega", label: "Chiến dịch" },
    { ic: "cup", label: "Thực đơn" },
    { ic: "plus", label: "Variant / Tuỳ chọn", on: true },
    { ic: "shield", label: "Phân quyền" },
    { ic: "gear", label: "Cài đặt" },
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
          {NAV.slice(0, 7).map(n => (
            <a key={n.label} className={"side-link" + (n.on ? " on" : "")} href={adminHref(n.label)}>
              <Icon name={n.ic} size={19} /> {n.label}
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
            <div className="crumb">Quản lý · Variant / Tuỳ chọn</div>
            <h1>Quản lý variant</h1>
          </div>
          <div className="topbar-spacer" />
        </header>

        <div className="content">
          <div className="stats" style={{ marginBottom: 20 }}>
            <div className="stat"><div className="stat-ic g"><Icon name="plus" size={22} /></div>
              <div><div className="lbl">Nhóm variant</div><div className="val tnum">{stats.groups}</div></div></div>
            <div className="stat"><div className="stat-ic b"><Icon name="grid" size={20} /></div>
              <div><div className="lbl">Tổng lựa chọn</div><div className="val tnum">{stats.total}</div></div></div>
            <div className="stat"><div className="stat-ic p"><Icon name="eyeoff" size={20} /></div>
              <div><div className="lbl">Đang báo hết</div><div className="val tnum">{stats.off}</div></div></div>
            <div className="stat"><div className="stat-ic a"><Icon name="check" size={22} /></div>
              <div><div className="lbl">Đang bán</div><div className="val tnum">{stats.total - stats.off}</div></div></div>
          </div>

          {groups.map(g => (
            <div className="vgroup" key={g.key}>
              <div className="vgroup-h">
                <span className="vgi"><Icon name={g.ic} size={21} color="currentColor" /></span>
                <div className="vgtitle">
                  <div className="vgn">{g.label}</div>
                  <div className="vgmeta">{g.required ? "Bắt buộc chọn 1" : "Chọn nhiều · không bắt buộc"}</div>
                </div>
                <span className="vgtype">{TYPE_LABEL[g.type]}</span>
                <span className="vgcount">{g.options.filter(o => o.available).length}/{g.options.length} đang bán</span>
              </div>
              <div className="vopts">
                {g.options.map(o => (
                  editing && editing.gKey === g.key && editing.oId === o.id ? (
                    <div className="vopt-editing" key={o.id}>
                      <input className="vin-name" value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Tên lựa chọn" autoFocus
                        onKeyDown={e => { if (e.key === "Enter") commit(); }} />
                      {g.type !== "level" && <input className="vin-price tnum" inputMode="numeric" value={draftPrice} onChange={e => setDraftPrice(e.target.value.replace(/[^\d]/g, ""))} placeholder="Phụ phí (đ)" />}
                      <button className="btn primary tiny" onClick={commit}>Lưu</button>
                      <button className="btn ghost tiny" onClick={() => setEditing(null)}>Huỷ</button>
                    </div>
                  ) : (
                    <div className={"vopt-row" + (o.available ? "" : " off")} key={o.id}>
                      <span className="vopt-drag"><Icon name="dots" size={16} color="currentColor" /></span>
                      <span className="vopt-name">
                        {o.label}
                        {o.def && <span className="vdef">Mặc định</span>}
                        {!o.available && <span className="soldout">Hết</span>}
                      </span>
                      {priceText(g, o) && <span className={"vopt-extra" + (o.extra > 0 ? "" : " free")}>{priceText(g, o)}</span>}
                      <div className="vopt-acts">
                        {g.required && !o.def && <button className="vopt-edit" title="Đặt mặc định" onClick={() => setDefault(g.key, o.id)}><Icon name="star" size={15} /></button>}
                        <button className="vopt-edit" title="Sửa" onClick={() => startEdit(g.key, o)}><Icon name="edit" size={15} /></button>
                        <button className="vopt-edit del" title="Xoá" onClick={() => del(g.key, o.id)}><Icon name="trash" size={15} /></button>
                        <button className={"switch" + (o.available ? " on" : "")} title={o.available ? "Đang bán — bấm để báo hết" : "Đang hết — bấm để bật lại"} onClick={() => toggleAvail(g.key, o.id)} />
                      </div>
                    </div>
                  )
                ))}
                {editing && editing.gKey === g.key && editing.oId === "new" ? (
                  <div className="vopt-editing">
                    <input className="vin-name" value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Tên lựa chọn mới" autoFocus
                      onKeyDown={e => { if (e.key === "Enter") commit(); }} />
                    {g.type !== "level" && <input className="vin-price tnum" inputMode="numeric" value={draftPrice} onChange={e => setDraftPrice(e.target.value.replace(/[^\d]/g, ""))} placeholder="Phụ phí (đ)" />}
                    <button className="btn primary tiny" onClick={commit}>Thêm</button>
                    <button className="btn ghost tiny" onClick={() => setEditing(null)}>Huỷ</button>
                  </div>
                ) : (
                  <button className="vopt-add" onClick={() => startAdd(g.key)}><Icon name="plus" size={15} color="currentColor" /> Thêm lựa chọn vào "{g.label}"</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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
