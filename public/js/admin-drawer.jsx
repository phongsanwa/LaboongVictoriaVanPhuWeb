/* global React, Icon, TIERS, TIER_ORDER, avColor, initials, fmtVND, fmtDate, fmt */

function Drawer({ c, onClose }) {
  React.useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const t = TIERS[c.tier];
  const idx = TIER_ORDER.indexOf(c.tier);
  const next = idx < TIER_ORDER.length - 1 ? TIERS[TIER_ORDER[idx + 1]] : null;
  const toNext = next ? Math.max(0, next.min - c.points) : 0;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={"Hồ sơ " + c.name}>
        <div className="dr-head">
          <button className="dr-close" onClick={onClose}><Icon name="close" size={18} color="#fff" /></button>
          <div className="dr-prof">
            <div className="dr-av" style={{ background: avColor(c.name) }}>{initials(c.name)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="nm">{c.name}</div>
              <div className="meta">
                <span>{c.id}</span><span>·</span>
                <span>{c.status === "on" ? "Đang hoạt động" : "Ngừng hoạt động"}</span>
              </div>
            </div>
          </div>
          <div className="dr-tierline">
            <span className="dr-chip"><Icon name="star" size={13} color="#fff" /> Hạng {t.label}</span>
            <span className="dr-chip"><Icon name="coin" size={14} color="#fff" /> {fmt(c.points)} điểm</span>
          </div>
        </div>

        <div className="dr-body">
          <div className="dr-stats">
            <div className="dr-stat"><div className="l">Điểm hiện tại</div><div className="v tnum">{fmt(c.points)}<small>điểm</small></div></div>
            <div className="dr-stat"><div className="l">Tổng chi tiêu</div><div className="v tnum">{fmtVND(c.spent)}</div></div>
            <div className="dr-stat"><div className="l">Số lần ghé</div><div className="v tnum">{c.visits}<small>lần</small></div></div>
            <div className="dr-stat"><div className="l">{next ? "Lên hạng " + next.label : "Hạng cao nhất"}</div><div className="v tnum">{next ? <>{fmt(toNext)}<small>điểm</small></> : "★"}</div></div>
          </div>

          <div className="dr-sec-t">Thông tin hồ sơ</div>
          <div className="dr-info">
            <div className="ir"><div className="ic"><Icon name="phone" size={16} /></div><span className="ik">Số điện thoại</span><span className="iv">{c.phone}</span></div>
            <div className="ir"><div className="ic"><Icon name="mail" size={16} /></div><span className="ik">Email</span><span className="iv">{c.email}</span></div>
            <div className="ir"><div className="ic"><Icon name="pin" size={16} /></div><span className="ik">Cửa hàng thường đến</span><span className="iv">{c.store}</span></div>
            <div className="ir"><div className="ic"><Icon name="cal" size={16} /></div><span className="ik">Ngày tham gia</span><span className="iv">{fmtDate(c.joined)}</span></div>
            <div className="ir"><div className="ic"><Icon name="users" size={16} /></div><span className="ik">Trạng thái</span><span className="iv"><span className={"status " + c.status}>{c.status === "on" ? "Active" : "Inactive"}</span></span></div>
          </div>

          <div className="dr-sec-t">Lịch sử giao dịch ({c.tx.length})</div>
          <div className="dr-tx">
            {c.tx.map((x, i) => (
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
        </div>

        <div className="dr-foot">
          <button className="btn ghost" style={{ flex: "none" }} onClick={onClose}>Đóng</button>
          <button className="btn ghost"><Icon name="gift" size={16} /> Gửi ưu đãi</button>
          <button className="btn primary"><Icon name="edit" size={16} color="#fff" /> Chỉnh sửa</button>
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { Drawer });
