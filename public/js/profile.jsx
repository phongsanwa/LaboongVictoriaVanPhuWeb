/* global React, ReactDOM, Icon, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useRef, useMemo } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const MEMBER = { tier: "Hạng Vàng", id: "LBVP·0257·418", phone: "0912 845 207", av: "linear-gradient(140deg,#0F623F,#1AA86A)" };

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
  name: "Nguyễn Minh Anh",
  email: "minhanh.ng@gmail.com",
  dob: "1998-05-30",
  avatar: null, // dataURL
  addresses: [
    { id: "a1", label: "Nhà", name: "Minh Anh · 0912 845 207", text: "S2.03 KĐT Văn Phú, P. Phú La, Hà Đông, Hà Nội", def: true },
    { id: "a2", label: "Công ty", name: "Minh Anh · 0912 845 207", text: "Tầng 12, Toà Keangnam, Phạm Hùng, Nam Từ Liêm, Hà Nội", def: false },
  ],
  favorites: ["m1", "m3", "m5"],
};

function initials(n) { const p = n.trim().split(/\s+/); return ((p[0]?.[0] || "") + (p[p.length - 1]?.[0] || "")).toUpperCase(); }
function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [data, setData] = useState(INITIAL);
  const [saved, setSaved] = useState(INITIAL);
  const [toast, setToast] = useState(null);
  const [addrModal, setAddrModal] = useState(null); // {edit?, label, name, text, def}
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

  const onAvatar = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setData(d => ({ ...d, avatar: reader.result }));
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const save = () => { if (!emailOk || !nameOk) return; setSaved(data); flash("Đã lưu thông tin cá nhân"); };
  const discard = () => setData(saved);

  const toggleFav = (id) => setData(d => ({ ...d, favorites: d.favorites.includes(id) ? d.favorites.filter(x => x !== id) : [...d.favorites, id] }));

  const delAddr = (id) => setData(d => ({ ...d, addresses: d.addresses.filter(a => a.id !== id) }));
  const setDefault = (id) => setData(d => ({ ...d, addresses: d.addresses.map(a => ({ ...a, def: a.id === id })) }));

  const saveAddr = (form) => {
    setData(d => {
      let list;
      if (form.id) list = d.addresses.map(a => a.id === form.id ? { ...a, ...form } : a);
      else list = [...d.addresses, { ...form, id: "a" + Date.now() }];
      if (form.def) list = list.map(a => ({ ...a, def: a.id === (form.id || list[list.length - 1].id) }));
      else if (!list.some(a => a.def) && list.length) list[0].def = true;
      return { ...d, addresses: list };
    });
    setAddrModal(null);
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
            <button className="avatar-edit" onClick={() => fileRef.current?.click()} title="Đổi ảnh đại diện"><Icon name="camera" size={17} color="#fff" /></button>
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
          <a className="acct-link danger" href={NAV_URLS.login}><span className="ali"><Icon name="logout" size={19} color="currentColor" /></span><span className="alt">Đăng xuất</span><span className="alc"><Icon name="chev" size={18} /></span></a>
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

function AddrModal({ init, onClose, onSave }) {
  const [f, setF] = useState({ id: init.id, label: init.label || "Nhà", name: init.name || "", text: init.text || "", def: !!init.def });
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const valid = f.text.trim().length >= 6 && f.name.trim().length >= 2;
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-h"><h3>{init.id ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h3><button className="x" onClick={onClose}><Icon name="close" size={18} /></button></div>
        <div className="modal-b">
          <div className="fld">
            <label>Loại địa chỉ</label>
            <div className="label-pick">
              {[["Nhà", "home"], ["Công ty", "building"], ["Khác", "pin"]].map(([l, ic]) => (
                <button key={l} className={f.label === l ? "on" : ""} onClick={() => setF({ ...f, label: l })}><Icon name={ic} size={15} color="currentColor" /> {l}</button>
              ))}
            </div>
          </div>
          <div className="fld">
            <label>Người nhận & SĐT</label>
            <input className="inp2" placeholder="VD: Minh Anh · 0912 845 207" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="fld">
            <label>Địa chỉ chi tiết</label>
            <input className="inp2" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP" value={f.text} onChange={e => setF({ ...f, text: e.target.value })} />
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
          <button className="btn primary" disabled={!valid} onClick={() => onSave(f)} style={!valid ? { opacity: .5 } : {}}>Lưu địa chỉ</button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
