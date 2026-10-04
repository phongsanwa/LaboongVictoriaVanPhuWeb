/* global React, ReactDOM, Icon, QRCanvas, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useMemo, useEffect } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const WALLET = window.WALLET_DATA || { balance: 0, vouchers: [] };

const CATS = {
  voucher: { label: "Voucher", ic: "percent" },
  drink:   { label: "Đồ uống", ic: "cup" },
  upgrade: { label: "Nâng cấp", ic: "sparkle2" },
  gift:    { label: "Quà tặng", ic: "gift" },
};

const GRADIENTS = [
  "linear-gradient(135deg,#0F623F,#1AA86A)",
  "linear-gradient(135deg,#A9743F,#C99A6A)",
  "linear-gradient(135deg,#FF8A5B,#FF6FA5)",
  "linear-gradient(135deg,#C99A2E,#E0B84A)",
  "linear-gradient(135deg,#E08A2B,#F2B14A)",
  "linear-gradient(135deg,#F2598A,#C2477B)",
  "linear-gradient(135deg,#5A8F7B,#7FB8A0)",
  "linear-gradient(135deg,#1E8FA8,#4FC3D9)",
  "linear-gradient(135deg,#3E7CB1,#6FB1E0)",
  "linear-gradient(135deg,#6B4FA0,#9B7FD4)",
  "linear-gradient(135deg,#9B4DA0,#C77FD4)",
  "linear-gradient(135deg,#D4584B,#F2826F)",
];
function gradFor(id) { return GRADIENTS[id % GRADIENTS.length]; }

function daysLeft(expiry) {
  if (!expiry) return 999;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(expiry) - today) / 86400000);
}
function fmtD(iso) { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }

function vStatus(v) {
  if (v.status === "used") return "used";
  if (v.status === "expired") return "expired";
  const dl = daysLeft(v.expiry);
  if (dl < 0) return "expired";
  if (dl <= 3) return "soon";
  return "active";
}

const STATUS_LABEL = { active: "Còn hiệu lực", soon: "Sắp hết hạn", used: "Đã dùng", expired: "Hết hạn" };
const STATUS_CLS = { active: "vs-active", soon: "vs-soon", used: "vs-used", expired: "vs-expired" };

/* ============ Voucher card ============ */
function VoucherCard({ v, open, onToggle, onCopy }) {
  const st = vStatus(v);
  const dl = daysLeft(v.expiry);
  const cat = CATS[v.cat] || CATS.gift;
  return (
    <div className={"vou " + st + (open ? " open" : "")}>
      <div className="vou-main" onClick={onToggle}>
        <div className="vou-strip" style={{ background: gradFor(v.id) }}><span className="ti"><Icon name={cat.ic} size={28} color="#fff" /></span></div>
        <div className="vou-perf" />
        <div className="vou-info">
          <div className="vou-name">{v.name}</div>
          <div className="vou-meta">
            <span className={"vou-status " + STATUS_CLS[st]}>{STATUS_LABEL[st]}</span>
            <span className={"vou-exp" + (st === "soon" ? " soon" : "")}>
              <Icon name="clock" size={13} color="currentColor" />
              {st === "expired" ? "Hết hạn " + fmtD(v.expiry) : st === "used" ? "Đã sử dụng" : st === "soon" ? (dl <= 0 ? "Hết hạn hôm nay" : `Còn ${dl} ngày`) : (v.expiry ? "HSD " + fmtD(v.expiry) : "Không thời hạn")}
            </span>
          </div>
        </div>
        <div className="vou-chev"><Icon name="chev" size={18} /></div>
      </div>
      <div className="vou-detail">
        <div className="vou-detail-in">
          <div className="vou-qr"><QRCanvas value={v.code} /><div className="qr-logo">L</div></div>
          <div className="vou-code-wrap">
            <div className="vou-code-l">Mã voucher</div>
            <div className="vou-code">
              <span className="code">{v.code}</span>
              <button className="vou-copy" onClick={(e) => { e.stopPropagation(); onCopy(v.code); }} title="Sao chép"><Icon name="copy" size={16} /></button>
            </div>
            {v.fine && <div className="vou-fine">{v.fine}</div>}
            {(st === "active" || st === "soon") &&
              <div className="vou-hint"><Icon name="info" size={15} color="var(--brand)" /> Đưa mã QR này cho nhân viên tại quầy để sử dụng</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ App ============ */
function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState(null);
  const [dismissPush, setDismissPush] = useState(false);
  const vouchers = WALLET.vouchers || [];

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const expiringSoon = useMemo(() => vouchers.filter(v => vStatus(v) === "soon"), [vouchers]);

  const copyCode = (code) => {
    if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
    flash(`Đã sao chép mã ${code}`);
  };

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <a className="back" href={NAV_URLS.home} title="Quay lại"><Icon name="arrowleft" size={20} /></a>
          <div>
            <div className="hdr-title">Voucher của tôi</div>
            <div className="hdr-sub">Quà đã đổi & voucher đang giữ</div>
          </div>
          <div className="hdr-bal">
            <Icon name="coin" size={20} color="#fff" />
            <div><div className="bn tnum">{fmt(WALLET.balance)}</div><div className="bl">điểm của bạn</div></div>
          </div>
        </div>
      </header>

      <main className="app">
        {expiringSoon.length > 0 && !dismissPush && (
          <div className="push-banner">
            <div className="pi"><Icon name="bellpush" size={20} color="#fff" /></div>
            <div style={{ minWidth: 0 }}>
              <div className="pt">{expiringSoon.length} voucher sắp hết hạn</div>
              <div className="pd">
                "{expiringSoon[0].name}" {(() => { const dl = daysLeft(expiringSoon[0].expiry); return dl <= 0 ? "hết hạn hôm nay" : `còn ${dl} ngày`; })()} — dùng ngay kẻo lỡ!
              </div>
            </div>
            <button className="px" onClick={() => setDismissPush(true)} title="Đóng"><Icon name="close" size={16} /></button>
          </div>
        )}

        <div className="sec-h"><h2>Voucher của tôi</h2><span className="hint">{vouchers.length} voucher</span></div>

        {vouchers.length === 0 ? (
          <div className="wallet-empty">
            <div className="ei"><Icon name="ticket" size={26} /></div>
            Bạn chưa có voucher nào.
            <div><a className="gobtn" href={NAV_URLS.catalog}><Icon name="gift" size={16} color="#fff" /> Đổi quà ngay</a></div>
          </div>
        ) : (
          <div className="wallet">
            {vouchers.map(v => (
              <VoucherCard key={v.id} v={v} open={openId === v.id}
                onToggle={() => setOpenId(id => id === v.id ? null : v.id)}
                onCopy={copyCode} />
            ))}
          </div>
        )}
      </main>

      {toast && <div className="toast"><span className="tc"><Icon name="check" size={15} color="#fff" /></span>{toast}</div>}

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F","#07432A"],["#005A36","#003D24"],["#7A4A28","#56331A"],["#6B4FA0","#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
