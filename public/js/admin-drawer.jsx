/* global React, Icon, TIERS, TIER_ORDER, STORES, avColor, initials, fmtVND, fmtDate, fmt */

function csrfTokenDr() {
  return document.querySelector('meta[name="csrf-token"]')?.content || "";
}

/* ---- Edit Customer Modal ---- */
function EditCustomerModal({ c, onClose, onSaved }) {
  const { useState: useSt, useEffect: useEff } = React;
  const [name, setName] = useSt(c.name || "");
  const [phone, setPhone] = useSt(c.phone || "");
  const [email, setEmail] = useSt(c.email || "");
  const [storeId, setStoreId] = useSt(c.store_id ?? "");
  const [dob, setDob] = useSt(c.date_of_birth || "");
  const [gender, setGender] = useSt(c.gender || "");
  const [status, setStatus] = useSt(c.status === "on" ? "active" : "inactive");
  const [saving, setSaving] = useSt(false);
  const [error, setError] = useSt("");

  useEff(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const valid = name.trim() && phone.trim();

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true); setError("");
    try {
      const res = await fetch(`/admin/customers/${c.customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-CSRF-TOKEN": csrfTokenDr() },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() || null, store_id: storeId || null, date_of_birth: dob || null, gender: gender || null, status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.message || "Lỗi lưu dữ liệu"); setSaving(false); return; }
      onSaved(body.customer);
    } catch { setError("Không thể kết nối máy chủ"); setSaving(false); }
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name="edit" size={20} /></div>
          <div>
            <h3>Chỉnh sửa khách hàng</h3>
            <p>Cập nhật thông tin {c.name}</p>
          </div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-b">
          {error && <div className="modal-err">{error}</div>}

          <div className="two-col">
            <div className="fld">
              <label>Họ và tên</label>
              <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Nguyễn Văn A" autoFocus />
            </div>
            <div className="fld">
              <label>Số điện thoại</label>
              <input className="inp" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912345678" />
            </div>
          </div>

          <div className="fld">
            <label>Email (không bắt buộc)</label>
            <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="khachhang@gmail.com" />
          </div>

          <div className="two-col">
            <div className="fld">
              <label>Cửa hàng thường đến</label>
              <select className="inp" value={storeId} onChange={e => setStoreId(e.target.value)}>
                <option value="">— Chưa chọn —</option>
                {STORES.map(s => <option key={s.id ?? s} value={s.id ?? s}>{s.name ?? s}</option>)}
              </select>
            </div>
            <div className="fld">
              <label>Giới tính</label>
              <select className="inp" value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">— Chưa chọn —</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          <div className="fld">
            <label>Ngày sinh (không bắt buộc)</label>
            <input className="inp" type="date" value={dob} onChange={e => setDob(e.target.value)} />
          </div>

          <div className="switch-row" onClick={() => setStatus(s => s === "active" ? "inactive" : "active")} style={{ cursor: "pointer" }}>
            <div>
              <div className="sl">Trạng thái: {status === "active" ? "Active" : "Inactive"}</div>
              <div className="sd">{status === "active" ? "Tài khoản đang hoạt động bình thường" : "Tài khoản bị vô hiệu hoá"}</div>
            </div>
            <div className={"switch" + (status === "active" ? " on" : "")} />
          </div>
        </div>

        <div className="modal-f">
          <button className="btn ghost" style={{ flex: ".6" }} onClick={onClose}>Huỷ</button>
          <button className="btn primary" disabled={!valid || saving} onClick={save}>
            {saving
              ? <span className="spin" style={{ width: 16, height: 16, borderWidth: 2 }} />
              : <><Icon name="check" size={17} color="#fff" /> Lưu thay đổi</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Xác nhận xoá khách hàng ---- */
function ConfirmDeleteCustomer({ c, onClose, onDeleted }) {
  const [deleting, setDeleting] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const doDelete = async () => {
    if (deleting) return;
    setDeleting(true); setErr("");
    try {
      const res = await fetch(`/admin/customers/${c.customerId}`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content || "",
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(body.message || "Không xoá được, vui lòng thử lại"); setDeleting(false); return; }
      onDeleted();
    } catch (e) {
      setErr("Lỗi kết nối, vui lòng thử lại");
      setDeleting(false);
    }
  };

  return (
    <div className="scrim" style={{ zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div className="modal confirm" style={{ background: "var(--card, #fff)", borderRadius: 16, padding: 24, maxWidth: 400, width: "92%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(220,60,60,.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <Icon name="trash" size={26} color="var(--danger, #D4584B)" />
        </div>
        <h3 style={{ margin: "0 0 8px" }}>Xoá khách hàng?</h3>
        <p style={{ margin: "0 0 6px", fontSize: 13.5, color: "var(--ink-2)" }}>
          Bạn sắp xoá vĩnh viễn <b>{c.name}</b> ({c.id}).
        </p>
        <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "var(--danger, #D4584B)" }}>
          Toàn bộ dữ liệu — đơn hàng, điểm tích luỹ, lịch sử đổi quà, voucher, địa chỉ —
          sẽ bị xoá và <b>không thể khôi phục</b>.
        </p>
        {err && <div style={{ fontSize: 12.5, color: "var(--danger, #D4584B)", marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose} disabled={deleting}>Huỷ</button>
          <button className="btn primary" style={{ flex: 1, background: "var(--danger, #D4584B)" }} disabled={deleting} onClick={doDelete}>
            <Icon name="trash" size={15} color="#fff" /> {deleting ? "Đang xoá…" : "Xoá vĩnh viễn"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Drawer ---- */
function Drawer({ c, onClose, onCustomerUpdated, onCustomerDeleted }) {
  const [editing, setEditing] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [customer, setCustomer] = React.useState(c);

  React.useEffect(() => { setCustomer(c); }, [c]);

  React.useEffect(() => {
    const h = e => { if (e.key === "Escape" && !editing) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, editing]);

  const t = TIERS[customer.tier];
  const idx = TIER_ORDER.indexOf(customer.tier);
  const next = idx < TIER_ORDER.length - 1 ? TIERS[TIER_ORDER[idx + 1]] : null;
  const toNext = next ? Math.max(0, next.min - customer.points) : 0;

  const handleSaved = (updated) => {
    const merged = { ...customer, ...updated, tx: customer.tx, orders: customer.orders };
    setCustomer(merged);
    setEditing(false);
    if (onCustomerUpdated) onCustomerUpdated(merged);
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={"Hồ sơ " + customer.name}>
        <div className="dr-head">
          <button className="dr-close" onClick={onClose}><Icon name="close" size={18} color="#fff" /></button>
          <div className="dr-prof">
            <div className="dr-av" style={{ background: avColor(customer.name) }}>{initials(customer.name)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="nm">{customer.name}</div>
              <div className="meta">
                <span>{customer.id}</span><span>·</span>
                <span>{customer.status === "on" ? "Đang hoạt động" : "Ngừng hoạt động"}</span>
              </div>
            </div>
          </div>
          <div className="dr-tierline">
            <span className="dr-chip"><Icon name="star" size={13} color="#fff" /> Hạng {t.label}</span>
            <span className="dr-chip"><Icon name="coin" size={14} color="#fff" /> {fmt(customer.points)} điểm</span>
          </div>
        </div>

        <div className="dr-body">
          <div className="dr-stats">
            <div className="dr-stat"><div className="l">Điểm hiện tại</div><div className="v tnum">{fmt(customer.points)}<small>điểm</small></div></div>
            <div className="dr-stat"><div className="l">Tổng chi tiêu</div><div className="v tnum">{fmtVND(customer.spent)}</div></div>
            <div className="dr-stat"><div className="l">Số lần ghé</div><div className="v tnum">{customer.visits}<small>lần</small></div></div>
            <div className="dr-stat"><div className="l">{next ? "Lên hạng " + next.label : "Hạng cao nhất"}</div><div className="v tnum">{next ? <>{fmt(toNext)}<small>điểm</small></> : "★"}</div></div>
          </div>

          <div className="dr-sec-t">Thông tin hồ sơ</div>
          <div className="dr-info">
            <div className="ir"><div className="ic"><Icon name="phone" size={16} /></div><span className="ik">Số điện thoại</span><span className="iv">{customer.phone}</span></div>
            <div className="ir"><div className="ic"><Icon name="mail" size={16} /></div><span className="ik">Email</span><span className="iv">{customer.email || "—"}</span></div>
            <div className="ir"><div className="ic"><Icon name="pin" size={16} /></div><span className="ik">Cửa hàng thường đến</span><span className="iv">{customer.store}</span></div>
            <div className="ir"><div className="ic"><Icon name="cal" size={16} /></div><span className="ik">Ngày tham gia</span><span className="iv">{fmtDate(customer.joined)}</span></div>
            <div className="ir"><div className="ic"><Icon name="users" size={16} /></div><span className="ik">Trạng thái</span><span className="iv"><span className={"status " + customer.status}>{customer.status === "on" ? "Active" : "Inactive"}</span></span></div>
            <div className="ir"><div className="ic"><Icon name="clock" size={16} /></div><span className="ik">Truy cập</span><span className="iv" style={customer.online ? { color: "#16A34A", fontWeight: 700 } : {}}>{customer.online ? "● Đang online" : ("○ " + (customer.lastSeen || "Chưa truy cập"))}</span></div>
          </div>

          <div className="dr-sec-t">Lịch sử giao dịch ({customer.tx.length})</div>
          <div className="dr-tx">
            {customer.tx.map((x, i) => (
              <div className="tx" key={i}>
                <div className={"txic " + x.type}><Icon name={x.type === "earn" ? "cup" : "gift"} size={19} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="tt">{x.title}</div>
                  <div className="tm">{x.meta}</div>
                </div>
                <div className={"ta " + (x.amt > 0 ? "plus" : "minus")}>{x.amt > 0 ? "+" : "−"}{fmt(Math.abs(x.amt))}</div>
              </div>
            ))}
          </div>

          <div className="dr-sec-t" style={{ marginTop: 18 }}>Lịch sử đơn hàng ({(customer.orders || []).length})</div>
          <div className="dr-tx">
            {(customer.orders || []).length === 0 && (
              <div style={{ padding: "10px 2px", color: "var(--ink-3)", fontSize: 13 }}>Khách chưa có đơn hàng nào.</div>
            )}
            {(customer.orders || []).map((o, i) => (
              <div className="tx" key={i}>
                <div className="txic earn"><Icon name={o.ship ? "truck" : "bag"} size={18} /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="tt">{o.code} · {o.items} món
                    <span style={{
                      marginLeft: 7, fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 999,
                      background: o.status === "CANCELLED" ? "rgba(212,88,75,.12)" : o.status === "COMPLETED" ? "rgba(22,163,74,.12)" : "rgba(0,0,0,.06)",
                      color: o.status === "CANCELLED" ? "#D4584B" : o.status === "COMPLETED" ? "#16A34A" : "var(--ink-2)",
                    }}>{o.statusLabel}</span>
                  </div>
                  <div className="tm">{o.meta}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 13.5, whiteSpace: "nowrap", color: o.status === "CANCELLED" ? "var(--ink-3)" : "var(--ink)", textDecoration: o.status === "CANCELLED" ? "line-through" : "none" }}>{fmt(o.total)}đ</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dr-foot">
          <button className="btn ghost" style={{ flex: "none" }} onClick={onClose}>Đóng</button>
          <button className="btn ghost" style={{ flex: "none", color: "var(--danger, #D4584B)" }} title="Xoá khách hàng" onClick={() => setConfirmDel(true)}>
            <Icon name="trash" size={16} color="var(--danger, #D4584B)" /> Xoá
          </button>
          <button className="btn ghost"><Icon name="gift" size={16} /> Gửi ưu đãi</button>
          <button className="btn primary" onClick={() => setEditing(true)}><Icon name="edit" size={16} color="#fff" /> Chỉnh sửa</button>
        </div>
      </aside>

      {editing && (
        <EditCustomerModal
          c={customer}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
        />
      )}

      {confirmDel && (
        <ConfirmDeleteCustomer
          c={customer}
          onClose={() => setConfirmDel(false)}
          onDeleted={() => {
            setConfirmDel(false);
            if (onCustomerDeleted) onCustomerDeleted(customer);
            onClose();
          }}
        />
      )}
    </>
  );
}

Object.assign(window, { Drawer });
