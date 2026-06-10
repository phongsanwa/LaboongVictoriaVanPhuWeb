/* global React, Icon, CUSTOMERS, ADJUST_REASONS, avColor, initials, fmt */
const { useState: useStateAdj, useMemo: useMemoAdj } = React;

function AdjustModal({ customers, onClose, onConfirm }) {
  const [custId, setCustId] = useStateAdj(customers[0].id);
  const [mode, setMode] = useStateAdj("add");
  const [amount, setAmount] = useStateAdj(100);
  const [reason, setReason] = useStateAdj("");
  const [note, setNote] = useStateAdj("");

  React.useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const cust = useMemoAdj(() => customers.find(c => c.id === custId), [customers, custId]);
  const amt = Number(amount) || 0;
  const delta = mode === "add" ? amt : -amt;
  const result = Math.max(0, cust.points + delta);
  const valid = !!custId && amt > 0 && !!reason;

  const submit = () => {
    if (!valid) return;
    onConfirm({
      cust: { name: cust.name, id: cust.id, tier: cust.tier },
      type: "adjust",
      desc: mode === "add" ? "Cộng điểm thủ công" : "Trừ điểm thủ công",
      reason,
      note: note.trim(),
      source: "Điều chỉnh thủ công",
      staff: "Quản trị viên",
      ts: new Date(),
      points: mode === "add" ? amt : -Math.min(amt, cust.points),
    });
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name="edit" size={21} /></div>
          <div>
            <h3>Điều chỉnh điểm thủ công</h3>
            <p>Cộng hoặc trừ điểm cho khách kèm lý do</p>
          </div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-b">
          <div className="fld">
            <label>Khách hàng</label>
            <div className="sel-wrap">
              <select className="sel-full" value={custId} onChange={e => setCustId(e.target.value)}>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone} ({fmt(c.points)}đ)</option>
                ))}
              </select>
              <span className="chev"><Icon name="chevdown" size={16} /></span>
            </div>
          </div>

          <div className="fld">
            <label>Hành động</label>
            <div className="mode-seg">
              <button className={"mode-btn add" + (mode === "add" ? " on" : "")} onClick={() => setMode("add")}>
                <span className="mi"><Icon name="plus" size={16} color="currentColor" /></span> Cộng điểm
              </button>
              <button className={"mode-btn sub" + (mode === "sub" ? " on" : "")} onClick={() => setMode("sub")}>
                <span className="mi"><Icon name="close" size={15} color="currentColor" /></span> Trừ điểm
              </button>
            </div>
          </div>

          <div className="fld">
            <label>Số điểm</label>
            <div className="amt-row">
              <input className="inp" type="number" min="0" value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" />
            </div>
            <div className="chips">
              {[50, 100, 200, 500, 1000].map(v => (
                <button key={v} className={"chip" + (Number(amount) === v ? " on" : "")} onClick={() => setAmount(v)}>{v}</button>
              ))}
            </div>
          </div>

          <div className="fld">
            <label>Lý do điều chỉnh</label>
            <div className="sel-wrap">
              <select className="sel-full" value={reason} onChange={e => setReason(e.target.value)}>
                <option value="" disabled>— Chọn lý do —</option>
                {ADJUST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <span className="chev"><Icon name="chevdown" size={16} /></span>
            </div>
          </div>

          <div className="fld" style={{ marginBottom: 18 }}>
            <label>Ghi chú (tuỳ chọn)</label>
            <input className="inp" value={note} onChange={e => setNote(e.target.value)} placeholder="Thêm mô tả chi tiết…" />
          </div>

          <div className="preview">
            <div className="pav" style={{ background: avColor(cust.name) }}>{initials(cust.name)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="pl">Số dư của {cust.name.split(" ").slice(-1)[0]} sau điều chỉnh</div>
              <div className="pcalc">
                <span className="tnum">{fmt(cust.points)}</span>
                <span className="arrow"><Icon name="arrow" size={16} /></span>
                <span className={"to tnum" + (delta < 0 ? " neg" : "")}>{fmt(result)} điểm</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-f">
          <button className="btn ghost" style={{ flex: ".6" }} onClick={onClose}>Huỷ</button>
          <button className="btn primary" disabled={!valid} onClick={submit}>
            <Icon name="check" size={17} color="#fff" /> Xác nhận {mode === "add" ? "cộng" : "trừ"} {amt > 0 ? fmt(amt) : ""} điểm
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdjustModal });
