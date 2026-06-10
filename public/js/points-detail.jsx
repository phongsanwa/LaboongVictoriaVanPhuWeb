/* global React, ReactDOM, Icon, fmt, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo } = React;

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

const MEMBER = { name: "Minh Anh", id: "LBVP·0257·418", tier: "Hạng Vàng" };
const BALANCE = 2450;
const EXPIRING = 180;          // điểm sắp hết hạn
const EXPIRE_DATE = "30/06/2026";
const EARNED_TOTAL = 8920;     // tích luỹ trọn đời
const REDEEMED_TOTAL = 6470;

/* history: month key -> entries (newest first). amt + = cộng, - = trừ */
const HISTORY = {
  "2026-06": [
    { type: "earn",   title: "Trà sữa trân châu đường đen", store: "Victoria Văn Phú", day: "08/06", time: "14:20", amt: 45 },
    { type: "redeem", title: "Đổi voucher giảm 30.000đ",    store: "Đổi quà",          day: "06/06", time: "19:05", amt: -300 },
    { type: "earn",   title: "2 ly Macchiato kem phô mai",  store: "Royal City",       day: "05/06", time: "12:30", amt: 60 },
    { type: "adjust", title: "Tặng điểm sinh nhật",         store: "Hệ thống",         day: "03/06", time: "09:00", amt: 100 },
    { type: "earn",   title: "Trà đào cam sả",              store: "Victoria Văn Phú", day: "01/06", time: "16:40", amt: 25 },
  ],
  "2026-05": [
    { type: "earn",   title: "Combo 3 ly trà sữa",          store: "Times City",       day: "28/05", time: "18:10", amt: 75 },
    { type: "expire", title: "Điểm hết hạn (Q1/2026)",      store: "Tự động",          day: "20/05", time: "00:00", amt: -120 },
    { type: "redeem", title: "Đổi upsize miễn phí",         store: "Đổi quà",          day: "15/05", time: "13:25", amt: -120 },
    { type: "earn",   title: "Flash Sale 8/5 · 2 ly",       store: "Aeon Hà Đông",     day: "08/05", time: "11:50", amt: 90 },
    { type: "earn",   title: "Cà phê sữa đá",               store: "Victoria Văn Phú", day: "03/05", time: "08:15", amt: 20 },
  ],
  "2026-04": [
    { type: "earn",   title: "Hồng trà sữa size L",         store: "Royal City",       day: "26/04", time: "15:00", amt: 40 },
    { type: "redeem", title: "Đổi ly giữ nhiệt Laboong",    store: "Đổi quà",          day: "18/04", time: "17:30", amt: -2500 },
    { type: "earn",   title: "Trà vải hạt sen",             store: "Times City",       day: "10/04", time: "14:05", amt: 35 },
  ],
  "2026-03": [
    { type: "earn",   title: "Sữa tươi trân châu đường đen", store: "Victoria Văn Phú", day: "22/03", time: "19:40", amt: 50 },
    { type: "adjust", title: "Bù điểm sự cố quét QR",        store: "Hệ thống",         day: "15/03", time: "10:20", amt: 60 },
    { type: "earn",   title: "Trà sữa khoai môn",            store: "Aeon Hà Đông",     day: "05/03", time: "12:00", amt: 30 },
  ],
};

const MONTHS = [
  { key: "2026-06", label: "Th06" }, { key: "2026-05", label: "Th05" },
  { key: "2026-04", label: "Th04" }, { key: "2026-03", label: "Th03" },
];

const TX_META = {
  earn:   { ic: "cup",  cls: "earn" },
  redeem: { ic: "gift", cls: "redeem" },
  expire: { ic: "clock", cls: "expire" },
  adjust: { ic: "spark", cls: "adjust" },
};

const RULES = [
  { t: "Tích điểm theo hoá đơn", d: "Mỗi 10.000đ chi tiêu được quy đổi thành 1 điểm. Điểm cộng ngay sau khi nhân viên quét mã QR." },
  { t: "Ưu đãi nhân điểm", d: "Vào các chiến dịch x2/x3 điểm (ví dụ Thứ 4 hàng tuần), số điểm tích được nhân lên tương ứng." },
  { t: "Hạng thành viên", d: "Đồng → Bạc (1.000đ) → Vàng (2.500đ) → Kim Cương (6.000đ). Hạng càng cao, ưu đãi càng nhiều." },
  { t: "Đổi điểm lấy quà", d: "Dùng điểm để đổi voucher, đồ uống hoặc quà tặng trong mục Đổi quà. Điểm trừ ngay khi đổi." },
  { t: "Hạn sử dụng điểm", d: "Điểm có hiệu lực 12 tháng kể từ ngày tích. Điểm cũ sẽ được trừ trước khi hết hạn." },
];

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [month, setMonth] = useState("2026-06");
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") setRulesOpen(false); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  const entries = HISTORY[month] || [];
  const msum = useMemo(() => {
    let plus = 0, minus = 0;
    entries.forEach(e => { if (e.amt > 0) plus += e.amt; else minus += -e.amt; });
    return { plus, minus };
  }, [entries]);

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <a className="back" href={NAV_URLS.home} title="Quay lại"><Icon name="arrowleft" size={20} /></a>
          <div>
            <div className="hdr-title">Chi tiết điểm</div>
            <div className="hdr-sub">{MEMBER.name} · {MEMBER.tier}</div>
          </div>
          <button className="hdr-info" onClick={() => setRulesOpen(true)} title="Quy tắc tích điểm"><Icon name="info" size={20} /></button>
        </div>
      </header>

      <main className="app">
        {/* balance */}
        <section className="bal">
          <div className="bal-top">
            <span className="bal-tier"><span className="dot"><Icon name="star" size={11} color="#fff" /></span>{MEMBER.tier}</span>
            <span className="bal-id">ID {MEMBER.id}</span>
          </div>
          <div className="bal-label">Tổng điểm hiện tại</div>
          <div className="bal-row"><span className="bal-num">{fmt(BALANCE)}</span><span className="bal-unit">điểm</span></div>
          <div className="bal-sub">
            <div className="bal-stat"><div className="v tnum">{fmt(EARNED_TOTAL)}</div><div className="l">Đã tích (trọn đời)</div></div>
            <div className="bal-stat"><div className="v tnum">{fmt(REDEEMED_TOTAL)}</div><div className="l">Đã sử dụng</div></div>
          </div>
        </section>

        {/* expire warning */}
        <section className="expire">
          <div className="ei"><Icon name="clock" size={22} color="#fff" /></div>
          <div style={{ minWidth: 0 }}>
            <div className="et"><b>{fmt(EXPIRING)}</b> điểm sắp hết hạn</div>
            <div className="ed">Hết hạn vào {EXPIRE_DATE} — hãy đổi quà trước khi mất điểm nhé!</div>
          </div>
          <button className="ego">Đổi ngay <Icon name="arrow" size={14} /></button>
        </section>

        {/* history */}
        <div className="sec-h"><h2>Lịch sử điểm</h2></div>
        <div className="months">
          {MONTHS.map(m => (
            <button key={m.key} className={"month" + (month === m.key ? " on" : "")} onClick={() => setMonth(m.key)}>
              {m.label}/2026
            </button>
          ))}
        </div>

        <div className="msum">
          <div className="msum-card"><div className="l"><Icon name="spark" size={13} color="var(--brand)" /> Điểm cộng</div><div className="v plus tnum">+{fmt(msum.plus)}</div></div>
          <div className="msum-card"><div className="l"><Icon name="gift" size={13} color="var(--pink)" /> Điểm trừ</div><div className="v minus tnum">−{fmt(msum.minus)}</div></div>
        </div>

        <div className="tx-card">
          {entries.length === 0 && <div className="tx-empty">Không có giao dịch trong tháng này.</div>}
          {entries.map((e, i) => {
            const m = TX_META[e.type];
            const sign = e.amt > 0 ? "plus" : e.type === "expire" ? "exp" : "minus";
            return (
              <div className="tx" key={i}>
                <div className={"tx-ic " + m.cls}><Icon name={m.ic} size={21} color="currentColor" /></div>
                <div className="tx-body">
                  <div className="tx-title">{e.title}</div>
                  <div className="tx-meta">{e.day} · {e.time} · {e.store}</div>
                </div>
                <div className="tx-right">
                  <div className={"tx-amt " + sign}>{e.amt > 0 ? "+" : "−"}{fmt(Math.abs(e.amt))}</div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* rules modal */}
      {rulesOpen && (
        <div className="scrim" onClick={() => setRulesOpen(false)}>
          <div className="rules" onClick={e => e.stopPropagation()}>
            <div className="rules-h">
              <button className="rules-x" onClick={() => setRulesOpen(false)}>×</button>
              <h3>Quy tắc tích điểm</h3>
              <p>Cách tích, dùng và giữ điểm tại Laboong</p>
            </div>
            <div className="rules-b">
              {RULES.map((r, i) => (
                <div className="rule" key={i}>
                  <div className="rule-n">{i + 1}</div>
                  <div><div className="rule-t">{r.t}</div><div className="rule-d">{r.d}</div></div>
                </div>
              ))}
              <div className="rules-note"><Icon name="info" size={17} color="var(--amber)" /><span>Điểm sắp hết hạn luôn được hiển thị ở đầu trang. Hệ thống sẽ trừ điểm cũ trước để bạn không bị mất điểm oan.</span></div>
            </div>
          </div>
        </div>
      )}

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
