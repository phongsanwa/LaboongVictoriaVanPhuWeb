/* global React, Icon, CAMP_TYPES, AUDIENCES, CAMP_REWARDS, fmt */
const { useState: useStateW, useEffect: useEffectW } = React;

const REWARD_CAT_LABEL = { drink: "Đồ uống", voucher: "Voucher", gift: "Quà tặng", upgrade: "Nâng cấp", tier_benefit: "Hạng thành viên" };

function RewardPicker({ rewardId, setRewardId, grad }) {
  const rewardsByCategory = CAMP_REWARDS.reduce((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});
  const selectedReward = CAMP_REWARDS.find(r => r.id === rewardId);

  if (CAMP_REWARDS.length === 0) {
    return (
      <div className="preview" style={{ marginTop: 4 }}>
        <div className="pav" style={{ background: grad }}><Icon name="ticket" size={20} color="#fff" /></div>
        <div><div className="pl">Chưa có phần thưởng</div><div className="pcalc">Vui lòng tạo phần thưởng trong mục <b>Đổi quà</b> trước.</div></div>
      </div>
    );
  }

  return (
    <>
      <div className="reward-pick">
        {Object.entries(rewardsByCategory).map(([cat, rewards]) => (
          <div key={cat}>
            <div className="reward-cat-hd">{REWARD_CAT_LABEL[cat] || cat}</div>
            {rewards.map(r => (
              <div key={r.id} className={"reward-opt" + (rewardId === r.id ? " on" : "")} onClick={() => setRewardId(r.id)}>
                <div className="reward-ic" style={{ background: "linear-gradient(135deg,#C99A2E,#E0B84A)" }}>
                  {r.image
                    ? <img src={r.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                    : <Icon name="ticket" size={18} color="#fff" />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="reward-name">{r.name}</div>
                  <div className="reward-pts">{fmt(r.points)} điểm</div>
                </div>
                <span className="radio" />
              </div>
            ))}
          </div>
        ))}
      </div>
      {selectedReward && (
        <div className="preview" style={{ marginTop: 10 }}>
          <div className="pav" style={{ background: grad }}><Icon name="ticket" size={20} color="#fff" /></div>
          <div>
            <div className="pl">Đã chọn</div>
            <div className="pcalc">Khách sẽ nhận <span className="to">{selectedReward.name}</span> miễn phí</div>
          </div>
        </div>
      )}
    </>
  );
}

function CampaignWizard({ initial, onClose, onSave }) {
  const isEdit = !!initial;
  const [step, setStep] = useStateW(0);
  const [name, setName] = useStateW(initial?.name || "");
  const [type, setType] = useStateW(initial?.type || "x2");
  const [value, setValue] = useStateW(initial?.value || 2);
  const [bonusPoints, setBonusPoints] = useStateW(initial?.bonus_points ?? 200);
  const [windowDays, setWindowDays] = useStateW(initial?.window_days ?? 0);
  const [rewardId, setRewardId] = useStateW(initial?.reward_id ?? null);
  const [start, setStart] = useStateW(initial?.start || "2026-06-10");
  const [end, setEnd] = useStateW(initial?.end || "2026-12-31");
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

  const canNext = step === 0
    ? name.trim() && start && end
    : step === 1 && type === "voucher"
      ? rewardId !== null
      : true;

  const fmtD = (iso) => { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

  const submit = () => {
    onSave({
      ...(initial || {}),
      name: name.trim(), type,
      value: (type === "discount" || type === "x2") ? Number(value) : undefined,
      bonus_points: type === "birthday" ? Number(bonusPoints) : undefined,
      window_days: type === "birthday" ? Number(windowDays) : undefined,
      reward_id: (type === "voucher" || type === "birthday") ? rewardId : undefined,
      start, end, condition: condition.trim() || CAMP_TYPES[type].label,
      audience, reach: AUDIENCES[audience].size,
    });
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wizard" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name={type === "birthday" ? "cake" : "rocket"} size={20} /></div>
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
                  <div key={k} className={"type-opt" + (type === k ? " on" : "")} onClick={() => {
                    setType(k);
                    if (k === "x2") setValue(v => (v > 10 || v < 1) ? 2 : v);
                    if (k === "discount") setValue(v => (v > 100 || v < 1) ? 25 : v);
                  }}>
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
              <div className="fld">
                <label>Hệ số nhân điểm</label>
                <div className="amt-row">
                  <input className="inp" type="number" min="1.1" max="10" step="0.5" value={value}
                    onChange={e => setValue(e.target.value.replace(/[^0-9.]/g, ""))} />
                  <span style={{ marginLeft: 10, fontWeight: 700, color: "var(--brand)", fontSize: 15, whiteSpace: "nowrap" }}>× điểm</span>
                </div>
                <div className="chips">
                  {[1.5, 2, 3, 4, 5].map(v => (
                    <button key={v} className={"chip" + (Number(value) === v ? " on" : "")} onClick={() => setValue(v)}>{v}×</button>
                  ))}
                </div>
                <div className="preview" style={{ marginTop: 12 }}>
                  <div className="pav" style={{ background: t.grad }}><Icon name="multiply" size={20} color="#fff" /></div>
                  <div>
                    <div className="pl">Cơ chế</div>
                    <div className="pcalc">Khách nhận <span className="to">{Number(value) === 2 ? "gấp đôi" : `gấp ${value} lần`} điểm</span> mỗi giao dịch trong thời gian chiến dịch</div>
                  </div>
                </div>
              </div>
            )}

            {type === "voucher" && (
              <div className="fld">
                <label>Chọn voucher / phần thưởng tặng kèm <span style={{ color: "var(--danger, #E53935)", fontWeight: 700 }}>*</span></label>
                <RewardPicker rewardId={rewardId} setRewardId={setRewardId} grad={t.grad} />
              </div>
            )}

            {type === "birthday" && (<>
              <div className="fld">
                <label>Điểm thưởng sinh nhật</label>
                <div className="amt-row">
                  <input className="inp" type="number" min="0" step="50" value={bonusPoints}
                    onChange={e => setBonusPoints(e.target.value.replace(/[^0-9]/g, ""))} />
                  <span style={{ marginLeft: 10, fontWeight: 700, color: "var(--brand)", fontSize: 15, whiteSpace: "nowrap" }}>điểm</span>
                </div>
                <div className="chips">
                  {[100, 200, 300, 500, 1000].map(v => (
                    <button key={v} className={"chip" + (Number(bonusPoints) === v ? " on" : "")} onClick={() => setBonusPoints(v)}>{fmt(v)}</button>
                  ))}
                </div>
              </div>

              <div className="fld">
                <label>Cửa sổ tặng quà (ngày trước/sau sinh nhật)</label>
                <div className="amt-row">
                  <input className="inp" type="number" min="0" max="30" value={windowDays}
                    onChange={e => setWindowDays(e.target.value.replace(/[^0-9]/g, ""))} />
                  <span style={{ marginLeft: 10, color: "var(--ink-2)", fontSize: 14, whiteSpace: "nowrap" }}>ngày (0 = đúng ngày sinh nhật)</span>
                </div>
                <div className="chips">
                  {[0, 1, 3, 7].map(v => (
                    <button key={v} className={"chip" + (Number(windowDays) === v ? " on" : "")} onClick={() => setWindowDays(v)}>
                      {v === 0 ? "Đúng ngày" : `±${v} ngày`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fld">
                <label>Voucher / quà tặng kèm <span style={{ color: "var(--ink-3)", fontSize: 12, fontWeight: 400 }}>(tuỳ chọn)</span></label>
                <RewardPicker rewardId={rewardId} setRewardId={setRewardId} grad={t.grad} />
                {rewardId !== null && (
                  <button className="chip" style={{ marginTop: 6 }} onClick={() => setRewardId(null)}>
                    <Icon name="close" size={12} /> Bỏ chọn voucher
                  </button>
                )}
              </div>

              <div className="preview" style={{ marginTop: 4 }}>
                <div className="pav" style={{ background: t.grad }}><Icon name="cake" size={20} color="#fff" /></div>
                <div>
                  <div className="pl">Tóm tắt</div>
                  <div className="pcalc">
                    Mỗi ngày lúc 08:00, hệ thống tự động tặng
                    {Number(bonusPoints) > 0 && <> <span className="to">{fmt(Number(bonusPoints))} điểm</span></>}
                    {Number(bonusPoints) > 0 && rewardId ? " và" : ""}
                    {rewardId ? <> <span className="to">voucher</span></> : ""}
                    {" "}cho khách có sinh nhật{Number(windowDays) > 0 ? ` trong vòng ±${windowDays} ngày` : " hôm nay"}.
                    Mỗi khách chỉ nhận <b>1 lần / năm</b>.
                  </div>
                </div>
              </div>
            </>)}
          </>)}

          {step === 2 && (<>
            <div className="fld">
              <label>Chọn đối tượng nhận chiến dịch</label>
              {type === "birthday" && (
                <div className="birthday-note">
                  <Icon name="info" size={15} color="var(--brand)" />
                  Chiến dịch sinh nhật sẽ tự động lọc khách có ngày sinh nhật phù hợp trong đối tượng đã chọn.
                </div>
              )}
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
              <div className="rr">
                <span className="rk">Loại</span>
                <span className="rv">
                  {t.label}
                  {type === "discount" ? ` · ${value}%` : type === "x2" ? ` · ×${value}` : ""}
                  {type === "birthday" && Number(bonusPoints) > 0 ? ` · ${fmt(Number(bonusPoints))} điểm` : ""}
                </span>
              </div>
              {type === "birthday" && Number(windowDays) > 0 && (
                <div className="rr"><span className="rk">Cửa sổ</span><span className="rv">±{windowDays} ngày</span></div>
              )}
              {(type === "voucher" || type === "birthday") && rewardId && (
                <div className="rr"><span className="rk">Voucher</span><span className="rv">{CAMP_REWARDS.find(r => r.id === rewardId)?.name || "—"}</span></div>
              )}
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
