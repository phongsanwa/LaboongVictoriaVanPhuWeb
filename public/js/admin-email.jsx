/* global React, ReactDOM, Icon, AdminSidebar */
const { useState, useEffect, useMemo, useRef } = React;

const DATA = window.ADMIN_EMAIL_DATA || {};
const URLS = DATA.urls || {};

function csrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

async function apiFetch(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Có lỗi xảy ra');
  return json;
}

/* ─── Trình soạn thảo HTML (TinyMCE), fallback textarea nếu CDN bị chặn ─── */
function RichEditor({ value, onChange, height = 320 }) {
  const ref = useRef(null);
  const edRef = useRef(null);

  useEffect(() => {
    const tiny = window.tinymce;
    if (!tiny || !ref.current) return; // fallback: textarea thường
    tiny.init({
      target: ref.current,
      height,
      menubar: false,
      language: 'vi',
      branding: false,
      plugins: 'lists link image table autolink code',
      toolbar: 'undo redo | blocks | bold italic underline forecolor | bullist numlist | link image table | alignleft aligncenter alignright | removeformat | code',
      relative_urls: false,
      convert_urls: false,
      paste_data_images: false,
      automatic_uploads: true,
      file_picker_types: 'image',
      // Kéo-thả / dán ảnh → tự upload lên server
      images_upload_handler: (blobInfo) => new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append('file', blobInfo.blob(), blobInfo.filename());
        fetch(URLS.uploadImage, { method: 'POST', headers: { 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json' }, body: fd })
          .then(r => r.json().then(j => r.ok ? resolve(j.url) : reject(j.message || 'Tải ảnh lỗi')))
          .catch(() => reject('Tải ảnh lỗi'));
      }),
      // Nút chọn ảnh từ máy ngay trong hộp thoại Insert/Edit Image
      file_picker_callback: (cb) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
          const file = input.files && input.files[0];
          if (!file) return;
          const fd = new FormData();
          fd.append('file', file);
          fetch(URLS.uploadImage, { method: 'POST', headers: { 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json' }, body: fd })
            .then(r => r.json())
            .then(j => { if (j.url) cb(j.url, { alt: file.name }); else alert(j.message || 'Tải ảnh lỗi'); })
            .catch(() => alert('Tải ảnh lỗi'));
        };
        input.click();
      },
      setup: (editor) => {
        edRef.current = editor;
        editor.on('init', () => editor.setContent(value || ''));
        editor.on('Change KeyUp Undo Redo SetContent', () => onChange(editor.getContent()));
      },
    });
    return () => { try { edRef.current?.remove(); } catch (e) { /* ignore */ } edRef.current = null; };
  }, []); // eslint-disable-line

  // Khi nội dung bị đổi từ ngoài (áp dụng mẫu) → đẩy vào editor
  useEffect(() => {
    const ed = edRef.current;
    if (ed && ed.initialized && value !== ed.getContent()) ed.setContent(value || '');
  }, [value]);

  return <textarea ref={ref} defaultValue={value}
    style={{ width: '100%', minHeight: height, padding: 12, borderRadius: 10, border: '1px solid var(--line,#ddd)', fontSize: 14, boxSizing: 'border-box' }} />;
}

/* ─── Modal soạn mẫu email ─── */
function TemplateEditor({ initial, onClose, onSaved }) {
  const isEdit = !!initial.id;
  const [name, setName] = useState(initial.name || '');
  const [subject, setSubject] = useState(initial.subject || '');
  const [body, setBody] = useState(initial.body || '');
  const [attachQr, setAttachQr] = useState(!!initial.attach_qr);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!name.trim() || !subject.trim()) { setErr('Nhập tên mẫu và tiêu đề.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = { name: name.trim(), subject: subject.trim(), body, attach_qr: attachQr };
      const res = isEdit
        ? await apiFetch('PUT', URLS.updateTemplate.replace('__ID__', initial.id), payload)
        : await apiFetch('POST', URLS.storeTemplate, payload);
      onSaved(res.template, isEdit);
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, width: '100%' }}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name={isEdit ? 'edit' : 'plus'} size={20} /></div>
          <div><h3>{isEdit ? 'Sửa mẫu email' : 'Thêm mẫu email'}</h3><p>Dùng lại nhanh khi gửi</p></div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-b">
          <div className="fld"><label>Tên mẫu</label>
            <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Khuyến mãi cuối tuần" autoFocus /></div>
          <div className="fld"><label>Tiêu đề email</label>
            <input className="inp" value={subject} onChange={e => setSubject(e.target.value)} placeholder="VD: 🧋 Ưu đãi đặc biệt cho {name}!" /></div>
          <div className="fld"><label>Nội dung</label>
            <RichEditor value={body} onChange={setBody} height={300} /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={attachQr} onChange={e => setAttachQr(e.target.checked)} style={{ accentColor: 'var(--brand)', width: 17, height: 17 }} />
            <span style={{ fontWeight: 700 }}>Kèm mã QR website</span>
          </label>
          {err && <div className="cp-err"><Icon name="alert" size={14} color="var(--hot)" /> {err}</div>}
        </div>
        <div className="modal-f">
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
          <button className="btn primary" onClick={save} disabled={saving}>
            <Icon name="check" size={16} color="#fff" /> {saving ? 'Đang lưu…' : (isEdit ? 'Lưu mẫu' : 'Thêm mẫu')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── App ─── */
function App() {
  const [tab, setTab] = useState('compose'); // compose | templates | history
  const [sideOpen, setSideOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [templates, setTemplates] = useState(DATA.templates || []);
  const [blasts, setBlasts] = useState(DATA.blasts || []);
  const customers = DATA.customers || [];
  const totalWithEmail = DATA.totalWithEmail || 0;

  // compose state
  const [tplId, setTplId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachQr, setAttachQr] = useState(false);
  const [when, setWhen] = useState('now');      // now | later
  const [scheduledAt, setScheduledAt] = useState('');
  const [audience, setAudience] = useState('all'); // all | selected
  const [selected, setSelected] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(null); // {total,sent,failed,pending,done}
  const [composeErr, setComposeErr] = useState('');

  const [tplEditor, setTplEditor] = useState(null);

  const flash = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const applyTemplate = (id) => {
    setTplId(id);
    if (!id) return;
    const t = templates.find(x => String(x.id) === String(id));
    if (t) { setSubject(t.subject || ''); setBody(t.body || ''); setAttachQr(!!t.attach_qr); }
  };

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q));
  }, [customers, search]);

  const toggleOne = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAllFiltered = () => setSelected(s => { const n = new Set(s); filteredCustomers.forEach(c => n.add(c.id)); return n; });
  const clearSelected = () => setSelected(new Set());

  const recipientCount = audience === 'all' ? totalWithEmail : selected.size;

  /* Gửi từng lô cho tới khi xong */
  const drive = async (id) => {
    let done = false;
    while (!done) {
      const p = await apiFetch('POST', URLS.sendChunk.replace('__ID__', id));
      setSending({ id, total: p.total, sent: p.sent, failed: p.failed, pending: p.pending, done: p.done });
      // cập nhật dòng lịch sử
      setBlasts(bs => bs.map(b => b.id === p.blast.id ? p.blast : b));
      done = p.done;
    }
  };

  const send = async () => {
    setComposeErr('');
    if (!subject.trim()) { setComposeErr('Vui lòng nhập tiêu đề email.'); return; }
    if (!body || !body.trim()) { setComposeErr('Vui lòng nhập nội dung email.'); return; }
    if (audience === 'selected' && selected.size === 0) { setComposeErr('Vui lòng chọn ít nhất một khách hàng.'); return; }
    if (when === 'later' && !scheduledAt) { setComposeErr('Vui lòng chọn thời gian hẹn gửi.'); return; }

    const scheduled = when === 'later';
    const msg = scheduled
      ? `Hẹn gửi email tới ${recipientCount} khách vào lúc đã chọn?`
      : `Gửi email tới ${recipientCount} khách hàng ngay bây giờ?`;
    if (!confirm(msg)) return;

    const payload = {
      subject: subject.trim(), body, attach_qr: attachQr, audience,
      customer_ids: audience === 'selected' ? [...selected] : [],
      scheduled_at: scheduled ? scheduledAt : null,
    };

    if (!scheduled) setSending({ total: recipientCount, sent: 0, failed: 0, pending: recipientCount, done: false });
    try {
      const res = await apiFetch('POST', URLS.createBlast, payload);
      setBlasts(bs => [res.blast, ...bs]);
      if (scheduled) {
        setSending(null);
        flash('Đã lên lịch gửi email. Hệ thống sẽ tự gửi khi tới giờ.');
        setTab('history');
      } else {
        await drive(res.blast.id);
        flash('Đã gửi xong email.');
      }
    } catch (e) {
      setSending(null);
      setComposeErr(e.message);
      flash('Không gửi được: ' + e.message, false);
    }
  };

  const sendTest = async () => {
    setComposeErr('');
    if (!subject.trim() || !body.trim()) { setComposeErr('Nhập tiêu đề và nội dung trước khi gửi thử.'); return; }
    try {
      const res = await apiFetch('POST', URLS.test, { subject: subject.trim(), body, attach_qr: attachQr });
      flash(res.message || 'Đã gửi email thử.');
    } catch (e) { flash(e.message, false); }
  };

  const resume = async (b) => {
    try { setSending({ total: b.total, sent: b.sent, failed: b.failed, pending: b.pending, done: false }); await drive(b.id); flash('Đã gửi tiếp xong.'); }
    catch (e) { flash(e.message, false); }
  };

  const delBlast = async (b) => {
    if (!confirm('Xoá lịch sử gửi này?')) return;
    try { await apiFetch('DELETE', URLS.destroyBlast.replace('__ID__', b.id)); setBlasts(bs => bs.filter(x => x.id !== b.id)); flash('Đã xoá.'); }
    catch (e) { flash(e.message, false); }
  };

  const delTemplate = async (t) => {
    if (!confirm(`Xoá mẫu "${t.name}"?`)) return;
    try { await apiFetch('DELETE', URLS.destroyTemplate.replace('__ID__', t.id)); setTemplates(ts => ts.filter(x => x.id !== t.id)); flash('Đã xoá mẫu.'); }
    catch (e) { flash(e.message, false); }
  };

  const onTplSaved = (tpl, isEdit) => {
    setTemplates(ts => isEdit ? ts.map(x => x.id === tpl.id ? tpl : x) : [tpl, ...ts]);
    setTplEditor(null);
    flash(isEdit ? 'Đã cập nhật mẫu.' : 'Đã thêm mẫu.');
  };

  const statusBadge = (s) => {
    const map = { scheduled: ['Đã lên lịch', 'var(--brand,#0F623F)'], sending: ['Đang gửi', 'var(--warn,#b8860b)'], sent: ['Đã gửi', 'var(--ok,#0a7d3f)'], partial: ['Còn lỗi', 'var(--hot,#e53)'] };
    const [label, color] = map[s] || [s, 'var(--ink-2)'];
    return <span style={{ fontSize: 12, fontWeight: 700, color, background: 'rgba(0,0,0,.04)', padding: '3px 9px', borderRadius: 999 }}>{label}</span>;
  };

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Email" admin={DATA.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="mail" size={19} /></button>
          <div>
            <div className="crumb">Quản lý · Email</div>
            <h1>Gửi email cho khách hàng</h1>
          </div>
          <div className="topbar-spacer" />
        </header>

        <div className="content">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {[['compose', 'Soạn & Gửi', 'send'], ['templates', 'Mẫu email', 'copy'], ['history', 'Lịch sử gửi', 'receipt']].map(([key, label, ic]) => (
              <button key={key} onClick={() => setTab(key)}
                className={'btn' + (tab === key ? ' primary' : ' ghost')}
                style={{ borderRadius: 999 }}>
                <Icon name={ic} size={15} color={tab === key ? '#fff' : 'currentColor'} /> {label}
              </button>
            ))}
          </div>

          {/* ─── TAB: Soạn & Gửi ─── */}
          {tab === 'compose' && (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0,1fr)' }}>
              <div className="card" style={{ padding: 18, background: 'var(--card,#fff)', borderRadius: 14, border: '1px solid var(--line,#eee)' }}>
                <div className="fld">
                  <label>Dùng mẫu có sẵn (không bắt buộc)</label>
                  <select className="inp" value={tplId} onChange={e => applyTemplate(e.target.value)}>
                    <option value="">— Không dùng mẫu —</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="fld"><label>Tiêu đề email</label>
                  <input className="inp" value={subject} onChange={e => setSubject(e.target.value)} placeholder="VD: 🧋 Ưu đãi đặc biệt cho {name}!" /></div>
                <div className="fld"><label>Nội dung</label>
                  <RichEditor value={body} onChange={setBody} height={340} /></div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '2px 0 4px', fontSize: 12.5, color: 'var(--ink-2)' }}>
                  <span style={{ fontWeight: 700 }}>Chèn thông tin khách:</span>
                  {(DATA.tokens || []).map(t => (
                    <span key={t.token} title={t.desc}
                      style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand)', background: 'var(--brand-soft,rgba(15,98,63,.08))', padding: '3px 8px', borderRadius: 8 }}>
                      {t.token}
                    </span>
                  ))}
                  <span>— gõ trực tiếp vào tiêu đề/nội dung, hệ thống tự thay khi gửi.</span>
                </div>

                {/* Kèm mã QR */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={attachQr} onChange={e => setAttachQr(e.target.checked)} style={{ accentColor: 'var(--brand)', width: 17, height: 17 }} />
                  <span style={{ fontWeight: 700 }}>Kèm mã QR website</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>— chèn ảnh QR để khách quét mở web</span>
                </label>
              </div>

              {/* Thời điểm gửi */}
              <div className="card" style={{ padding: 18, background: 'var(--card,#fff)', borderRadius: 14, border: '1px solid var(--line,#eee)' }}>
                <div style={{ fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="cal" size={18} color="var(--brand)" /> Thời điểm gửi
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[['now', 'Gửi ngay'], ['later', 'Lên lịch']].map(([k, label]) => (
                    <label key={k} style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1.5px solid ${when === k ? 'var(--brand)' : 'var(--line)'}`, borderRadius: 10, cursor: 'pointer', background: when === k ? 'var(--brand-soft)' : 'transparent' }}>
                      <input type="radio" checked={when === k} onChange={() => setWhen(k)} style={{ accentColor: 'var(--brand)' }} />
                      <span style={{ fontWeight: 700 }}>{label}</span>
                    </label>
                  ))}
                </div>
                {when === 'later' && (
                  <div className="fld" style={{ marginTop: 12, marginBottom: 0 }}>
                    <label>Gửi vào lúc (giờ Việt Nam)</label>
                    <input type="datetime-local" className="inp" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6 }}>
                      Hệ thống sẽ tự gửi khi tới giờ (không cần mở trang). Cần bật cron trên máy chủ.
                    </div>
                  </div>
                )}
              </div>

              {/* Người nhận */}
              <div className="card" style={{ padding: 18, background: 'var(--card,#fff)', borderRadius: 14, border: '1px solid var(--line,#eee)' }}>
                <div style={{ fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="users" size={18} color="var(--brand)" /> Người nhận
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1.5px solid ${audience === 'all' ? 'var(--brand)' : 'var(--line)'}`, borderRadius: 10, cursor: 'pointer', marginBottom: 8, background: audience === 'all' ? 'var(--brand-soft)' : 'transparent' }}>
                  <input type="radio" checked={audience === 'all'} onChange={() => setAudience('all')} style={{ accentColor: 'var(--brand)' }} />
                  <span style={{ fontWeight: 700 }}>Tất cả khách có email</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--brand)' }}>{totalWithEmail}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1.5px solid ${audience === 'selected' ? 'var(--brand)' : 'var(--line)'}`, borderRadius: 10, cursor: 'pointer', background: audience === 'selected' ? 'var(--brand-soft)' : 'transparent' }}>
                  <input type="radio" checked={audience === 'selected'} onChange={() => setAudience('selected')} style={{ accentColor: 'var(--brand)' }} />
                  <span style={{ fontWeight: 700 }}>Chọn khách hàng cụ thể</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--brand)' }}>{selected.size}</span>
                </label>

                {audience === 'selected' && (
                  <div style={{ marginTop: 12 }}>
                    <div className="searchbox" style={{ marginBottom: 8 }}>
                      <Icon name="search" size={17} color="var(--ink-3)" />
                      <input placeholder="Tìm theo tên, email, SĐT…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <button className="btn ghost tiny" onClick={selectAllFiltered}>Chọn tất cả ({filteredCustomers.length})</button>
                      <button className="btn ghost tiny" onClick={clearSelected}>Bỏ chọn</button>
                    </div>
                    <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--line,#eee)', borderRadius: 10 }}>
                      {filteredCustomers.length === 0 && <div style={{ padding: 16, color: 'var(--ink-3)', textAlign: 'center' }}>Không có khách phù hợp.</div>}
                      {filteredCustomers.map(c => (
                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--line,#f2f2f2)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} style={{ accentColor: 'var(--brand)' }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}{c.phone ? ' · ' + c.phone : ''}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {composeErr && <div className="cp-err"><Icon name="alert" size={14} color="var(--hot)" /> {composeErr}</div>}

              {/* Thanh tiến trình khi gửi */}
              {sending && (
                <div className="card" style={{ padding: 16, background: 'var(--card,#fff)', borderRadius: 14, border: '1px solid var(--line,#eee)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 8 }}>
                    <span>{sending.done ? 'Hoàn tất' : 'Đang gửi…'}</span>
                    <span>{sending.sent}/{sending.total} · lỗi {sending.failed}</span>
                  </div>
                  <div style={{ height: 10, background: 'var(--bg-2,#eee)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${sending.total ? Math.round((sending.sent + sending.failed) / sending.total * 100) : 0}%`, background: 'linear-gradient(90deg,#0F623F,#1AA86A)', transition: 'width .3s' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn ghost" onClick={sendTest} disabled={!!sending && !sending.done}>
                  <Icon name="eye" size={16} /> Gửi thử về email của tôi
                </button>
                <button className="btn primary" onClick={send} disabled={!!sending && !sending.done} style={{ marginLeft: 'auto' }}>
                  <Icon name={when === 'later' ? 'cal' : 'send'} size={16} color="#fff" /> {when === 'later' ? `Lên lịch gửi tới ${recipientCount} khách` : `Gửi tới ${recipientCount} khách`}
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB: Mẫu email ─── */}
          {tab === 'templates' && (
            <div>
              <button className="btn primary" style={{ marginBottom: 14 }} onClick={() => setTplEditor({})}>
                <Icon name="plus" size={16} color="#fff" /> Thêm mẫu
              </button>
              {templates.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Chưa có mẫu email nào.</div>}
              <div style={{ display: 'grid', gap: 10 }}>
                {templates.map(t => (
                  <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--card,#fff)', borderRadius: 12, border: '1px solid var(--line,#eee)' }}>
                    <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--brand-soft,rgba(15,98,63,.08))', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon name="mail" size={18} color="var(--brand)" />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</div>
                    </div>
                    <button className="vopt-edit" title="Dùng mẫu này" onClick={() => { applyTemplate(String(t.id)); setTab('compose'); }}><Icon name="send" size={15} /></button>
                    <button className="vopt-edit" title="Sửa" onClick={() => setTplEditor(t)}><Icon name="edit" size={15} /></button>
                    <button className="vopt-edit del" title="Xoá" onClick={() => delTemplate(t)}><Icon name="trash" size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB: Lịch sử gửi ─── */}
          {tab === 'history' && (
            <div>
              {blasts.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>Chưa gửi email nào.</div>}
              <div style={{ display: 'grid', gap: 10 }}>
                {blasts.map(b => (
                  <div key={b.id} className="card" style={{ padding: 14, background: 'var(--card,#fff)', borderRadius: 12, border: '1px solid var(--line,#eee)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.subject}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                          {b.status === 'scheduled' && b.scheduled_at
                            ? <><Icon name="cal" size={12} /> Hẹn gửi lúc {b.scheduled_at} · </>
                            : null}
                          {b.created_at} · {b.audience === 'all' ? 'Tất cả' : 'Chọn lọc'} · {b.sent}/{b.total} đã gửi{b.failed ? ` · ${b.failed} lỗi` : ''}{b.attach_qr ? ' · có QR' : ''}
                        </div>
                      </div>
                      {statusBadge(b.status)}
                      {b.status !== 'scheduled' && b.pending > 0 && (
                        <button className="btn primary tiny" onClick={() => resume(b)} disabled={!!sending && !sending.done}>Gửi tiếp ({b.pending})</button>
                      )}
                      <button className="vopt-edit del" title="Xoá" onClick={() => delBlast(b)}><Icon name="trash" size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {tplEditor !== null && <TemplateEditor initial={tplEditor} onClose={() => setTplEditor(null)} onSaved={onTplSaved} />}

      {toast && (
        <div className="toast">
          <span className="tc" style={{ background: toast.ok ? 'var(--ok)' : 'var(--danger)' }}>
            <Icon name={toast.ok ? 'check' : 'close'} size={15} color="#fff" />
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
