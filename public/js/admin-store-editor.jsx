/* global React, Icon */
const { useState: useStateSt, useEffect: useEffectSt } = React;

const STORE_DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

function StoreEditor({ initial, onClose, onSave }) {
  const isEdit = !!initial;
  const [name, setName] = useStateSt(initial?.name || "");
  const [address, setAddress] = useStateSt(initial?.address || "");
  const [city, setCity] = useStateSt(initial?.city || "Hà Nội");
  const [phone, setPhone] = useStateSt(initial?.phone || "");
  const [email, setEmail] = useStateSt(initial?.email || "");
  const [latitude, setLatitude] = useStateSt(initial?.latitude ?? "");
  const [longitude, setLongitude] = useStateSt(initial?.longitude ?? "");
  const [openingTime, setOpeningTime] = useStateSt(initial?.opening_time || "07:00");
  const [closingTime, setClosingTime] = useStateSt(initial?.closing_time || "22:00");
  const [days, setDays] = useStateSt(initial?.operating_days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [status, setStatus] = useStateSt(initial ? initial.status === "active" : true);

  useEffectSt(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const toggleDay = (i) => {
    setDays(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i].sort());
  };

  const valid = name.trim() && address.trim() && city.trim() && phone.trim()
    && openingTime && closingTime && days.length > 0;

  const submit = () => {
    if (!valid) return;
    onSave({
      ...(initial || {}),
      name: name.trim(), address: address.trim(), city: city.trim(), phone: phone.trim(),
      email: email.trim() || null,
      latitude: latitude === "" ? null : Number(latitude),
      longitude: longitude === "" ? null : Number(longitude),
      opening_time: openingTime, closing_time: closingTime,
      operating_days: days, status: status ? "active" : "inactive",
    });
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name={isEdit ? "edit" : "plus"} size={20} /></div>
          <div>
            <h3>{isEdit ? "Chỉnh sửa cửa hàng" : "Thêm cửa hàng mới"}</h3>
            <p>{isEdit ? "Cập nhật thông tin cửa hàng" : "Thêm một chi nhánh mới vào hệ thống"}</p>
          </div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-b">
          <div className="fld">
            <label>Tên cửa hàng</label>
            <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Laboong Victoria Văn Phú" autoFocus />
          </div>

          <div className="fld">
            <label>Địa chỉ</label>
            <input className="inp" value={address} onChange={e => setAddress(e.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện" />
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

          <div className="two-col">
            <div className="fld">
              <label>Vĩ độ (latitude)</label>
              <input className="inp" type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="VD: 20.96523" />
            </div>
            <div className="fld">
              <label>Kinh độ (longitude)</label>
              <input className="inp" type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="VD: 105.76488" />
            </div>
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
