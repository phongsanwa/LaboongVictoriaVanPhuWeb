/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useRef, useMemo } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

/* ---------------- backend API helpers ---------------- */
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

const PROFILE = window.PROFILE_DATA || {};
const MEMBER = { tier: PROFILE.member?.tier || "", id: PROFILE.member?.id || "", phone: PROFILE.member?.phone || "", av: "linear-gradient(140deg,#0F623F,#1AA86A)" };

const MENU = [
  { id: "m1", name: "Trà sữa trân châu ĐĐ", cat: "Trà sữa", ic: "cup", grad: "linear-gradient(135deg,#6B4A2B,#A9743F)" },
  { id: "m2", name: "Macchiato kem phô mai", cat: "Trà sữa", ic: "cup", grad: "linear-gradient(135deg,#C99A2E,#E0B84A)" },
  { id: "m3", name: "Trà đào cam sả", cat: "Trà trái cây", ic: "cup", grad: "linear-gradient(135deg,#FF8A5B,#FFB13D)" },
  { id: "m4", name: "Trà sữa khoai môn", cat: "Trà sữa", ic: "cup", grad: "linear-gradient(135deg,#9B7FD4,#6B4FA0)" },
  { id: "m5", name: "Hồng trà sữa", cat: "Trà sữa", ic: "cup", grad: "linear-gradient(135deg,#D4584B,#F2826F)" },
  { id: "m6", name: "Trà vải hạt sen", cat: "Trà trái cây", ic: "cup", grad: "linear-gradient(135deg,#E0518A,#FF6FA5)" },
  { id: "m7", name: "Cà phê sữa đá", cat: "Cà phê", ic: "cup", grad: "linear-gradient(135deg,#3E2A1B,#6B4A2B)" },
  { id: "m8", name: "Sữa tươi trân châu ĐĐ", cat: "Sữa tươi", ic: "cup", grad: "linear-gradient(135deg,#1E8FA8,#4FC3D9)" },
];

const INITIAL = {
  name: PROFILE.member?.name || "",
  email: PROFILE.member?.email || "",
  dob: PROFILE.member?.dob || "",
  avatar: PROFILE.member?.avatar_url || null,
  addresses: PROFILE.addresses || [],
  favorites: PROFILE.favorites || [],
};

function initials(n) { const p = n.trim().split(/\s+/); return ((p[0]?.[0] || "") + (p[p.length - 1]?.[0] || "")).toUpperCase(); }
function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [data, setData] = useState(INITIAL);
  const [saved, setSaved] = useState(INITIAL);
  const [toast, setToast] = useState(null);
  const [addrModal, setAddrModal] = useState(null); // {edit?, label, name, text, def}
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(saved), [data, saved]);
  const emailOk = validateEmail(data.email);
  const nameOk = data.name.trim().length >= 2;

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  const logout = async (e) => {
    e.preventDefault();
    await apiCall("POST", "/logout");
    location.href = NAV_URLS.login;
  };

  const onAvatar = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    e.target.value = "";
    // preview locally first
    const reader = new FileReader();
    reader.onload = () => setData(d => ({ ...d, avatar: reader.result }));
    reader.readAsDataURL(f);
    // upload to server
    setAvatarUploading(true);
    const form = new FormData();
    form.append("avatar", f);
    form.append("_token", document.querySelector('meta[name="csrf-token"]')?.content || "");
    try {
      const res = await fetch("/profile/avatar", { method: "POST", body: form, headers: { "Accept": "application/json", "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content || "" } });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setData(d => ({ ...d, avatar: body.avatar_url }));
        setSaved(s => ({ ...s, avatar: body.avatar_url }));
        flash("Đã cập nhật ảnh đại diện");
      } else {
        flash(body.message || "Không thể tải ảnh lên, vui lòng thử lại");
        setData(d => ({ ...d, avatar: saved.avatar }));
      }
    } catch {
      flash("Lỗi kết nối, vui lòng thử lại");
      setData(d => ({ ...d, avatar: saved.avatar }));
    }
    setAvatarUploading(false);
  };

  const save = async () => {
    if (!emailOk || !nameOk) return;
    const { ok, data: res } = await apiCall("PUT", "/profile", { name: data.name, email: data.email, dob: data.dob, favorites: data.favorites });
    if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại."); return; }
    setSaved(data);
    flash(res.message || "Đã lưu thông tin cá nhân");
  };
  const discard = () => setData(saved);

  const toggleFav = (id) => setData(d => ({ ...d, favorites: d.favorites.includes(id) ? d.favorites.filter(x => x !== id) : [...d.favorites, id] }));

  const setAddresses = (addresses) => {
    setData(d => ({ ...d, addresses }));
    setSaved(s => ({ ...s, addresses }));
  };

  const delAddr = async (id) => {
    const { ok, data: res } = await apiCall("DELETE", `/profile/addresses/${id}`);
    if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại."); return; }
    setAddresses(data.addresses.filter(a => a.id !== id));
    flash(res.message || "Đã xoá địa chỉ");
  };

  const setDefault = async (id) => {
    const { ok, data: res } = await apiCall("POST", `/profile/addresses/${id}/default`);
    if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại."); return; }
    setAddresses(data.addresses.map(a => ({ ...a, def: a.id === id })));
    flash(res.message || "Đã đặt địa chỉ mặc định");
  };

  const saveAddr = async (form) => {
    const payload = { label: form.label, name: form.name, text: form.text, def: form.def, lat: form.lat || null, lng: form.lng || null };
    const { ok, data: res } = form.id
      ? await apiCall("PUT", `/profile/addresses/${form.id}`, payload)
      : await apiCall("POST", "/profile/addresses", payload);

    if (!ok) { flash(res.message || "Có lỗi xảy ra, vui lòng thử lại."); return; }

    let list;
    if (form.id) list = data.addresses.map(a => a.id === form.id ? res.address : a);
    else list = [...data.addresses, res.address];
    if (res.address.def) list = list.map(a => ({ ...a, def: a.id === res.address.id }));

    setAddresses(list);
    setAddrModal(null);
    flash(res.message || "Đã lưu địa chỉ");
  };

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <a className="back" href={NAV_URLS.home}><Icon name="arrowleft" size={20} /></a>
          <div className="hdr-title">Thông tin cá nhân</div>
        </div>
      </header>

      <main className="app">
        {/* hero */}
        <section className="phero">
          <div className="avatar-wrap">
            <div className="avatar" style={data.avatar ? { backgroundImage: `url(${data.avatar})` } : { background: MEMBER.av }}>
              {!data.avatar && initials(data.name)}
            </div>
            <button className="avatar-edit" onClick={() => !avatarUploading && fileRef.current?.click()} title="Đổi ảnh đại diện" disabled={avatarUploading} style={avatarUploading ? { opacity: 0.6, cursor: "wait" } : {}}>
              {avatarUploading ? <span className="spin" style={{ width: 17, height: 17, borderWidth: 2 }} /> : <Icon name="camera" size={17} color="#fff" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatar} />
          </div>
          <div className="pname">{data.name}</div>
          <div className="pmeta"><span className="ptier"><Icon name="star" size={12} color="#C99A2E" /> {MEMBER.tier}</span> ID {MEMBER.id}</div>
        </section>

        {/* account quick links */}
        <nav className="acct-menu">
          <a className="acct-link" href={NAV_URLS.points}><span className="ali"><Icon name="coin" size={19} color="currentColor" /></span><span className="alt">Chi tiết điểm</span><span className="alc"><Icon name="chev" size={18} /></span></a>
          <a className="acct-link" href={NAV_URLS.history}><span className="ali"><Icon name="receipt" size={19} color="currentColor" /></span><span className="alt">Lịch sử giao dịch</span><span className="alc"><Icon name="chev" size={18} /></span></a>
          <a className="acct-link" href={NAV_URLS.wallet}><span className="ali"><Icon name="gift" size={19} color="currentColor" /></span><span className="alt">Đổi quà &amp; Voucher của tôi</span><span className="alc"><Icon name="chev" size={18} /></span></a>
          <a className="acct-link" href={NAV_URLS.store}><span className="ali"><Icon name="pin" size={19} color="currentColor" /></span><span className="alt">Cửa hàng Laboong</span><span className="alc"><Icon name="chev" size={18} /></span></a>
          <a className="acct-link danger" href={NAV_URLS.login} onClick={logout}><span className="ali"><Icon name="logout" size={19} color="currentColor" /></span><span className="alt">Đăng xuất</span><span className="alc"><Icon name="chev" size={18} /></span></a>
        </nav>

        {/* personal info */}
        <section className="sec">
          <div className="sec-h"><span className="sic"><Icon name="user" size={17} color="currentColor" /></span><h2>Thông tin cơ bản</h2></div>
          <div className="panel">
            <div className="field">
              <label>Họ và tên</label>
              <div className="inp-wrap">
                <span className="lic"><Icon name="user" size={17} /></span>
                <input className={"inp" + (!nameOk ? " bad" : "")} value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
              </div>
              {!nameOk && <div className="err"><Icon name="info" size={13} color="var(--danger)" /> Vui lòng nhập họ tên</div>}
            </div>
            <div className="field">
              <label>Email</label>
              <div className="inp-wrap">
                <span className="lic"><Icon name="mail" size={17} /></span>
                <input className={"inp" + (!emailOk ? " bad" : "")} inputMode="email" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} />
              </div>
              {!emailOk && <div className="err"><Icon name="info" size={13} color="var(--danger)" /> Email không hợp lệ</div>}
            </div>
            <div className="field">
              <label>Ngày sinh</label>
              <div className="inp-wrap">
                <span className="lic"><Icon name="cal" size={17} /></span>
                <input className="inp" type="date" max="2012-12-31" value={data.dob} onChange={e => setData({ ...data, dob: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Số điện thoại <span className="lock"><Icon name="lock" size={12} /> không thể đổi</span></label>
              <div className="inp-wrap">
                <span className="lic"><Icon name="phone" size={17} /></span>
                <input className="inp" value={MEMBER.phone} disabled />
              </div>
            </div>
          </div>
        </section>

        {/* delivery addresses */}
        <section className="sec">
          <div className="sec-h">
            <span className="sic"><Icon name="pin" size={17} color="currentColor" /></span><h2>Địa chỉ giao hàng</h2>
            <button className="add" onClick={() => setAddrModal({ label: "Nhà", name: "", text: "", def: data.addresses.length === 0 })}><Icon name="plus2" size={15} color="var(--brand)" /> Thêm</button>
          </div>
          <div className="panel">
            {data.addresses.length === 0 && <div className="addr-empty">Chưa có địa chỉ giao hàng nào. Thêm địa chỉ để đặt giao hàng nhanh hơn.</div>}
            {data.addresses.map(a => (
              <div className="addr" key={a.id}>
                <div className="aic"><Icon name={a.label === "Công ty" ? "building" : "home"} size={19} color="currentColor" /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="albl">
                    <span className="atag">{a.label}</span>
                    {a.def ? <span className="adefault">Mặc định</span>
                      : <button className="adefault" style={{ background: "var(--bg-2)", color: "var(--ink-2)" }} onClick={() => setDefault(a.id)}>Đặt mặc định</button>}
                  </div>
                  <div className="aname">{a.name}</div>
                  <div className="atext">{a.text}</div>
                </div>
                <div className="aacts">
                  <button className="aact" onClick={() => setAddrModal({ ...a })} title="Sửa"><Icon name="edit" size={16} /></button>
                  <button className="aact del" onClick={() => delAddr(a.id)} title="Xoá"><Icon name="trash" size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* favorites */}
        <section className="sec">
          <div className="sec-h">
            <span className="sic"><Icon name="heartfill" size={16} color="currentColor" /></span><h2>Món yêu thích</h2>
            <span className="add" style={{ color: "var(--ink-3)", pointerEvents: "none" }}>{data.favorites.length} món</span>
          </div>
          <div className="fav-grid">
            {MENU.map(m => {
              const on = data.favorites.includes(m.id);
              return (
                <div className={"fav" + (on ? " on" : "")} key={m.id}>
                  <div className="fav-thumb" style={{ background: m.grad }}>
                    <span className="ti"><Icon name={m.ic} size={30} color="#fff" /></span>
                    <button className="fav-heart" onClick={() => toggleFav(m.id)} title={on ? "Bỏ yêu thích" : "Yêu thích"}>
                      <Icon name={on ? "heartfill" : "heart"} size={17} color={on ? "var(--pink)" : "var(--ink-3)"} />
                    </button>
                  </div>
                  <div className="fav-body">
                    <div className="fav-name">{m.name}</div>
                    <div className="fav-cat">{m.cat}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* save bar */}
      <div className={"savebar" + (dirty ? " show" : "")}>
        <div className="savebar-in">
          <div className="note"><span className="dot" /> Có thay đổi chưa lưu</div>
          <div className="acts">
            <button className="btn ghost" onClick={discard}>Huỷ</button>
            <button className="btn primary" onClick={save}><Icon name="check" size={16} color="#fff" /> Lưu thay đổi</button>
          </div>
        </div>
      </div>

      {/* address modal */}
      {addrModal && <AddrModal init={addrModal} onClose={() => setAddrModal(null)} onSave={saveAddr} />}

      {toast && <div className="toast"><span className="tc"><Icon name="check" size={15} color="#fff" /></span>{toast}</div>}

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F", "#07432A"], ["#005A36", "#003D24"], ["#7A4A28", "#56331A"], ["#6B4FA0", "#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </>
  );
}

function gmaps() { return window.google?.maps; }

function onGmapsReady(fn) {
  if (window.__gmapsReady || window.google?.maps) { fn(); return; }
  if (window.__gmapsCallbacks) { window.__gmapsCallbacks.push(fn); }
  else { fn(); } // fallback nếu không dùng async load
}

async function reverseGeocode(lat, lng) {
  const maps = gmaps();
  if (!maps) return null;
  return new Promise(resolve => {
    new maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.length) {
        resolve(results[0].formatted_address.replace(/,?\s*Việt Nam$/i, "").trim());
      } else resolve(null);
    });
  });
}

async function smartNominatimSearch(text) {
  const maps = gmaps();
  if (!maps?.places?.AutocompleteService) return [];
  return new Promise(resolve => {
    new maps.places.AutocompleteService().getPlacePredictions(
      { input: text, componentRestrictions: { country: 'vn' } },
      (predictions, status) => {
        if (!predictions?.length) { resolve([]); return; }
        const geocoder = new maps.Geocoder();
        Promise.all(predictions.slice(0, 6).map(p => new Promise(res => {
          geocoder.geocode({ placeId: p.place_id }, (results, s) => {
            if (s === 'OK' && results?.length) {
              const loc = results[0].geometry.location;
              res({ text: p.description.replace(/,?\s*Việt Nam$/i, "").trim(), lat: loc.lat(), lng: loc.lng() });
            } else res(null);
          });
        }))).then(list => resolve(list.filter(Boolean)));
      }
    );
  });
}

async function cascadeGeocode(text) {
  const maps = gmaps();
  if (!maps) return null;
  const geocoder = new maps.Geocoder();
  const parts = text.split(",").map(p => p.trim()).filter(Boolean);
  const queries = [text];
  for (let i = 1; i < parts.length; i++) queries.push(parts.slice(i).join(", "));
  for (const q of queries) {
    if (q.trim().length < 3) continue;
    const result = await new Promise(resolve => {
      geocoder.geocode({ address: q + ', Việt Nam', region: 'VN' }, (results, status) => {
        if (status === 'OK' && results?.length) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else resolve(null);
      });
    });
    if (result) return result;
  }
  return null;
}

function AddrModal({ init, onClose, onSave }) {
  const [f, setF] = useState({
    id: init.id, label: init.label || "Nhà", name: init.name || "",
    def: !!init.def,
    lat: init.lat || null, lng: init.lng || null,
  });

  const [addrText,   setAddrText]   = useState(init.text || '');
  const [pickedFull, setPickedFull] = useState(init.text || '');
  const [sugg,       setSugg]       = useState([]);
  const [searching,  setSearching]  = useState(false);
  const [suggRect,   setSuggRect]   = useState(null);
  const debRef   = useRef(null);
  const inputRef = useRef(null);

  const [geocoding, setGeocoding] = useState(false);
  const mapDivRef = useRef(null);
  const mapRef    = useRef(null);
  const markerRef = useRef(null);

  const fullText = addrText.trim();

  /* ---- autocomplete ---- */
  const onAddrChange = (val) => {
    setAddrText(val);
    setPickedFull('');
    setF(prev => ({ ...prev, lat: null, lng: null }));
    clearTimeout(debRef.current);
    if (val.trim().length < 3) { setSugg([]); setSearching(false); return; }
    setSearching(true);
    debRef.current = setTimeout(async () => {
      const results = await smartNominatimSearch(val.trim() + ', Việt Nam');
      setSugg(results);
      setSearching(false);
      if (results.length > 0 && inputRef.current) {
        const r = inputRef.current.getBoundingClientRect();
        setSuggRect({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    }, 400);
  };

  const pickSugg = (s) => {
    setAddrText(s.text);
    setPickedFull(s.text);
    setSugg([]);
    setF(prev => ({ ...prev, lat: s.lat, lng: s.lng }));
  };

  /* ---- fallback geocode on blur ---- */
  const onAddrBlur = async () => {
    if (f.lat || !fullText) return;
    setGeocoding(true);
    const loc = await cascadeGeocode(fullText);
    if (loc) setF(prev => ({ ...prev, lat: loc.lat, lng: loc.lng }));
    setGeocoding(false);
  };

  /* ---- Escape key ---- */
  useEffect(() => {
    const h = e => { if (e.key === "Escape") { if (sugg.length) { setSugg([]); } else { onClose(); } } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, sugg.length]);

  /* ---- Google Maps ---- */
  useEffect(() => {
    let destroyed = false;
    onGmapsReady(() => {
      if (destroyed || !mapDivRef.current || mapRef.current) return;
      const maps = gmaps();
      if (!maps) return;
      const center = (f.lat && f.lng) ? { lat: f.lat, lng: f.lng } : { lat: 20.9833, lng: 105.8412 };
      const map = new maps.Map(mapDivRef.current, {
        center, zoom: f.lat ? 16 : 11,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
      });
      const addMarker = (lat, lng) => {
        markerRef.current = new maps.Marker({
          position: { lat, lng }, map, draggable: true,
          icon: { path: maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#0F623F', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
        });
        markerRef.current.addListener('dragend', e => {
          const la = e.latLng.lat(), lo = e.latLng.lng();
          setF(prev => ({ ...prev, lat: la, lng: lo }));
          reverseGeocode(la, lo).then(addr => { if (addr) { setAddrText(addr); setPickedFull(addr); } });
        });
      };
      if (f.lat && f.lng) addMarker(f.lat, f.lng);
      map.addListener('click', e => {
        const lat = e.latLng.lat(), lng = e.latLng.lng();
        setF(prev => ({ ...prev, lat, lng }));
        if (markerRef.current) markerRef.current.setPosition({ lat, lng });
        else addMarker(lat, lng);
        reverseGeocode(lat, lng).then(addr => { if (addr) { setAddrText(addr); setPickedFull(addr); } });
      });
      mapRef.current = map;
    });
    return () => { destroyed = true; mapRef.current = null; markerRef.current = null; };
  }, []); // eslint-disable-line

  useEffect(() => {
    const map = mapRef.current;
    if (!map || f.lat == null || f.lng == null) return;
    const pos = { lat: f.lat, lng: f.lng };
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      const maps = gmaps();
      if (!maps) return;
      markerRef.current = new maps.Marker({
        position: pos, map, draggable: true,
        icon: { path: maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#0F623F', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      });
    }
    map.panTo(pos);
  }, [f.lat, f.lng]); // eslint-disable-line

  const valid = addrText.trim().length >= 4 && f.name.trim().length >= 2;

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-h">
          <h3>{init.id ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h3>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-b" style={{ overflowY: "auto", flex: 1 }}>

          {/* Loại địa chỉ */}
          <div className="fld">
            <label>Loại địa chỉ</label>
            <div className="label-pick">
              {[["Nhà", "home"], ["Công ty", "building"], ["Khác", "pin"]].map(([l, ic]) => (
                <button key={l} className={f.label === l ? "on" : ""} onClick={() => setF({ ...f, label: l })}>
                  <Icon name={ic} size={15} color="currentColor" /> {l}
                </button>
              ))}
            </div>
          </div>

          {/* Người nhận */}
          <div className="fld">
            <label>Người nhận &amp; SĐT</label>
            <input className="inp2" placeholder="VD: Minh Anh · 0912 845 207" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          </div>

          {/* Địa chỉ — free text + autocomplete */}
          <div className="fld">
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Địa chỉ</span>
              {searching && <span style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 12 }}>Đang tìm…</span>}
              {!searching && pickedFull && <span style={{ fontWeight: 600, color: "var(--brand)", fontSize: 12 }}>✓ Đã chọn</span>}
            </label>
            <input ref={inputRef} className="inp2" autoComplete="off"
              placeholder="Nhập số nhà, tên đường, phường, quận…"
              value={addrText}
              onChange={e => onAddrChange(e.target.value)}
              onBlur={onAddrBlur}
            />
            {sugg.length > 0 && suggRect && (
              <div className="suggest-address" style={{ position: "fixed", top: suggRect.top, left: suggRect.left, width: suggRect.width }}>
                {sugg.map((s, i) => (
                  <button key={i} onMouseDown={() => pickSugg(s)}>
                    <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="pin" size={13} color="var(--brand)" /></span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bản đồ */}
          <div className="fld">
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Vị trí trên bản đồ</span>
              {geocoding
                ? <span style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 12 }}>Đang xác định…</span>
                : f.lat && f.lng
                  ? <span style={{ fontWeight: 600, color: "var(--brand)", fontSize: 12 }}>✓ Đã xác định</span>
                  : <span style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 12 }}>Nhấp bản đồ để chỉnh vị trí</span>}
            </label>
            <div ref={mapDivRef} style={{ height: 190, borderRadius: "var(--r-sm)", overflow: "hidden", border: "1.5px solid var(--line)", isolation: "isolate" }} />
          </div>

          <div className="fld">
            <button className="label-pick" style={{ width: "100%" }} onClick={() => setF({ ...f, def: !f.def })}>
              <span className={f.def ? "on" : ""} style={{ flex: 1, padding: 11, borderRadius: "var(--r-sm)", border: "1.5px solid var(--line)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, fontWeight: 700, fontSize: 13.5 }}>
                <Icon name={f.def ? "check" : "plus2"} size={15} color="currentColor" /> Đặt làm địa chỉ mặc định
              </span>
            </button>
          </div>
        </div>
        <div className="modal-f">
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
          <button className="btn primary" disabled={!valid} onClick={() => onSave({ ...f, text: fullText })} style={!valid ? { opacity: .5 } : {}}>Lưu địa chỉ</button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
