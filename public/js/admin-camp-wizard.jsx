/* global React, Icon, CAMP_TYPES, AUDIENCES, fmt */
const { useState: useStateW, useEffect: useEffectW } = React;

function CampaignWizard({ initial, onClose, onSave }) {
  const isEdit = !!initial;
  const [step, setStep] = useStateW(0);
  const [name, setName] = useStateW(initial?.name || "");
  const [type, setType] = useStateW(initial?.type || "x2");
  const [value, setValue] = useStateW(initial?.value || 25);
  const [start, setStart] = useStateW(initial?.start || "2026-06-10");
  const [end, setEnd] = useStateW(initial?.end || "2026-06-30");
  const [condition, setCondition] = useStateW(initial?.condition || "");
  const [audience, setAudience] = useStateW(initial?.audience || "all");

  useEffectW(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const STEPS = ["Thông tin", "Loại & điều kiện", "Đối tượng"];
  const t = CAMP_TYPES[type];
  const aud = AUDIENCES[audience];

  const canNext = step === 0 ? name.trim() && start && end : true;
  const fmtD = (iso) => { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

  const submit = () => {
    onSave({
      ...(initial || {}),
      name: name.trim(), type, value: type === "discount" ? Number(value) : undefined,
      start, end, condition: condition.trim() || CAMP_TYPES[type].label,
      audience, reach: AUDIENCES[audience].size,
    });
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wizard" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name="rocket" size={20} /></div>
          <div>
            <h3>{isEdit ? "Chỉnh sửa chiến dịch" : "Tạo chiến dịch mới"}</h3>
            <p>Bước {step + 1}/3 · {STEPS[step]}</p>
          </div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="steps">
          {STEPS.map((s, i) => (
            <div key={s} className={"step" + (i === step ? " on" : i < step ? " done" : "")}>
              <span className="sn">{i < step ? <Icon name="check" size={14} color="currentColor" /> : i + 1}</span>
              <span className="st">{s}</span>
              {i < STEPS.length - 1 && <span className="bar" />}
            </div>
          ))}
        </div>

        <div className="modal-b">
          {step === 0 && (<>
            <div className="fld">
              <label>Tên chiến dịch</label>
              <input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Thứ 4 nhân đôi điểm" autoFocus />
            </div>
            <div className="two-col">
              <div className="fld"><label>Ngày bắt đầu</label><input className="inp" type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
              <div className="fld"><label>Ngày kết thúc</label><input className="inp" type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} /></div>
            </div>
            <div className="fld" style={{ marginBottom: 4 }}>
              <label>Điều kiện áp dụng</label>
              <textarea className="inp" value={condition} onChange={e => setCondition(e.target.value)} placeholder="VD: Áp dụng mọi đơn vào thứ 4 hàng tuần, không giới hạn giá trị" />
            </div>
          </>)}

          {step === 1 && (<>
            <div className="fld">
              <label>Loại chiến dịch</label>
              <div className="type-pick">
                {Object.entries(CAMP_TYPES).map(([k, m]) => (
                  <div key={k} className={"type-opt" + (type === k ? " on" : "")} onClick={() => setType(k)}>
                    <div className="toi" style={{ background: m.grad }}><Icon name={m.ic} size={22} color="#fff" /></div>
                    <div className="tol">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {type === "discount" && (
              <div className="fld">
                <label>Mức giảm (%)</label>
                <div className="amt-row"><input className="inp" type="number" min="1" max="100" value={value} onChange={e => setValue(e.target.value.replace(/[^0-9]/g, ""))} /></div>
                <div className="chips">{[10, 15, 20, 25, 30, 40].map(v => <button key={v} className={"chip" + (Number(value) === v ? " on" : "")} onClick={() => setValue(v)}>{v}%</button>)}</div>
              </div>
            )}
            {type === "x2" && (
              <div className="preview" style={{ marginTop: 4 }}>
                <div className="pav" style={{ background: t.grad }}><Icon name="multiply" size={20} color="#fff" /></div>
                <div><div className="pl">Cơ chế</div><div className="pcalc">Khách nhận <span className="to">gấp đôi điểm</span> mỗi giao dịch trong thời gian chiến dịch</div></div>
              </div>
            )}
            {type === "voucher" && (
              <div className="preview" style={{ marginTop: 4 }}>
                <div className="pav" style={{ background: t.grad }}><Icon name="ticket" size={20} color="#fff" /></div>
                <div><div className="pl">Cơ chế</div><div className="pcalc">Tự động <span className="to">tặng voucher</span> cho khách thuộc đối tượng mục tiêu</div></div>
              </div>
            )}
          </>)}

          {step === 2 && (<>
            <div className="fld">
              <label>Chọn đối tượng nhận chiến dịch</label>
              <div className="aud-list">
                {Object.entries(AUDIENCES).map(([k, m]) => (
                  <div key={k} className={"aud-opt" + (audience === k ? " on" : "")} onClick={() => setAudience(k)}>
                    <span className="ai"><Icon name={m.ic} size={17} color="currentColor" /></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="al">{m.label}</div>
                      <div className="ad">{k === "all" ? "Toàn bộ thành viên đang hoạt động" : k === "new" ? "Tham gia trong 30 ngày gần nhất" : "Khách thuộc hạng này"}</div>
                    </div>
                    <span className="acount">{fmt(m.size)}</span>
                    <span className="radio" />
                  </div>
                ))}
              </div>
            </div>
            <div className="review-box">
              <div className="rr"><span className="rk">Chiến dịch</span><span className="rv">{name || "—"}</span></div>
              <div className="rr"><span className="rk">Loại</span><span className="rv">{t.label}{type === "discount" ? ` · ${value}%` : ""}</span></div>
              <div className="rr"><span className="rk">Thời gian</span><span className="rv">{fmtD(start)} → {fmtD(end)}</span></div>
              <div className="rr"><span className="rk">Đối tượng</span><span className="rv">{aud.label} · {fmt(aud.size)} người</span></div>
            </div>
          </>)}
        </div>

        <div className="modal-f">
          {step > 0
            ? <button className="btn ghost" style={{ flex: ".6" }} onClick={() => setStep(s => s - 1)}><Icon name="arrowleft" size={16} /> Quay lại</button>
            : <button className="btn ghost" style={{ flex: ".6" }} onClick={onClose}>Huỷ</button>}
          {step < 2
            ? <button className="btn primary" disabled={!canNext} onClick={() => setStep(s => s + 1)}>Tiếp tục <Icon name="arrow" size={16} color="#fff" /></button>
            : <button className="btn primary" onClick={submit}><Icon name="check" size={17} color="#fff" /> {isEdit ? "Lưu chiến dịch" : "Tạo & lên lịch"}</button>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CampaignWizard });
