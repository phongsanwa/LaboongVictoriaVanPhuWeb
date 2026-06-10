/* global React, ReactDOM, Icon, QRCanvas, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo, useRef } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const TODAY = new Date(2026, 5, 9); // 09/06/2026
const LS_KEY = "laboong_vouchers_v1";
const LS_BAL = "laboong_balance_v1";

const CATS = {
  voucher: { label: "Voucher", ic: "percent" },
  drink:   { label: "Đồ uống", ic: "cup" },
  upgrade: { label: "Nâng cấp", ic: "sparkle2" },
  gift:    { label: "Quà tặng", ic: "gift" },
};

const GIFTS = [
  { gid: "g1", name: "Trà sữa size L miễn phí", cat: "drink",   points: 450,  grad: "linear-gradient(135deg,#0F623F,#1AA86A)", fine: "Áp dụng 1 ly trà sữa size L bất kỳ. Không kết hợp ưu đãi khác." },
  { gid: "g2", name: "Voucher giảm 30.000đ",    cat: "voucher", points: 300,  grad: "linear-gradient(135deg,#FF8A5B,#FF6FA5)", fine: "Đơn từ 80.000đ. Áp dụng tại quầy và đặt online." },
  { gid: "g3", name: "Thêm topping trân châu",  cat: "upgrade", points: 80,   grad: "linear-gradient(135deg,#A9743F,#C99A6A)", fine: "Tặng 1 phần topping trân châu cho đơn bất kỳ." },
  { gid: "g4", name: "Upsize miễn phí",         cat: "upgrade", points: 120,  grad: "linear-gradient(135deg,#C99A2E,#E0B84A)", fine: "Nâng size M lên L miễn phí, áp dụng mọi món." },
  { gid: "g5", name: "Voucher giảm 50.000đ",    cat: "voucher", points: 500,  grad: "linear-gradient(135deg,#F2598A,#C2477B)", fine: "Đơn từ 150.000đ. Mỗi khách dùng 1 lần." },
  { gid: "g6", name: "Bộ sticker Laboong",      cat: "gift",    points: 200,  grad: "linear-gradient(135deg,#5A8F7B,#7FB8A0)", fine: "Nhận tại quầy khi xuất trình mã voucher." },
];

/* ---- seed wallet (one expiring soon to demo push) ---- */
function iso(d) { return d.toISOString().slice(0, 10); }
function addDays(base, n) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }
function genCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = ""; for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
  return "LB" + s;
}

function seedVouchers() {
  return [
    { id: "v_seed1", gid: "g2", name: "Voucher giảm 30.000đ", cat: "voucher", grad: GIFTS[1].grad, fine: GIFTS[1].fine,
      code: "LB7K2M9XQ", created: iso(addDays(TODAY, -27)), expiry: iso(addDays(TODAY, 2)), status: "active" },
    { id: "v_seed2", gid: "g4", name: "Upsize miễn phí", cat: "upgrade", grad: GIFTS[3].grad, fine: GIFTS[3].fine,
      code: "LB4P8N1RT", created: iso(addDays(TODAY, -10)), expiry: iso(addDays(TODAY, 21)), status: "active" },
    { id: "v_seed3", gid: "g1", name: "Trà sữa size L miễn phí", cat: "drink", grad: GIFTS[0].grad, fine: GIFTS[0].fine,
      code: "LB9X3K7DW", created: iso(addDays(TODAY, -40)), expiry: iso(addDays(TODAY, -5)), status: "used" },
  ];
}

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function daysLeft(expiry) { return Math.ceil((new Date(expiry) - TODAY) / 86400000); }
function fmtD(iso) { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }

function vStatus(v) {
  if (v.status === "used") return "used";
  const dl = daysLeft(v.expiry);
  if (dl < 0) return "expired";
  if (dl <= 3) return "soon";
  return "active";
}

const STATUS_LABEL = { active: "Còn hiệu lực", soon: "Sắp hết hạn", used: "Đã dùng", expired: "Hết hạn" };
const STATUS_CLS = { active: "vs-active", soon: "vs-soon", used: "vs-used", expired: "vs-expired" };

/* ============ Voucher card ============ */
function VoucherCard({ v, open, onToggle, onUse, onCopy }) {
  const st = vStatus(v);
  const dl = daysLeft(v.expiry);
  const cat = CATS[v.cat];
  return (
    <div className={"vou " + st + (open ? " open" : "")}>
      <div className="vou-main" onClick={onToggle}>
        <div className="vou-strip" style={{ background: v.grad }}><span className="ti"><Icon name={cat.ic} size={28} color="#fff" /></span></div>
        <div className="vou-perf" />
        <div className="vou-info">
          <div className="vou-name">{v.name}</div>
          <div className="vou-meta">
            <span className={"vou-status " + STATUS_CLS[st]}>{STATUS_LABEL[st]}</span>
            <span className={"vou-exp" + (st === "soon" ? " soon" : "")}>
              <Icon name="clock" size={13} color="currentColor" />
              {st === "expired" ? "Hết hạn " + fmtD(v.expiry) : st === "used" ? "Đã sử dụng" : st === "soon" ? (dl <= 0 ? "Hết hạn hôm nay" : `Còn ${dl} ngày`) : "HSD " + fmtD(v.expiry)}
            </span>
          </div>
        </div>
        <div className="vou-chev"><Icon name="chev" size={18} /></div>
      </div>
      <div className="vou-detail">
        <div className="vou-detail-in">
          <div className="vou-qr"><QRCanvas /></div>
          <div className="vou-code-wrap">
            <div className="vou-code-l">Mã voucher</div>
            <div className="vou-code">
              <span className="code">{v.code}</span>
              <button className="vou-copy" onClick={(e) => { e.stopPropagation(); onCopy(v.code); }} title="Sao chép"><Icon name="copy" size={16} /></button>
            </div>
            <div className="vou-fine">{v.fine}</div>
            {(st === "active" || st === "soon") &&
              <button className="vou-use-btn" onClick={(e) => { e.stopPropagation(); onUse(v); }}>Đưa mã cho nhân viên · Dùng ngay</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ App ============ */
function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [tab, setTab] = useState("redeem");
  const [balance, setBalance] = useState(() => load(LS_BAL, 2450));
  const [vouchers, setVouchers] = useState(() => load(LS_KEY, null) || seedVouchers());
  const [flow, setFlow] = useState(null); // {step:'confirm'|'success', gift, voucher}
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState(null);
  const [dismissPush, setDismissPush] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(vouchers)); }, [vouchers]);
  useEffect(() => { localStorage.setItem(LS_BAL, JSON.stringify(balance)); }, [balance]);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") setFlow(null); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const expiringSoon = useMemo(() => vouchers.filter(v => vStatus(v) === "soon"), [vouchers]);
  const activeCount = useMemo(() => vouchers.filter(v => ["active", "soon"].includes(vStatus(v))).length, [vouchers]);

  const confirmRedeem = (g) => setFlow({ step: "confirm", gift: g });

  const createVoucher = () => {
    const g = flow.gift;
    const v = {
      id: "v_" + Date.now(), gid: g.gid, name: g.name, cat: g.cat, grad: g.grad, fine: g.fine,
      code: genCode(), created: iso(TODAY), expiry: iso(addDays(TODAY, 30)), status: "active",
    };
    setVouchers(list => [v, ...list]);
    setBalance(b => b - g.points);
    setFlow({ step: "success", voucher: v });
  };

  const finishFlow = () => { setFlow(null); setTab("wallet"); };

  const useVoucher = (v) => {
    setVouchers(list => list.map(x => x.id === v.id ? { ...x, status: "used" } : x));
    flash(`Đã sử dụng "${v.name}"`);
  };
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
            <div className="hdr-title">Đổi quà</div>
            <div className="hdr-sub">Đổi điểm & quản lý voucher</div>
          </div>
          <div className="hdr-bal">
            <Icon name="coin" size={20} color="#fff" />
            <div><div className="bn tnum">{fmt(balance)}</div><div className="bl">điểm của bạn</div></div>
          </div>
        </div>
      </header>

      <main className="app">
        <div className="tabs">
          <button className={"tab" + (tab === "redeem" ? " on" : "")} onClick={() => setTab("redeem")}>
            <Icon name="gift" size={18} color="currentColor" /> Đổi quà
          </button>
          <button className={"tab" + (tab === "wallet" ? " on" : "")} onClick={() => setTab("wallet")}>
            <Icon name="ticket" size={18} color="currentColor" /> Voucher của tôi
            {activeCount > 0 && <span className="cnt">{activeCount}</span>}
          </button>
        </div>

        {/* expiry push banner */}
        {expiringSoon.length > 0 && !dismissPush && (
          <div className="push-banner">
            <div className="pi"><Icon name="bellpush" size={20} color="#fff" /></div>
            <div style={{ minWidth: 0 }}>
              <div className="pt">{expiringSoon.length} voucher sắp hết hạn</div>
              <div className="pd">
                "{expiringSoon[0].name}" {(() => { const dl = daysLeft(expiringSoon[0].expiry); return dl <= 0 ? "hết hạn hôm nay" : `còn ${dl} ngày`; })()} — dùng ngay kẻo lỡ!
              </div>
            </div>
            <button className="px" onClick={() => { setTab("wallet"); }} title="Xem">{tab === "wallet" ? <span onClick={(e)=>{e.stopPropagation();setDismissPush(true);}}><Icon name="close" size={16} /></span> : <Icon name="chev" size={16} />}</button>
          </div>
        )}

        {tab === "redeem" && (<>
          <div className="sec-h"><h2>Chọn quà để đổi</h2><span className="hint">Dùng điểm tạo voucher ngay</span></div>
          <div className="grid">
            {GIFTS.map(g => {
              const can = g.points <= balance;
              return (
                <div className={"gift" + (can ? "" : " locked")} key={g.gid}>
                  <div className="gift-thumb" style={{ background: g.grad }}><span className="ti"><Icon name={CATS[g.cat].ic} size={36} color="#fff" /></span></div>
                  <div className="gift-body">
                    <div className="gift-cat">{CATS[g.cat].label}</div>
                    <div className="gift-name">{g.name}</div>
                  </div>
                  <div className="gift-foot">
                    <div className="gift-pts"><span className="p tnum">{fmt(g.points)}</span><span className="u">điểm</span></div>
                    {can
                      ? <button className="gift-btn can" onClick={() => confirmRedeem(g)}><Icon name="gift" size={14} color="#fff" /> Đổi ngay</button>
                      : <button className="gift-btn cant" disabled>Thiếu {fmt(g.points - balance)} điểm</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

        {tab === "wallet" && (<>
          <div className="sec-h"><h2>Voucher của tôi</h2><span className="hint">{vouchers.length} voucher</span></div>
          {vouchers.length === 0 ? (
            <div className="wallet-empty">
              <div className="ei"><Icon name="ticket" size={26} /></div>
              Bạn chưa có voucher nào.
              <div><button className="gobtn" onClick={() => setTab("redeem")}><Icon name="gift" size={16} color="#fff" /> Đổi quà ngay</button></div>
            </div>
          ) : (
            <div className="wallet">
              {vouchers.map(v => (
                <VoucherCard key={v.id} v={v} open={openId === v.id}
                  onToggle={() => setOpenId(id => id === v.id ? null : v.id)}
                  onUse={useVoucher} onCopy={copyCode} />
              ))}
            </div>
          )}
        </>)}
      </main>

      {/* ===== redeem flow ===== */}
      {flow && (
        <div className="scrim" onClick={() => flow.step === "confirm" && setFlow(null)}>
          <div className="flow" onClick={e => e.stopPropagation()}>
            {flow.step === "confirm" && (<>
              <div className="flow-thumb" style={{ background: flow.gift.grad }}>
                <button className="flow-x" onClick={() => setFlow(null)}>×</button>
                <span className="ti"><Icon name={CATS[flow.gift.cat].ic} size={46} color="#fff" /></span>
              </div>
              <div className="flow-b">
                <div className="flow-name">{flow.gift.name}</div>
                <div className="flow-cost"><Icon name="coin" size={17} color="var(--brand)" /> {fmt(flow.gift.points)} điểm</div>
                <div className="flow-bal">Số dư sau khi đổi: <b>{fmt(balance)} → {fmt(balance - flow.gift.points)} điểm</b></div>
                <div className="flow-actions">
                  <button className="flow-cancel" onClick={() => setFlow(null)}>Huỷ</button>
                  <button className="flow-confirm" onClick={createVoucher}>Xác nhận đổi</button>
                </div>
              </div>
            </>)}

            {flow.step === "success" && (<>
              <div className="flow-success">
                <div className="success-h">
                  <div className="success-check"><Icon name="check" size={34} color="#fff" /></div>
                  <h3>Đổi quà thành công!</h3>
                  <p>Voucher đã được lưu vào ví của bạn</p>
                </div>
                <div className="success-qr"><QRCanvas /><div className="qr-logo">L</div></div>
                <div className="success-name">{flow.voucher.name}</div>
                <div className="success-code">
                  <div className="l">Mã voucher</div>
                  <div className="c">
                    <span className="code">{flow.voucher.code}</span>
                    <button className="cp" onClick={() => copyCode(flow.voucher.code)} title="Sao chép"><Icon name="copy" size={16} /></button>
                  </div>
                </div>
                <div className="success-exp"><Icon name="clock" size={14} color="var(--ink-2)" /> Hạn sử dụng đến {fmtD(flow.voucher.expiry)} (30 ngày)</div>
                <div className="success-done"><button onClick={finishFlow}>Xem trong ví của tôi</button></div>
              </div>
            </>)}
          </div>
        </div>
      )}

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
