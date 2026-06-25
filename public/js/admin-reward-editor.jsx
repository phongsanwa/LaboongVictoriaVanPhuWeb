/* global React, Icon, REWARD_CATS, REWARD_PRODUCTS, fmt */
const { useState: useStateEd, useEffect: useEffectEd } = React;

const GRADS = [
  "linear-gradient(135deg,#0F623F,#1AA86A)",
  "linear-gradient(135deg,#FF8A5B,#FF6FA5)",
  "linear-gradient(135deg,#F2598A,#C2477B)",
  "linear-gradient(135deg,#1E8FA8,#4FC3D9)",
  "linear-gradient(135deg,#C99A2E,#E0B84A)",
  "linear-gradient(135deg,#6B4FA0,#9B7FD4)",
  "linear-gradient(135deg,#3E7CB1,#6FB1E0)",
  "linear-gradient(135deg,#D4584B,#F2826F)",
  "linear-gradient(135deg,#A9743F,#C99A6A)",
  "linear-gradient(135deg,#5A8F7B,#7FB8A0)",
  "linear-gradient(135deg,#9B4DA0,#C77FD4)",
  "linear-gradient(135deg,#E08A2B,#F2B14A)",
];

function RewardEditor({ initial, onClose, onSave }) {
  const isEdit = !!initial;
  const [name, setName] = useStateEd(initial?.name || "");
  const [cat, setCat] = useStateEd(initial?.cat || "voucher");
  const [points, setPoints] = useStateEd(initial?.points ?? 300);
  const [qty, setQty] = useStateEd(initial?.qty ?? 200);
  const [expiry, setExpiry] = useStateEd(initial?.expiry || "2026-12-31");
  const [status, setStatus] = useStateEd(initial ? initial.status === "on" : true);
  const [grad, setGrad] = useStateEd(initial?.grad || GRADS[0]);
  const [img, setImg] = useStateEd(initial?.img || null);
  const [productId, setProductId] = useStateEd(initial?.product_id ?? null);
  const isFreeItem = cat !== "voucher";

  useEffectEd(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Reset product selection when switching to voucher category
  useEffectEd(() => {
    if (cat === "voucher") setProductId(null);
  }, [cat]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f) { const url = URL.createObjectURL(f); setImg(url); }
  };

  const valid = name.trim() && points > 0 && qty > 0 && expiry
    && (!isFreeItem || productId !== null);
  const submit = () => {
    if (!valid) return;
    onSave({
      ...(initial || {}),
      name: name.trim(), cat, points: Number(points), qty: Number(qty),
      expiry, status: status ? "on" : "off", grad, img,
      product_id: isFreeItem ? (productId ?? null) : null,
    });
  };

  const catIc = REWARD_CATS[cat].ic;

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name={isEdit ? "edit" : "plus"} size={20} /></div>
          <div>
            <h3>{isEdit ? "Chỉnh sửa phần thưởng" : "Tạo phần thưởng mới"}</h3>
            <p>{isEdit ? "Cập nhật voucher / quà tặng" : "Thêm voucher hoặc quà tặng để khách đổi điểm"}</p>
          </div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-b">
          <div className="editor-grid">
            {/* thumbnail */}
            <div className="thumb-pick">
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-2)" }}>Ảnh / Màu thẻ</label>
              <div className="thumb-preview" style={{ background: img ? `url(${img}) center/cover` : grad }}>
                {!img && <span className="ti"><Icon name={catIc} size={48} color="#fff" /></span>}
              </div>
              <label className="rw-btn" style={{ cursor: "pointer", justifyContent: "center" }}>
                <Icon name="image" size={15} /> {img ? "Đổi ảnh" : "Tải ảnh lên"}
                <input type="file" accept="image/*" hidden onChange={onFile} />
              </label>
              {img && <button className="rw-btn" onClick={() => setImg(null)}>Bỏ ảnh, dùng màu</button>}
              {!img && (
                <div className="swatches">
                  {GRADS.map(g => (
                    <button key={g} className={g === grad ? "on" : ""} style={{ background: g }} onClick={() => setGrad(g)} aria-label="màu" />
                  ))}
                </div>
              )}
              {!img && <div className="upload-hint">Chưa có ảnh? Chọn màu nền — icon theo loại sẽ hiển thị.</div>}
            </div>

            {/* fields */}
            <div>
              <div className="fld">
                <label>Tên phần thưởng</label>
                <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Voucher giảm 30.000đ" autoFocus />
              </div>

              <div className="fld">
                <label>Loại</label>
                <div className="cat-pick">
                  {Object.entries(REWARD_CATS).map(([k, m]) => (
                    <button key={k} className={"cat-opt" + (cat === k ? " on" : "")} onClick={() => setCat(k)}>
                      <span className="ci"><Icon name={m.ic} size={15} color="currentColor" /></span> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {isFreeItem && (
                <div className="fld">
                  <label>Sản phẩm miễn phí <span style={{ color: "var(--hot)", fontWeight: 700 }}>*</span></label>
                  <select
                    className="inp"
                    value={productId ?? ""}
                    onChange={e => setProductId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">— Chọn sản phẩm —</option>
                    {(REWARD_PRODUCTS || []).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.cat ? ` (${p.cat})` : ""} — {typeof fmt === 'function' ? fmt(p.price) : p.price.toLocaleString()}đ
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>
                    Khách đổi quà sẽ nhận voucher miễn phí sản phẩm này khi đặt hàng.
                  </div>
                </div>
              )}

              <div className="two-col">
                <div className="fld">
                  <label>Điểm cần để đổi</label>
                  <input className="inp" type="number" min="0" value={points} onChange={e => setPoints(e.target.value.replace(/[^0-9]/g, ""))} />
                </div>
                <div className="fld">
                  <label>Số lượng phát hành</label>
                  <input className="inp" type="number" min="0" value={qty} onChange={e => setQty(e.target.value.replace(/[^0-9]/g, ""))} />
                </div>
              </div>

              <div className="fld">
                <label>Hạn đổi</label>
                <input className="inp" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
              </div>

              <div className="switch-row" onClick={() => setStatus(s => !s)} style={{ cursor: "pointer" }}>
                <div>
                  <div className="sl">Trạng thái: {status ? "Active" : "Inactive"}</div>
                  <div className="sd">{status ? "Khách có thể đổi phần thưởng này" : "Ẩn khỏi danh sách đổi quà"}</div>
                </div>
                <div className={"switch" + (status ? " on" : "")} />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-f">
          <button className="btn ghost" style={{ flex: ".6" }} onClick={onClose}>Huỷ</button>
          <button className="btn primary" disabled={!valid} onClick={submit}>
            <Icon name="check" size={17} color="#fff" /> {isEdit ? "Lưu thay đổi" : "Tạo phần thưởng"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDelete({ name, onClose, onConfirm }) {
  useEffectEd(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal confirm" onClick={e => e.stopPropagation()}>
        <div className="ci"><Icon name="trash" size={26} /></div>
        <h3>Xoá phần thưởng?</h3>
        <p>Bạn sắp xoá <b>{name}</b>. Hành động này không thể hoàn tác và phần thưởng sẽ biến mất khỏi danh sách đổi quà.</p>
        <div className="row">
          <button className="btn ghost" onClick={onClose}>Huỷ</button>
          <button className="btn danger" onClick={onConfirm}><Icon name="trash" size={16} color="#fff" /> Xoá</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RewardEditor, ConfirmDelete });
