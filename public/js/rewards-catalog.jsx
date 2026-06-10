/* global React, ReactDOM, Icon, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const BALANCE = 2450;

const CATS = {
  all:     { label: "Tất cả", ic: "grid" },
  voucher: { label: "Voucher", ic: "percent" },
  drink:   { label: "Đồ uống", ic: "cup" },
  upgrade: { label: "Nâng cấp", ic: "sparkle2" },
  gift:    { label: "Quà tặng", ic: "gift" },
};

/* order = recency rank (higher = newer) */
const GIFTS = [
  { id: 1,  name: "Trà sữa size L miễn phí",   cat: "drink",   points: 450,  stock: 43,  order: 9,  grad: "linear-gradient(135deg,#0F623F,#1AA86A)", tags: ["hot"] },
  { id: 2,  name: "Thêm topping trân châu",    cat: "upgrade", points: 80,   stock: 312, order: 4,  grad: "linear-gradient(135deg,#A9743F,#C99A6A)", tags: [] },
  { id: 3,  name: "Voucher giảm 30.000đ",      cat: "voucher", points: 300,  stock: 188, order: 7,  grad: "linear-gradient(135deg,#FF8A5B,#FF6FA5)", tags: ["hot"] },
  { id: 4,  name: "Upsize miễn phí mọi đơn",   cat: "upgrade", points: 120,  stock: 358, order: 3,  grad: "linear-gradient(135deg,#C99A2E,#E0B84A)", tags: [] },
  { id: 5,  name: "Trà đào cam sả miễn phí",   cat: "drink",   points: 400,  stock: 12,  order: 6,  grad: "linear-gradient(135deg,#E08A2B,#F2B14A)", tags: ["low"] },
  { id: 6,  name: "Voucher giảm 50.000đ",      cat: "voucher", points: 500,  stock: 116, order: 8,  grad: "linear-gradient(135deg,#F2598A,#C2477B)", tags: [] },
  { id: 7,  name: "Bộ sticker Laboong",        cat: "gift",    points: 200,  stock: 367, order: 11, grad: "linear-gradient(135deg,#5A8F7B,#7FB8A0)", tags: ["new"] },
  { id: 8,  name: "Combo 2 ly Macchiato",      cat: "drink",   points: 800,  stock: 104, order: 5,  grad: "linear-gradient(135deg,#1E8FA8,#4FC3D9)", tags: [] },
  { id: 9,  name: "Túi tote canvas Laboong",   cat: "gift",    points: 1800, stock: 73,  order: 10, grad: "linear-gradient(135deg,#3E7CB1,#6FB1E0)", tags: ["new"] },
  { id: 10, name: "Ly giữ nhiệt Laboong",      cat: "gift",    points: 2500, stock: 8,   order: 2,  grad: "linear-gradient(135deg,#6B4FA0,#9B7FD4)", tags: ["low"] },
  { id: 11, name: "Voucher sinh nhật 70.000đ", cat: "voucher", points: 700,  stock: 189, order: 12, grad: "linear-gradient(135deg,#9B4DA0,#C77FD4)", tags: ["new"] },
  { id: 12, name: "Voucher giảm 100.000đ",     cat: "voucher", points: 1000, stock: 6,   order: 1,  grad: "linear-gradient(135deg,#D4584B,#F2826F)", tags: ["hot", "low"] },
];

const TAG_META = { hot: { label: "Hot", ic: "spark" }, new: { label: "Mới", ic: "sparkle2" }, low: { label: "Sắp hết", ic: "clock" } };

function GiftCard({ g, can, onRedeem }) {
  const cat = CATS[g.cat];
  return (
    <div className={"gift" + (can ? "" : " locked")}>
      <div className="gift-thumb" style={{ background: g.grad }}>
        <span className="ti"><Icon name={cat.ic} size={42} color="#fff" /></span>
        <div className="gift-tags">
          {g.tags.map(t => <span key={t} className={"tag " + t}><Icon name={TAG_META[t].ic} size={11} color="#fff" /> {TAG_META[t].label}</span>)}
        </div>
        {!can && <span className="gift-locklbl"><Icon name="info" size={15} color="#fff" /></span>}
      </div>
      <div className="gift-body">
        <div className="gift-cat">{cat.label}</div>
        <div className="gift-name">{g.name}</div>
        {g.stock <= 15 && <div className="gift-stock"><Icon name="clock" size={12} color="var(--low)" /> Chỉ còn {g.stock} phần</div>}
      </div>
      <div className="gift-foot">
        <div className="gift-pts"><span className="p tnum">{fmt(g.points)}</span><span className="u">điểm</span></div>
        {can
          ? <button className="gift-btn can" onClick={() => onRedeem(g)}><Icon name="gift" size={15} color="#fff" /> Đổi ngay</button>
          : <><button className="gift-btn cant" disabled><Icon name="info" size={14} /> Chưa đủ điểm</button>
              <div className="gift-need">Còn thiếu {fmt(g.points - BALANCE)} điểm</div></>}
      </div>
    </div>
  );
}

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [cat, setCat] = useState("all");
  const [aff, setAff] = useState("all"); // all | can
  const [sort, setSort] = useState("points");
  const [redeem, setRedeem] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") setRedeem(null); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  const list = useMemo(() => {
    let arr = GIFTS.filter(g => {
      if (cat !== "all" && g.cat !== cat) return false;
      if (aff === "can" && g.points > BALANCE) return false;
      return true;
    });
    arr = [...arr].sort((a, b) => sort === "points" ? a.points - b.points : b.order - a.order);
    return arr;
  }, [cat, aff, sort]);

  const doRedeem = (g) => {
    setToast(`Đổi thành công "${g.name}"! Đang chuyển đến ví voucher…`);
    setRedeem(null);
    setTimeout(() => { location.href = NAV_URLS.wallet; }, 1400);
  };

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <a className="back" href={NAV_URLS.home} title="Quay lại"><Icon name="arrowleft" size={20} /></a>
          <div>
            <div className="hdr-title">Đổi quà</div>
            <div className="hdr-sub">Dùng điểm đổi ưu đãi hấp dẫn</div>
          </div>
          <div className="hdr-bal">
            <Icon name="coin" size={20} color="#fff" />
            <div><div className="bn tnum">{fmt(BALANCE)}</div><div className="bl">điểm của bạn</div></div>
          </div>
        </div>
      </header>

      <main className="app">
        <div className="intro">
          <h1>Danh mục đổi quà 🎁</h1>
          <p>Chọn phần thưởng bạn thích và đổi bằng điểm tích lũy.</p>
        </div>

        <div className="controls">
          <div className="cats">
            {Object.entries(CATS).map(([k, m]) => (
              <button key={k} className={"cat" + (cat === k ? " on" : "")} onClick={() => setCat(k)}>
                <span className="ci"><Icon name={m.ic} size={15} color="currentColor" /></span> {m.label}
              </button>
            ))}
          </div>
          <div className="row2">
            <div className="aff-seg">
              <button className={aff === "all" ? "on" : ""} onClick={() => setAff("all")}>Tất cả</button>
              <button className={aff === "can" ? "on" : ""} onClick={() => setAff("can")}>Đủ điểm đổi</button>
            </div>
            <span className="count"><b>{list.length}</b> phần quà</span>
            <div className="spacer" />
            <div className="sortbox">
              <select className="sortsel" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="points">Điểm: thấp → cao</option>
                <option value="new">Mới nhất</option>
              </select>
              <span className="chev"><Icon name="chevdown" size={15} /></span>
            </div>
          </div>
        </div>

        <div className="grid">
          {list.length === 0 && (
            <div className="empty"><div className="ei"><Icon name="gift" size={26} /></div>Không có phần quà nào phù hợp bộ lọc.</div>
          )}
          {list.map(g => <GiftCard key={g.id} g={g} can={g.points <= BALANCE} onRedeem={setRedeem} />)}
        </div>
      </main>

      {redeem && (
        <div className="scrim" onClick={() => setRedeem(null)}>
          <div className="rd" onClick={e => e.stopPropagation()}>
            <div className="rd-thumb" style={{ background: redeem.grad }}>
              <button className="rd-x" onClick={() => setRedeem(null)}>×</button>
              <span className="ti"><Icon name={CATS[redeem.cat].ic} size={48} color="#fff" /></span>
            </div>
            <div className="rd-b">
              <div className="rd-name">{redeem.name}</div>
              <div className="rd-cost"><Icon name="coin" size={17} color="var(--brand)" /> {fmt(redeem.points)} điểm</div>
              <div className="rd-bal">Số dư sau khi đổi: <b>{fmt(BALANCE)} → {fmt(BALANCE - redeem.points)} điểm</b></div>
              <div className="rd-actions">
                <button className="rd-cancel" onClick={() => setRedeem(null)}>Huỷ</button>
                <button className="rd-confirm" onClick={() => doRedeem(redeem)}>Xác nhận đổi</button>
              </div>
            </div>
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
