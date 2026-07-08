/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle, AdminSidebar */
const { useState, useEffect, useMemo, useRef } = React;

const DATA = window.ADMIN_NEWS_DATA || { admin: null, news: [], urls: {} };
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

async function uploadFile(kind, file) {
  const fd = new FormData();
  fd.append('kind', kind);
  fd.append('file', file);
  const res = await fetch(URLS.upload, {
    method: 'POST', headers: { 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json' }, body: fd,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Tải lên thất bại');
  return json.url;
}

function ytId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}
function ytThumb(url) { const id = ytId(url); return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null; }

const MEDIA_TYPES = [
  { key: 'image',   label: 'Ảnh',        ic: 'image' },
  { key: 'video',   label: 'Video',      ic: 'play' },
  { key: 'youtube', label: 'YouTube',    ic: 'play' },
];

/* ─── Editor ─── */
function NewsEditor({ initial, onClose, onSaved }) {
  const isEdit = !!initial.id;
  const [title, setTitle]     = useState(initial.title || "");
  const [excerpt, setExcerpt] = useState(initial.excerpt || "");
  const [body, setBody]       = useState(initial.body || "");
  const [mediaType, setMediaType] = useState(initial.media_type || "image");
  const [imageUrl, setImageUrl]   = useState(initial.image_url || null);
  const [videoUrl, setVideoUrl]   = useState(initial.video_url || null);
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtube_url || "");
  const [active, setActive]   = useState(initial.status ? initial.status === "active" : true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const imgRef = useRef(null);
  const vidRef = useRef(null);
  const bodyRef = useRef(null);
  const editorRef = useRef(null);

  /* TinyMCE cho ô nội dung — có fallback textarea nếu CDN bị chặn */
  useEffect(() => {
    const tiny = window.tinymce;
    if (!tiny || !bodyRef.current) return; // fallback: dùng textarea thường
    tiny.init({
      target: bodyRef.current,
      height: 340,
      menubar: false,
      language: 'vi',
      branding: false,
      plugins: 'lists link image media table autolink paste code',
      toolbar: 'undo redo | blocks | bold italic underline | bullist numlist | link image media table | alignleft aligncenter alignright | removeformat | code',
      automatic_uploads: true,
      paste_data_images: false,
      relative_urls: false,
      convert_urls: false,
      // Cho phép sửa HTML trực tiếp (nút </> Source code) và giữ iframe nhúng
      extended_valid_elements: 'iframe[src|width|height|frameborder|allow|allowfullscreen|loading|referrerpolicy|style|class|title]',
      valid_children: '+body[iframe]',
      images_upload_handler: (blobInfo) => new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append('kind', 'image');
        fd.append('file', blobInfo.blob(), blobInfo.filename());
        fetch(URLS.upload, { method: 'POST', headers: { 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json' }, body: fd })
          .then(r => r.json().then(j => r.ok ? resolve(j.url) : reject(j.message || 'Tải ảnh lỗi')))
          .catch(() => reject('Tải ảnh lỗi'));
      }),
      setup: (editor) => {
        editorRef.current = editor;
        editor.on('init', () => editor.setContent(initial.body || ''));
        editor.on('Change KeyUp Undo Redo SetContent', () => setBody(editor.getContent()));
      },
    });
    return () => { try { editorRef.current?.remove(); } catch (e) { /* ignore */ } editorRef.current = null; };
  }, []); // eslint-disable-line

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const onImg = async (e) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = "";
    setErr(""); setUploading(true);
    try { setImageUrl(await uploadFile('image', f)); } catch (x) { setErr(x.message); }
    setUploading(false);
  };
  const onVid = async (e) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = "";
    setErr(""); setUploading(true);
    try { setVideoUrl(await uploadFile('video', f)); } catch (x) { setErr(x.message); }
    setUploading(false);
  };

  const valid = title.trim()
    && (mediaType !== 'image'   || !!imageUrl)
    && (mediaType !== 'video'   || !!videoUrl)
    && (mediaType !== 'youtube' || !!ytId(youtubeUrl));

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true); setErr("");
    try {
      const payload = {
        title: title.trim(), excerpt: excerpt.trim(), body,
        media_type: mediaType,
        image_url: imageUrl || null,
        video_url: mediaType === 'video' ? videoUrl : null,
        youtube_url: mediaType === 'youtube' ? youtubeUrl.trim() : null,
        status: active ? 'active' : 'inactive',
      };
      const json = isEdit
        ? await apiJson('POST', URLS.update.replace('__ID__', initial.id), payload)
        : await apiJson('POST', URLS.store, payload);
      onSaved(json.news, isEdit);
    } catch (x) { setErr(x.message); }
    setSaving(false);
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name={isEdit ? "edit" : "plus"} size={20} /></div>
          <div><h3>{isEdit ? "Sửa tin tức" : "Thêm tin tức"}</h3><p>Tin sẽ hiển thị ngoài trang chủ cho khách hàng</p></div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-b" style={{ overflowY: "auto", flex: 1 }}>
          <div className="fld">
            <label>Tiêu đề</label>
            <input className="inp" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Laboong ra mắt vị mới mùa hè" autoFocus />
          </div>

          <div className="fld">
            <label>Tóm tắt ngắn (hiển thị trên thẻ)</label>
            <input className="inp" value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Một câu mô tả ngắn gọn…" maxLength={500} />
          </div>

          <div className="fld">
            <label>Loại nội dung</label>
            <div className="cat-pick">
              {MEDIA_TYPES.map(m => (
                <button key={m.key} className={"cat-opt" + (mediaType === m.key ? " on" : "")} onClick={() => { setMediaType(m.key); setErr(""); }}>
                  <span className="ci"><Icon name={m.ic} size={15} color="currentColor" /></span> {m.label}
                </button>
              ))}
            </div>
          </div>

          {mediaType === 'image' && (
            <div className="fld">
              <label>Ảnh <span style={{ color: "var(--hot)", fontWeight: 700 }}>*</span></label>
              {imageUrl && <img src={imageUrl} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12, marginBottom: 8 }} />}
              <button className="btn ghost" onClick={() => imgRef.current?.click()} disabled={uploading}>
                <Icon name="image" size={15} /> {uploading ? "Đang tải…" : imageUrl ? "Đổi ảnh" : "Tải ảnh lên"}
              </button>
              <input ref={imgRef} type="file" accept="image/*" hidden onChange={onImg} />
            </div>
          )}

          {mediaType === 'video' && (
            <div className="fld">
              <label>Video <span style={{ color: "var(--hot)", fontWeight: 700 }}>*</span></label>
              {videoUrl && <video src={videoUrl} controls style={{ width: "100%", maxHeight: 240, borderRadius: 12, marginBottom: 8, background: "#000" }} />}
              <button className="btn ghost" onClick={() => vidRef.current?.click()} disabled={uploading}>
                <Icon name="play" size={15} /> {uploading ? "Đang tải…" : videoUrl ? "Đổi video" : "Tải video lên (MP4, ≤ 60MB)"}
              </button>
              <input ref={vidRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={onVid} />
              <div className="fld" style={{ marginTop: 12 }}>
                <label>Ảnh bìa (không bắt buộc)</label>
                {imageUrl && <img src={imageUrl} alt="" style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 8, marginBottom: 6, display: "block" }} />}
                <button className="btn ghost" onClick={() => imgRef.current?.click()} disabled={uploading}><Icon name="image" size={14} /> Ảnh bìa</button>
                <input ref={imgRef} type="file" accept="image/*" hidden onChange={onImg} />
              </div>
            </div>
          )}

          {mediaType === 'youtube' && (
            <div className="fld">
              <label>Link YouTube <span style={{ color: "var(--hot)", fontWeight: 700 }}>*</span></label>
              <input className="inp" value={youtubeUrl} onChange={e => { setYoutubeUrl(e.target.value); setErr(""); }}
                placeholder="https://www.youtube.com/watch?v=..." />
              {ytId(youtubeUrl)
                ? <img src={ytThumb(youtubeUrl)} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12, marginTop: 8 }} />
                : youtubeUrl && <div style={{ fontSize: 12, color: "var(--hot)", marginTop: 6 }}>Link YouTube chưa hợp lệ</div>}
            </div>
          )}

          <div className="fld">
            <label>Nội dung bài viết</label>
            <textarea ref={bodyRef} className="inp" defaultValue={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Nội dung chi tiết của tin tức…" style={{ resize: "vertical", minHeight: 160 }} />
          </div>

          {err && <div style={{ color: "var(--hot)", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{err}</div>}

          <div className="switch-row" onClick={() => setActive(a => !a)} style={{ cursor: "pointer" }}>
            <div><div className="sl">Hiển thị: {active ? "Đang bật" : "Đang ẩn"}</div><div className="sd">{active ? "Tin hiển thị ngoài trang chủ" : "Ẩn khỏi trang chủ"}</div></div>
            <div className={"switch" + (active ? " on" : "")} />
          </div>
        </div>

        <div className="modal-f">
          <button className="btn ghost" style={{ flex: ".6" }} onClick={onClose}>Huỷ</button>
          <button className="btn primary" disabled={!valid || saving || uploading} onClick={submit}>
            <Icon name="check" size={17} color="#fff" /> {saving ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Đăng tin"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── App ─── */
function App() {
  const [tw, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{ "brand": ["#0F623F", "#07432A"], "dark": false }/*EDITMODE-END*/);
  const [news, setNews] = useState(DATA.news || []);
  const [editor, setEditor] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b); r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const flash = (m, ok = true) => { setToast({ m, ok }); setTimeout(() => setToast(null), 2600); };

  const onSaved = (item, isEdit) => {
    setNews(list => isEdit ? list.map(n => n.id === item.id ? item : n) : [item, ...list]);
    setEditor(null);
    flash(isEdit ? "Đã cập nhật tin" : "Đã đăng tin mới");
  };

  const toggle = async (n) => {
    try {
      const json = await apiJson('POST', URLS.toggle.replace('__ID__', n.id), null);
      setNews(list => list.map(x => x.id === n.id ? json.news : x));
    } catch (e) { flash(e.message, false); }
  };

  const remove = async () => {
    const n = confirmDel; setConfirmDel(null);
    try {
      await apiJson('DELETE', URLS.destroy.replace('__ID__', n.id), null);
      setNews(list => list.filter(x => x.id !== n.id));
      flash("Đã xoá tin");
    } catch (e) { flash(e.message, false); }
  };

  const admin = DATA.admin || { name: "Quản trị viên", email: "", initials: "QT" };
  const cover = (n) => n.image_url || (n.media_type === 'youtube' && n.youtube_id ? `https://img.youtube.com/vi/${n.youtube_id}/hqdefault.jpg` : null);

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Tin tức" badges={{ "Tin tức": String(news.length) }} admin={admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div><div className="crumb">Quản lý · Tin tức</div><h1>Quản lý tin tức</h1></div>
          <div className="topbar-spacer" />
          <button className="btn primary" onClick={() => setEditor({})}><Icon name="plus" size={16} color="#fff" /> Thêm tin</button>
        </header>

        <div className="content">
          {news.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "var(--ink-3)" }}>
              <div style={{ marginBottom: 12 }}><Icon name="star" size={40} /></div>
              Chưa có tin tức nào. Bấm “Thêm tin” để đăng tin đầu tiên.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {news.map(n => (
              <div key={n.id} style={{ background: "var(--panel)", border: "1px solid var(--line-2)", borderRadius: 16, overflow: "hidden", opacity: n.status === "active" ? 1 : 0.6 }}>
                <div style={{ position: "relative", height: 160, background: "linear-gradient(135deg,#0F623F,#1AA86A)" }}>
                  {cover(n) && <img src={cover(n)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon name={n.media_type === 'image' ? 'image' : 'play'} size={11} color="#fff" /> {n.media_type === 'image' ? 'Ảnh' : n.media_type === 'video' ? 'Video' : 'YouTube'}
                  </span>
                  <span style={{ position: "absolute", top: 10, right: 10, background: n.status === "active" ? "var(--brand)" : "var(--ink-3)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999 }}>
                    {n.status === "active" ? "Đang hiện" : "Đang ẩn"}
                  </span>
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, lineHeight: 1.35 }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.excerpt || (n.body || "").replace(/<[^>]+>/g, " ").trim()}</div>
                  {n.published_at && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 10 }}>{n.published_at}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
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

      {editor && <NewsEditor initial={editor} onClose={() => setEditor(null)} onSaved={onSaved} />}
      {confirmDel && (
        <div className="modal-scrim" onClick={() => setConfirmDel(null)}>
          <div className="modal confirm" onClick={e => e.stopPropagation()}>
            <div className="ci"><Icon name="trash" size={26} /></div>
            <h3>Xoá tin tức?</h3>
            <p>Bạn sắp xoá <b>{confirmDel.title}</b>. Hành động này không thể hoàn tác.</p>
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
