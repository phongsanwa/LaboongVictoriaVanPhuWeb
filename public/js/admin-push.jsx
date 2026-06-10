/* global React, Icon, CAMP_TYPES, AUDIENCES, fmt */
const { useState: useStateP, useEffect: useEffectP } = React;

function PushComposer({ campaign, onClose, onSend }) {
  const aud = AUDIENCES[campaign.audience];
  const t = CAMP_TYPES[campaign.type];

  const defTitle = campaign.name;
  const defBody = campaign.type === "x2"
    ? "Hôm nay tích điểm gấp đôi! Ghé Laboong và gọi món yêu thích ngay 🧋"
    : campaign.type === "discount"
      ? `Ưu đãi giảm ${campaign.value || 25}% đang chờ bạn. Đặt ngay kẻo lỡ!`
      : "Bạn vừa nhận một voucher mới từ Laboong. Mở app để xem nhé!";

  const [title, setTitle] = useStateP(defTitle);
  const [body, setBody] = useStateP(defBody);

  useEffectP(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const valid = title.trim() && body.trim();

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div className="mh-ic"><Icon name="bellpush" size={20} /></div>
          <div>
            <h3>Gửi thông báo đẩy</h3>
            <p>Chiến dịch: {campaign.name}</p>
          </div>
          <button className="x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="modal-b">
          <div className="push-target">
            <div className="pti"><Icon name="target" size={22} color="#fff" /></div>
            <div>
              <div className="ptn tnum">{fmt(aud.size)} người</div>
              <div className="ptl">Đối tượng nhận · {aud.label}</div>
            </div>
          </div>

          <div className="push-grid">
            <div>
              <div className="fld">
                <label>Tiêu đề thông báo</label>
                <input className="inp" value={title} maxLength={50} onChange={e => setTitle(e.target.value)} />
                <div className="char-count">{title.length}/50</div>
              </div>
              <div className="fld" style={{ marginBottom: 6 }}>
                <label>Nội dung</label>
                <textarea className="inp" value={body} maxLength={140} onChange={e => setBody(e.target.value)} />
                <div className="char-count">{body.length}/140</div>
              </div>
              <div className="switch-row" style={{ cursor: "default" }}>
                <div>
                  <div className="sl">Gửi ngay</div>
                  <div className="sd">Thông báo được đẩy tới {fmt(aud.size)} thiết bị tức thì</div>
                </div>
                <div className="switch on" />
              </div>
            </div>

            <div>
              <div className="phone-prev">
                <div className="phone-time">9:41</div>
                <div className="notif">
                  <div className="notif-h">
                    <span className="notif-app">L</span>
                    <span className="notif-app-name">Laboong</span>
                    <span className="notif-time">bây giờ</span>
                  </div>
                  <div className="notif-title">{title || "Tiêu đề thông báo"}</div>
                  <div className="notif-body">{body || "Nội dung thông báo sẽ hiển thị ở đây."}</div>
                </div>
                <div className="push-label">Xem trước trên điện thoại</div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-f">
          <button className="btn ghost" style={{ flex: ".5" }} onClick={onClose}>Huỷ</button>
          <button className="btn primary" disabled={!valid} onClick={() => onSend(title.trim(), aud.size)}>
            <Icon name="send" size={17} color="#fff" /> Gửi tới {fmt(aud.size)} người
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PushComposer });
