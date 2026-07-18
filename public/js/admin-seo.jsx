/* global React, ReactDOM, Icon, AdminSidebar, ADMIN_SEO_DATA, useTweaks, TweaksPanel, TweakSection, TweakColor */
const { useState } = React;

const DATA = window.ADMIN_SEO_DATA || { admin: null, pages: [], og_image: '', urls: {} };

function csrfToken() {
  const m = document.querySelector('meta[name="csrf-token"]');
  return m ? m.content : "";
}

const TW_DEFAULTS = { brand: "#0F623F" };

/* Đếm ký tự với ngưỡng khuyến nghị (title ≤60, desc ≤160) */
function CharCount({ value, ideal }) {
  const n = (value || '').length;
  const over = n > ideal;
  return (
    <span style={{ fontSize: 11, color: over ? 'var(--hot, #E0518A)' : 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
      {n}/{ideal}{over ? ' — hơi dài, Google có thể cắt bớt' : ''}
    </span>
  );
}

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [sideOpen, setSideOpen] = useState(false);
  const [pages, setPages] = useState(DATA.pages);
  const [ogImage, setOgImage] = useState(DATA.og_image || '');
  const [ogPreview, setOgPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const setPage = (key, field, val) =>
    setPages(ps => ps.map(p => p.key === key ? { ...p, [field]: val } : p));

  const onOgFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setOgPreview(URL.createObjectURL(f));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", f);
      const res = await fetch(DATA.urls.upload, {
        method: "POST",
        headers: { "X-CSRF-TOKEN": csrfToken(), "Accept": "application/json" },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) { setOgImage(data.url); }
      else { setOgPreview(null); flash(data.message || "Tải ảnh thất bại"); }
    } catch (_) { setOgPreview(null); flash("Tải ảnh thất bại, thử lại nhé"); }
    setUploading(false);
  };

  const save = async () => {
    if (saving || uploading) return;
    setSaving(true);
    try {
      const body = {
        og_image: ogImage && !ogImage.startsWith("blob:") ? ogImage : null,
        pages: Object.fromEntries(pages.map(p => [p.key, { title: p.title, desc: p.desc, index: !!p.index }])),
      };
      const res = await fetch(DATA.urls.update, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-TOKEN": csrfToken() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      flash(res.ok ? (data.message || "Đã lưu") : (data.message || "Có lỗi xảy ra"));
    } catch (_) { flash("Lỗi kết nối, vui lòng thử lại"); }
    setSaving(false);
  };

  const shownOg = ogPreview || ogImage;

  return (
    <div className="layout" style={{ "--brand": tw.brand }}>
      <AdminSidebar activeLabel="SEO" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div>
            <div className="tb-title">Quản lý SEO</div>
            <div className="tb-sub">Tiêu đề, mô tả tìm kiếm và ảnh chia sẻ của từng trang</div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn primary" disabled={saving || uploading} onClick={save}>
            <Icon name="check" size={16} color="#fff" /> {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </header>

        <div className="content" style={{ maxWidth: 860 }}>

          {/* ── Ảnh chia sẻ mạng xã hội ── */}
          <section className="card" style={{ padding: 20, marginBottom: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Ảnh chia sẻ (og:image)</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 12 }}>
              Hiện khi link web được chia sẻ lên Facebook, Zalo, Messenger… Khuyến nghị 1200×630px, tối đa 3MB.
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{
                width: 240, height: 126, borderRadius: 12, flexShrink: 0,
                background: shownOg ? `url(${shownOg}) center/cover` : "linear-gradient(150deg,#0F623F,#1AA86A)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid var(--line, #E5E7EB)",
              }}>
                {!shownOg && <Icon name="image" size={30} color="#fff" />}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label className="btn secondary" style={{ cursor: uploading ? "wait" : "pointer", opacity: uploading ? .6 : 1 }}>
                  <Icon name="image" size={15} /> {uploading ? "Đang tải…" : shownOg ? "Đổi ảnh" : "Tải ảnh lên"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onOgFile} disabled={uploading} />
                </label>
                {ogImage && !uploading && (
                  <button className="btn ghost" onClick={() => { setOgImage(''); setOgPreview(null); }}>Bỏ ảnh (dùng mặc định)</button>
                )}
              </div>
            </div>
          </section>

          {/* ── SEO từng trang ── */}
          {pages.map(p => (
            <section key={p.key} className="card" style={{ padding: 20, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{p.label}</div>
                <span style={{ fontSize: 11, color: "var(--ink-3)", background: "var(--bg-2, #F3F4F6)", borderRadius: 6, padding: "2px 8px" }}>/{p.key === 'home' ? '' : p.key}</span>
                <div style={{ flex: 1 }} />
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer", userSelect: "none" }}
                  onClick={() => setPage(p.key, "index", !p.index)}>
                  <span style={{ color: p.index ? "var(--brand)" : "var(--ink-3)", fontWeight: 600 }}>
                    {p.index ? "Cho phép Google index" : "Đang chặn index"}
                  </span>
                  <span className={"switch" + (p.index ? " on" : "")} />
                </label>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-2)" }}>Tiêu đề (og:title)</label>
                    <CharCount value={p.title || p.defaultTitle} ideal={60} />
                  </div>
                  <input className="inp" style={{ width: "100%", boxSizing: "border-box" }}
                    placeholder={p.defaultTitle} value={p.title}
                    onChange={e => setPage(p.key, "title", e.target.value)} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-2)" }}>Mô tả (meta description)</label>
                    <CharCount value={p.desc || p.defaultDesc} ideal={160} />
                  </div>
                  <textarea className="inp" rows={2} style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
                    placeholder={p.defaultDesc} value={p.desc}
                    onChange={e => setPage(p.key, "desc", e.target.value)} />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                  Để trống = dùng nội dung mặc định (hiện trong ô mờ).
                </div>
              </div>

              {/* Xem trước kết quả Google */}
              <div style={{ marginTop: 14, background: "var(--bg-2, #F9FAFB)", borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>Xem trước trên Google</div>
                <div style={{ color: "#1a0dab", fontSize: 16, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.title || p.defaultTitle}
                </div>
                <div style={{ color: "#006621", fontSize: 12, margin: "2px 0" }}>{location.origin}/{p.key === 'home' ? '' : p.key}</div>
                <div style={{ color: "#545454", fontSize: 13, lineHeight: 1.45 }}>
                  {(p.desc || p.defaultDesc).slice(0, 160)}{(p.desc || p.defaultDesc).length > 160 ? '…' : ''}
                </div>
              </div>
            </section>
          ))}

        </div>
      </main>

      {toast && <div className="toast on">{toast}</div>}

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F", "#07432A"], ["#005A36", "#003D24"], ["#3E5C8A", "#2A4063"], ["#6B4FA0", "#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
