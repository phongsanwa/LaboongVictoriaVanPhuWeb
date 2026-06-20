/* global React, Icon */
const { useState: useStateSt, useEffect: useEffectSt, useRef: useRefSt } = React;

function csrfTokenSt() {
  return document.querySelector('meta[name="csrf-token"]')?.content || "";
}

const STORE_DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

function StoreEditor({ initial, onClose, onSave }) {
  const isEdit = !!initial;
  const [name, setName] = useStateSt(initial?.name || "");
  const [address, setAddress] = useStateSt(initial?.address || "");
  const [city, setCity] = useStateSt(initial?.city || "Hà Nội");
  const [phone, setPhone] = useStateSt(initial?.phone || "");
  const [email, setEmail] = useStateSt(initial?.email || "");
  const [latitude, setLatitude] = useStateSt(initial?.latitude ?? null);
  const [longitude, setLongitude] = useStateSt(initial?.longitude ?? null);
  const [openingTime, setOpeningTime] = useStateSt(initial?.opening_time || "07:00");
  const [closingTime, setClosingTime] = useStateSt(initial?.closing_time || "22:00");
  const [days, setDays] = useStateSt(initial?.operating_days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [status, setStatus] = useStateSt(initial ? initial.status === "active" : true);
  const [photos, setPhotos] = useStateSt(initial?.photos ?? []);
  const [photoUploading, setPhotoUploading] = useStateSt(false);
  const photoRef = useRefSt(null);

  const [sugg, setSugg] = useStateSt([]);
  const [searching, setSearching] = useStateSt(false);
  const debRef = useRefSt(null);
  const mapDivRef = useRefSt(null);
  const mapRef = useRefSt(null);
  const markerRef = useRefSt(null);

  useEffectSt(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Init Leaflet map
  useEffectSt(() => {
    const L = window.L;
    if (!L || !mapDivRef.current || mapRef.current) return;

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const hasCoords = latitude != null && longitude != null;
    const center = hasCoords ? [latitude, longitude] : [20.9833, 105.8412];
    const map = L.map(mapDivRef.current, { zoomControl: true }).setView(center, hasCoords ? 16 : 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    if (hasCoords) {
      markerRef.current = L.marker([latitude, longitude]).addTo(map);
    }

    map.on("click", e => {
      const { lat, lng } = e.latlng;
      setLatitude(lat);
      setLongitude(lng);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);

  // Pan + update marker when lat/lng change from suggestion
  useEffectSt(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || latitude == null || longitude == null) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      markerRef.current = L.marker([latitude, longitude]).addTo(map);
    }
    map.setView([latitude, longitude], 16, { animate: true });
  }, [latitude, longitude]);

  const onAddressChange = e => {
    const val = e.target.value;
    setAddress(val);
    if (debRef.current) clearTimeout(debRef.current);
    if (val.trim().length < 5) { setSugg([]); setSearching(false); return; }
    setSearching(true);
    debRef.current = setTimeout(async () => {
      try {
        const q = encodeURIComponent(val.trim() + ", Việt Nam");
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=vn`, {
          headers: { "Accept-Language": "vi" },
        });
        const items = await r.json();
        setSugg(items.map(d => ({ text: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) })));
      } catch { setSugg([]); }
      setSearching(false);
    }, 500);
  };

  const pickSugg = s => {
    setAddress(s.text);
    setLatitude(s.lat);
    setLongitude(s.lng);
    setSugg([]);
  };

  const toggleDay = (i) => {
    setDays(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i].sort());
  };

  const uploadPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    e.target.value = "";
    setPhotoUploading(true);
    const form = new FormData();
    form.append("photo", f);
    form.append("_token", csrfTokenSt());
    const res = await fetch(`/admin/stores/${initial.id}/photos`, {
      method: "POST", body: form, headers: { "Accept": "application/json", "X-CSRF-TOKEN": csrfTokenSt() },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setPhotos(body.store?.photos ?? []);
    setPhotoUploading(false);
  };

  const deletePhoto = async (url) => {
    const res = await fetch(`/admin/stores/${initial.id}/photos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-TOKEN": csrfTokenSt() },
      body: JSON.stringify({ url }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setPhotos(body.store?.photos ?? []);
  };

  const valid = name.trim() && address.trim() && city.trim() && phone.trim()
    && openingTime && closingTime && days.length > 0;

  const submit = () => {
    if (!valid) return;
    onSave({
      ...(initial || {}),
      name: name.trim(), address: address.trim(), city: city.trim(), phone: phone.trim(),
      email: email.trim() || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      opening_time: openingTime, closing_time: closingTime,
      operating_days: days, status: status ? "active" : "inactive",
    });
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name={isEdit ? "edit" : "plus"} size={20} /></div>
          <div>
            <h3>{isEdit ? "Chỉnh sửa cửa hàng" : "Thêm cửa hàng mới"}</h3>
            <p>{isEdit ? "Cập nhật thông tin cửa hàng" : "Thêm một chi nhánh mới vào hệ thống"}</p>
          </div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-b" style={{ overflowY: "auto", flex: 1 }}>
          <div className="fld">
            <label>Tên cửa hàng</label>
            <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Laboong Victoria Văn Phú" autoFocus />
          </div>

          <div className="fld" style={{ position: "relative" }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Địa chỉ</span>
              {searching && <span style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 12 }}>Đang tìm…</span>}
            </label>
            <input className="inp" value={address} onChange={onAddressChange} placeholder="Số nhà, đường, phường/xã, quận/huyện" autoComplete="off" />
            {sugg.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card)", border: "1.5px solid var(--brand)", borderRadius: 8, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,.15)", marginTop: 4 }}>
                {sugg.map((s, i) => (
                  <button key={i} onMouseDown={() => pickSugg(s)} style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%", padding: "9px 14px", textAlign: "left", fontSize: 13, borderBottom: i < sugg.length - 1 ? "1px solid var(--line)" : "none", color: "var(--ink)", lineHeight: 1.4 }}>
                    <span style={{ flexShrink: 0, marginTop: 2 }}><Icon name="pin" size={13} color="var(--brand)" /></span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="two-col">
            <div className="fld">
              <label>Thành phố</label>
              <input className="inp" value={city} onChange={e => setCity(e.target.value)} placeholder="VD: Hà Nội" />
            </div>
            <div className="fld">
              <label>Số điện thoại</label>
              <input className="inp" value={phone} onChange={e => setPhone(e.target.value)} placeholder="VD: 0243 555 0101" />
            </div>
          </div>

          <div className="fld">
            <label>Email (không bắt buộc)</label>
            <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vanphu@laboong.vn" />
          </div>

          <div className="fld">
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Vị trí trên bản đồ</span>
              {latitude != null && longitude != null
                ? <span style={{ fontWeight: 600, color: "var(--brand)", fontSize: 12 }}>✓ {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</span>
                : <span style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 12 }}>Nhấp bản đồ hoặc chọn địa chỉ để xác định</span>}
            </label>
            <div ref={mapDivRef} style={{ height: 220, borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--line)", isolation: "isolate" }} />
          </div>

          <div className="two-col">
            <div className="fld">
              <label>Giờ mở cửa</label>
              <input className="inp" type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} />
            </div>
            <div className="fld">
              <label>Giờ đóng cửa</label>
              <input className="inp" type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} />
            </div>
          </div>

          <div className="fld">
            <label>Ngày hoạt động</label>
            <div className="cat-pick">
              {STORE_DAYS.map((d, i) => (
                <button key={d} className={"cat-opt" + (days.includes(i) ? " on" : "")} onClick={() => toggleDay(i)}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {isEdit && (
            <div className="fld">
              <label>Hình ảnh cửa hàng</label>
              <div className="photo-grid">
                {photos.map((url, i) => (
                  <div className="photo-thumb" key={i} style={{ backgroundImage: `url(${url})` }}>
                    <button className="photo-del" onClick={() => deletePhoto(url)} title="Xoá ảnh">
                      <Icon name="close" size={13} color="#fff" />
                    </button>
                  </div>
                ))}
                <button className="photo-add" onClick={() => photoRef.current?.click()} disabled={photoUploading} title="Thêm ảnh">
                  {photoUploading
                    ? <span className="spin" style={{ width: 20, height: 20, borderWidth: 2 }} />
                    : <><Icon name="plus" size={20} /><span>Thêm ảnh</span></>}
                </button>
                <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadPhoto} />
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>JPG, PNG, WebP — tối đa 4MB mỗi ảnh</div>
            </div>
          )}

          <div className="switch-row" onClick={() => setStatus(s => !s)} style={{ cursor: "pointer" }}>
            <div>
              <div className="sl">Trạng thái: {status ? "Active" : "Inactive"}</div>
              <div className="sd">{status ? "Cửa hàng đang hoạt động, hiển thị cho khách" : "Ẩn cửa hàng khỏi danh sách khách hàng"}</div>
            </div>
            <div className={"switch" + (status ? " on" : "")} />
          </div>
        </div>

        <div className="modal-f">
          <button className="btn ghost" style={{ flex: ".6" }} onClick={onClose}>Huỷ</button>
          <button className="btn primary" disabled={!valid} onClick={submit}>
            <Icon name="check" size={17} color="#fff" /> {isEdit ? "Lưu thay đổi" : "Thêm cửa hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteStore({ name, onClose, onConfirm }) {
  useEffectSt(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal confirm" onClick={e => e.stopPropagation()}>
        <div className="ci"><Icon name="trash" size={26} /></div>
        <h3>Xoá cửa hàng?</h3>
        <p>Bạn sắp xoá <b>{name}</b>. Hành động này không thể hoàn tác.</p>
        <div className="row">
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
          <button className="btn danger" onClick={onConfirm}><Icon name="trash" size={16} color="#fff" /> Xoá</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StoreEditor, ConfirmDeleteStore, STORE_DAYS });
