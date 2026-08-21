/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, AdminSidebar */
const { useState, useEffect } = React;

const DATA = window.ADMIN_BANNERS_DATA || { admin: null, banners: [], urls: {} };
const URLS = DATA.urls || {};

function csrfToken() { return document.querySelector('meta[name="csrf-token"]')?.content || ""; }

async function apiJson(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Có lỗi xảy ra');
  return json;
}

async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(URLS.upload, {
    method: 'POST', headers: { 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json' }, body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Tải ảnh thất bại');
  return json.url;
}

/* ─── Ô tải ảnh banner ─── */
function ImageDrop({ label, hint, url, onUrl, onErr }) {
  const ref = React.useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = "";
    setBusy(true); onErr("");
    try { onUrl(await uploadImage(f)); } catch (x) { onErr(x.message); }
    setBusy(false);
  };
  return (
    <div className="fld">
      <label>{label}</label>
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      <div onClick={() => ref.current?.click()}
        style={{ cursor: "pointer", border: "1.5px dashed var(--line)", borderRadius: 12, overflow: "hidden", background: "var(--bg-2)", position: "relative", minHeight: 96 }}>
        {url ? (
          <img src={url} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ padding: 22, textAlign: "center", color: "var(--ink-3)" }}>
            <div style={{ marginBottom: 6 }}><Icon name="image" size={26} /></div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{busy ? "Đang tải…" : "Bấm để tải ảnh lên"}</div>
          </div>
        )}
        {url && (
          <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 999 }}>
            {busy ? "Đang tải…" : "Đổi ảnh"}
          </span>
        )}
      </div>
      {hint && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>{hint}</div>}
      {url && (
        <button className="btn ghost tiny" style={{ marginTop: 8, color: "var(--hot)" }} onClick={() => onUrl(null)}>
          <Icon name="trash" size={13} /> Xoá ảnh
        </button>
      )}
    </div>
  );
}

/* ─── Editor ─── */
function BannerEditor({ initial, onClose, onSaved }) {
  const isEdit = !!initial.id;
  const [title, setTitle]     = useState(initial.title || "");
  const [subtitle, setSubtitle] = useState(initial.subtitle || "");
  const [textPos, setTextPos] = useState(initial.text_position || "none");
  const [textAlign, setTextAlign] = useState(initial.text_align || "left");
  const [desktop, setDesktop] = useState(initial.image_desktop || null);
  const [mobile, setMobile]   = useState(initial.image_mobile || null);
  const [link, setLink]       = useState(initial.link_url || "");
  const [active, setActive]   = useState(initial.status ? initial.status === "active" : true);
  const [err, setErr]   = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const submit = async () => {
    if (saving) return;
    if (!desktop) { setErr("Vui lòng tải lên banner desktop"); return; }
    setSaving(true); setErr("");
    try {
      const payload = {
        title: title.trim() || null,
        subtitle: subtitle.trim() || null,
        text_position: textPos,
        text_align: textAlign,
        image_desktop: desktop,
        image_mobile: mobile || null,
        link_url: link.trim() || null,
        status: active ? 'active' : 'inactive',
      };
      const json = isEdit
        ? await apiJson('POST', URLS.update.replace('__ID__', initial.id), payload)
        : await apiJson('POST', URLS.store, payload);
      onSaved(json.banner, isEdit);
    } catch (x) { setErr(x.message); }
    setSaving(false);
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name={isEdit ? "edit" : "plus"} size={20} /></div>
          <div><h3>{isEdit ? "Sửa banner" : "Thêm banner"}</h3><p>Banner hiển thị ngoài trang chủ cho khách hàng</p></div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-b" style={{ overflowY: "auto", flex: 1 }}>
          <div className="fld">
            <label>Tiêu đề (không bắt buộc)</label>
            <input className="inp" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Khuyến mãi hè 2026" maxLength={150} />
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>Dùng làm tên nội bộ. Nếu chọn hiển thị chữ bên dưới, tiêu đề này sẽ hiện trên slide.</div>
          </div>

          <div className="fld">
            <label>Mô tả / phụ đề (không bắt buộc)</label>
            <textarea className="inp" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="VD: Mua 1 tặng 1 mọi ngày trong tuần" maxLength={300} rows={2} style={{ resize: "vertical" }} />
          </div>

          <div className="fld">
            <label>Vị trí chữ trên slide</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[["none", "Không hiện chữ"], ["inside", "Chữ trong ảnh"], ["outside", "Chữ ngoài ảnh"]].map(([v, lbl]) => (
                <button key={v} type="button"
                  className={"btn " + (textPos === v ? "primary" : "ghost")}
                  onClick={() => setTextPos(v)}
                  style={{ flex: "1 1 auto", minWidth: 110, justifyContent: "center" }}>
                  {textPos === v && <Icon name="check" size={14} color="#fff" />} {lbl}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>
              “Chữ trong ảnh” đè tiêu đề & phụ đề lên ảnh. “Chữ ngoài ảnh” hiển thị chữ ngay bên dưới ảnh.
            </div>
          </div>

          {textPos !== "none" && (
            <div className="fld">
              <label>Canh lề chữ</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["left", "Trái"], ["center", "Giữa"], ["right", "Phải"]].map(([v, lbl]) => (
                  <button key={v} type="button"
                    className={"btn " + (textAlign === v ? "primary" : "ghost")}
                    onClick={() => setTextAlign(v)}
                    style={{ flex: "1 1 auto", minWidth: 80, justifyContent: "center" }}>
                    {textAlign === v && <Icon name="check" size={14} color="#fff" />} {lbl}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ImageDrop label="Banner desktop (bắt buộc)" hint="Ảnh ngang, hiển thị trên máy tính & màn hình rộng. Nên rộng tối thiểu 1200px."
            url={desktop} onUrl={setDesktop} onErr={setErr} />

          <ImageDrop label="Banner mobile (không bắt buộc)" hint="Ảnh cho điện thoại. Bỏ trống thì tự dùng banner desktop."
            url={mobile} onUrl={setMobile} onErr={setErr} />

          <div className="fld">
            <label>Link khi bấm vào (không bắt buộc)</label>
            <input className="inp" value={link} onChange={e => setLink(e.target.value)} placeholder="VD: /rewards, /menu hoặc https://…" maxLength={500} />
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>Để trống thì banner chỉ hiển thị, không bấm được.</div>
          </div>

          <div className="fld">
            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" className={"tog" + (active ? " on" : "")} onClick={() => setActive(a => !a)} role="switch" aria-checked={active} />
              <span>{active ? "Đang hiện ngoài trang chủ" : "Đang ẩn"}</span>
            </label>
          </div>

          {err && <div className="err" style={{ marginTop: 4 }}><Icon name="info" size={14} color="var(--danger)" /> {err}</div>}
        </div>

        <div className="modal-f">
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
          <button className="btn primary" onClick={submit} disabled={saving || !desktop}>
            {saving ? "Đang lưu…" : <><Icon name="check" size={16} color="#fff" /> {isEdit ? "Lưu thay đổi" : "Thêm banner"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [tw, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{ "brand": ["#0F623F", "#07432A"], "dark": false }/*EDITMODE-END*/);
  const [banners, setBanners] = useState(DATA.banners || []);
  const [editor, setEditor] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b); r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const flash = (m, ok = true) => { setToast({ m, ok }); setTimeout(() => setToast(null), 2600); };

  const onSaved = (item, isEdit) => {
    setBanners(list => isEdit ? list.map(n => n.id === item.id ? item : n) : [...list, item]);
    setEditor(null);
    flash(isEdit ? "Đã cập nhật banner" : "Đã thêm banner");
  };

  const toggle = async (n) => {
    try {
      const json = await apiJson('POST', URLS.toggle.replace('__ID__', n.id), null);
      setBanners(list => list.map(x => x.id === n.id ? json.banner : x));
    } catch (e) { flash(e.message, false); }
  };

  const remove = async () => {
    const n = confirmDel; setConfirmDel(null);
    try {
      await apiJson('DELETE', URLS.destroy.replace('__ID__', n.id), null);
      setBanners(list => list.filter(x => x.id !== n.id));
      flash("Đã xoá banner");
    } catch (e) { flash(e.message, false); }
  };

  // Lưu thứ tự mới lên server (im lặng; lỗi thì báo toast)
  const persistOrder = async (list) => {
    try { await apiJson('POST', URLS.reorder, { ids: list.map(b => b.id) }); }
    catch (e) { flash(e.message, false); }
  };

  // Nút ▲▼ đổi chỗ banner lên/xuống 1 bậc (tiện dùng trên điện thoại)
  const move = (id, dir) => {
    setBanners(list => {
      const i = list.findIndex(b => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const arr = [...list];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      persistOrder(arr);
      return arr;
    });
  };

  const onDrop = (targetId) => {
    setOverId(null);
    const from = dragId; setDragId(null);
    if (from == null || from === targetId) return;
    setBanners(list => {
      const arr = [...list];
      const fi = arr.findIndex(b => b.id === from);
      const ti = arr.findIndex(b => b.id === targetId);
      if (fi < 0 || ti < 0) return list;
      const [moved] = arr.splice(fi, 1);
      arr.splice(ti, 0, moved);
      persistOrder(arr);
      return arr;
    });
  };

  const admin = DATA.admin || { name: "Quản trị viên", email: "", initials: "QT" };

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Banner" badges={{ "Banner": String(banners.length) }} admin={admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div><div className="crumb">Quản lý · Banner</div><h1>Quản lý banner</h1></div>
          <div className="topbar-spacer" />
          <button className="btn primary" onClick={() => setEditor({})}><Icon name="plus" size={16} color="#fff" /> Thêm banner</button>
        </header>

        <div className="content">
          {banners.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "var(--ink-3)" }}>
              <div style={{ marginBottom: 12 }}><Icon name="image" size={40} /></div>
              Chưa có banner nào. Bấm “Thêm banner” để tạo banner đầu tiên.
            </div>
          )}
          {banners.length > 1 && (
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="grid" size={14} /> Kéo-thả các banner để sắp xếp thứ tự hiển thị ngoài trang chủ.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {banners.map((n, i) => (
              <div key={n.id}
                draggable
                onDragStart={() => setDragId(n.id)}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onDragOver={e => { e.preventDefault(); if (overId !== n.id) setOverId(n.id); }}
                onDrop={() => onDrop(n.id)}
                style={{ background: "var(--panel)", border: (overId === n.id && dragId !== n.id) ? "2px solid var(--brand)" : "1px solid var(--line-2)", borderRadius: 16, overflow: "hidden", opacity: n.status === "active" ? (dragId === n.id ? 0.5 : 1) : 0.6, cursor: "grab" }}>
                <div style={{ position: "relative", background: "linear-gradient(135deg,#0F623F,#1AA86A)" }}>
                  <img src={n.image_desktop} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} draggable={false} />
                  <span style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.55)", color: "#fff", padding: "4px 8px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700 }}>
                    <Icon name="grid" size={12} color="#fff" /> Kéo để xếp
                  </span>
                  <span style={{ position: "absolute", top: 10, right: 10, background: n.status === "active" ? "var(--brand)" : "var(--ink-3)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>
                    {n.status === "active" ? "Đang hiện" : "Đang ẩn"}
                  </span>
                  {n.image_mobile && (
                    <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>
                      Có bản mobile
                    </span>
                  )}
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, lineHeight: 1.35 }}>{n.title || "Banner"}</div>
                  {n.subtitle && <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6, lineHeight: 1.4 }}>{n.subtitle}</div>}
                  {n.text_position && n.text_position !== "none" && (
                    <div style={{ fontSize: 11.5, color: "var(--brand)", fontWeight: 700, marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Icon name="edit" size={12} /> {n.text_position === "inside" ? "Chữ trong ảnh" : "Chữ ngoài ảnh"}
                    </div>
                  )}
                  {n.link_url
                    ? <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 10, wordBreak: "break-all" }}><Icon name="link" size={12} /> {n.link_url}</div>
                    : <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 10 }}>Không có link</div>}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {banners.length > 1 && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn ghost tiny" title="Lên" disabled={i === 0} onClick={() => move(n.id, -1)} style={i === 0 ? { opacity: 0.4 } : {}}><Icon name="chevup" size={14} /></button>
                        <button className="btn ghost tiny" title="Xuống" disabled={i === banners.length - 1} onClick={() => move(n.id, 1)} style={i === banners.length - 1 ? { opacity: 0.4 } : {}}><Icon name="chevdown" size={14} /></button>
                      </div>
                    )}
                    <button className="btn ghost tiny" onClick={() => setEditor(n)}><Icon name="edit" size={14} /> Sửa</button>
                    <button className="btn ghost tiny" onClick={() => toggle(n)}><Icon name={n.status === "active" ? "eyeoff" : "eye"} size={14} /> {n.status === "active" ? "Ẩn" : "Hiện"}</button>
                    <button className="btn ghost tiny" style={{ marginLeft: "auto", color: "var(--hot)" }} onClick={() => setConfirmDel(n)}><Icon name="trash" size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editor && <BannerEditor initial={editor} onClose={() => setEditor(null)} onSaved={onSaved} />}
      {confirmDel && (
        <div className="modal-scrim" onClick={() => setConfirmDel(null)}>
          <div className="modal confirm" onClick={e => e.stopPropagation()}>
            <div className="ci"><Icon name="trash" size={26} /></div>
            <h3>Xoá banner?</h3>
            <p>Bạn sắp xoá banner này. Hành động này không thể hoàn tác.</p>
            <div className="row">
              <button className="btn ghost" onClick={() => setConfirmDel(null)}>Huỷ</button>
              <button className="btn danger" onClick={remove}><Icon name="trash" size={16} color="#fff" /> Xoá</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={"toast" + (toast.ok ? "" : " err")}><span className="tc"><Icon name={toast.ok ? "check" : "close"} size={15} color="#fff" /></span>{toast.m}</div>}

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand} options={[["#0F623F","#07432A"],["#005A36","#003D24"],["#7A4A28","#56331A"],["#6B4FA0","#4A357A"]]} onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
