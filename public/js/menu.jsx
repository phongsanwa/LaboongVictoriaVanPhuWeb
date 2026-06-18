/* global React, ReactDOM, Icon, fmt, CATS, MENU, TAG_META, STORE, PER_POINT, CustomizeSheet, NAV_URLS, PROMOS, parseVoucherDiscount, calcDiscount, loadAddresses, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakToggle */
const { useState, useEffect, useMemo, useRef } = React;

const TODAY_ISO = "2026-06-15";

const TW_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": ["#0F623F", "#07432A"],
  "dark": false
}/*EDITMODE-END*/;

function lineKey(l) {
  const tops = (l.toppings || []).map(t => t.id).sort().join(",");
  return `${l.id}|z${l.size || "-"}|s${l.sugar || "-"}|i${l.ice || "-"}|t${tops}`;
}
function optsText(l) {
  const parts = [];
  if (l.size && l.size !== "M") parts.push(`Size ${l.size}`);
  if (l.sugar) parts.push(`Đường ${l.sugar}`);
  if (l.ice) parts.push(`Đá ${l.ice}`);
  if (l.toppings && l.toppings.length) parts.push(l.toppings.map(t => t.name).join(", "));
  return parts.join(" · ");
}

function App() {
  const [tw, setTweak] = useTweaks(TW_DEFAULTS);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState(CATS[0].key);
  const [lines, setLines] = useState([]);     // array of line items
  const [customize, setCustomize] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [note, setNote] = useState("");
  const [coupon, setCoupon] = useState(null);       // applied discount {code,name,type,value,min,...}
  const [couponView, setCouponView] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponErr, setCouponErr] = useState("");
  const [myVouchers, setMyVouchers] = useState([]); // from wallet localStorage
  const [addresses, setAddresses] = useState([]);   // delivery addresses (from Profile)
  const [addrId, setAddrId] = useState(null);        // selected address id, or "pickup"
  const [addrView, setAddrView] = useState(false);
  const grpRefs = useRef({});

  useEffect(() => {
    const r = document.documentElement;
    const [b, d] = Array.isArray(tw.brand) ? tw.brand : [tw.brand, tw.brand];
    r.style.setProperty("--brand", b);
    r.style.setProperty("--brand-deep", d);
    r.setAttribute("data-theme", tw.dark ? "dark" : "light");
  }, [tw.brand, tw.dark]);

  // load redeemed discount vouchers from the wallet (Đổi quà page)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("laboong_vouchers_v1");
      if (raw) setMyVouchers(JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }, []);

  // load delivery addresses (from Profile / FR-010), default to the default one
  useEffect(() => {
    const list = loadAddresses();
    setAddresses(list);
    const def = list.find(a => a.def) || list[0];
    setAddrId(def ? def.id : "pickup");
  }, []);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") { setCustomize(null); setDrawer(false); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  const addLine = (line) => {
    const key = lineKey(line);
    setLines(ls => {
      const i = ls.findIndex(l => l.key === key);
      if (i >= 0) { const next = [...ls]; next[i] = { ...next[i], qty: next[i].qty + line.qty }; return next; }
      return [...ls, { ...line, key }];
    });
    setCustomize(null);
  };
  const changeQty = (key, delta) => setLines(ls => ls.flatMap(l => {
    if (l.key !== key) return [l];
    const nq = l.qty + delta;
    return nq <= 0 ? [] : [{ ...l, qty: nq }];
  }));

  // simple add for toppings (no options)
  const addSimple = (m, delta) => {
    const key = `${m.id}|s-|i-|t`;
    setLines(ls => {
      const i = ls.findIndex(l => l.key === key);
      if (i >= 0) { const nq = ls[i].qty + delta; const next = [...ls]; if (nq <= 0) { next.splice(i, 1); return next; } next[i] = { ...next[i], qty: nq }; return next; }
      if (delta <= 0) return ls;
      return [...ls, { key, id: m.id, name: m.name, base: m.price, grad: m.grad, cat: m.cat, unit: m.price, qty: delta, sugar: null, ice: null, toppings: [] }];
    });
  };

  const filtered = useMemo(() => {
    if (!q.trim()) return MENU;
    const s = q.toLowerCase();
    return MENU.filter(m => m.name.toLowerCase().includes(s) || m.desc.toLowerCase().includes(s));
  }, [q]);
  const byCat = useMemo(() => CATS.map(c => ({ ...c, items: filtered.filter(m => m.cat === c.key) })).filter(c => c.items.length), [filtered]);

  const qtyOfItem = (id) => lines.filter(l => l.id === id).reduce((s, l) => s + l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const discount = calcDiscount(coupon, subtotal);
  const payable = Math.max(0, subtotal - discount);
  const earnPts = Math.floor(payable / PER_POINT);

  // discount vouchers owned (from wallet) that are still usable
  const usableVouchers = useMemo(() => myVouchers
    .filter(v => v.status !== "used" && (!v.expiry || v.expiry >= TODAY_ISO))
    .map(parseVoucherDiscount)
    .filter(Boolean), [myVouchers]);

  // drop coupon if order no longer meets its minimum
  useEffect(() => {
    if (coupon && subtotal < (coupon.min || 0)) { setCoupon(null); }
  }, [subtotal]); // eslint-disable-line

  const applyCode = (raw) => {
    const code = (raw || "").trim().toUpperCase();
    if (!code) return;
    let c = PROMOS[code] ? { ...PROMOS[code], code, source: "promo" } : null;
    if (!c) { const v = usableVouchers.find(v => v.code.toUpperCase() === code); if (v) c = v; }
    if (!c) {
      const used = myVouchers.find(v => v.code.toUpperCase() === code);
      setCouponErr(used ? "Voucher này đã được sử dụng hoặc hết hạn" : "Mã không hợp lệ");
      return;
    }
    if (subtotal < (c.min || 0)) { setCouponErr(`Áp dụng cho đơn từ ${fmt(c.min)}đ`); return; }
    setCoupon(c); setCouponErr(""); setCouponInput(""); setCouponView(false);
  };
  const applyVoucher = (c) => {
    if (subtotal < (c.min || 0)) { setCouponErr(`Áp dụng cho đơn từ ${fmt(c.min)}đ`); return; }
    setCoupon(c); setCouponErr(""); setCouponView(false);
  };

  const jumpCat = (key) => {
    setActiveCat(key);
    const el = grpRefs.current[key];
    if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 124; window.scrollTo({ top: y, behavior: "smooth" }); }
  };

  const reset = () => { setLines([]); setPlaced(false); setDrawer(false); setNote(""); setCoupon(null); setCouponView(false); setCouponInput(""); setCouponErr(""); };

  const selectedAddr = addrId === "pickup" ? null : addresses.find(a => a.id === addrId);
  const addrIcon = (label) => label === "Công ty" ? "building" : label === "Khác" ? "pin" : "home";

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <a className="back" href={NAV_URLS.home} title="Quay lại"><Icon name="arrowleft" size={20} /></a>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="hdr-title">Thực đơn</div>
            <div className="hdr-sub">Đặt món & tích điểm ngay</div>
          </div>
          <a className="hdr-store" href={NAV_URLS.store}><span className="pin"><Icon name="pin" size={15} color="currentColor" /></span> {STORE}</a>
        </div>
      </header>

      <main className="app">
        <div className="intro">
          <h1>Hôm nay uống gì? 🧋</h1>
          <p>Chọn món yêu thích — mỗi 10.000đ tích 1 điểm.</p>
        </div>

        <div className="searchbar">
          <Icon name="search" size={19} color="var(--ink-3)" />
          <input placeholder="Tìm món: trà sữa, cà phê, đào…" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        <div className="cats">
          {CATS.map(c => {
            const n = MENU.filter(m => m.cat === c.key).length;
            return (
              <button key={c.key} className={"cat" + (activeCat === c.key ? " on" : "")} onClick={() => jumpCat(c.key)}>
                <Icon name={c.ic} size={15} color="currentColor" /> {c.label} <span className="cc">{n}</span>
              </button>
            );
          })}
        </div>

        {byCat.length === 0 && (
          <div className="items"><div className="empty"><div className="ei"><Icon name="search" size={26} /></div>Không tìm thấy món nào khớp "{q}".</div></div>
        )}

        {byCat.map(c => (
          <section key={c.key} ref={el => grpRefs.current[c.key] = el}>
            <div className="grp-h"><span className="gi"><Icon name={c.ic} size={18} color="currentColor" /></span> {c.label}</div>
            <div className="items">
              {c.items.map(m => {
                const qty = qtyOfItem(m.id);
                const isTopping = m.cat === "topping";
                return (
                  <div className="item" key={m.id}>
                    <div className="item-thumb" style={{ background: m.grad }}>
                      <span className="ti"><Icon name="cup" size={34} color="#fff" /></span>
                      {qty > 0 && <span className="item-qty-badge">{qty}</span>}
                    </div>
                    <div className="item-body">
                      {m.tags.length > 0 && (
                        <div className="item-tags">
                          {m.tags.map(t => <span key={t} className={"tg " + t}><Icon name={TAG_META[t].ic} size={10} color="currentColor" /> {TAG_META[t].l}</span>)}
                        </div>
                      )}
                      <div className="item-name">{m.name}</div>
                      <div className="item-desc">{m.desc}</div>
                      <div className="item-foot">
                        <span className="item-price tnum">{fmt(m.price)}đ</span>
                        {isTopping
                          ? (qty === 0
                              ? <button className="add-btn" onClick={() => addSimple(m, 1)} aria-label="Thêm"><Icon name="plus" size={18} color="#fff" /></button>
                              : <div className="stepper">
                                  <button onClick={() => addSimple(m, -1)}><Icon name="minus" size={16} color="currentColor" /></button>
                                  <span className="qn">{qty}</span>
                                  <button onClick={() => addSimple(m, 1)}><Icon name="plus" size={16} color="currentColor" /></button>
                                </div>)
                          : <button className="add-btn" onClick={() => setCustomize(m)} aria-label="Tuỳ chỉnh & thêm"><Icon name="plus" size={18} color="#fff" /></button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* customize sheet */}
      {customize && <CustomizeSheet item={customize} onClose={() => setCustomize(null)} onAdd={addLine} />}

      {/* sticky cart bar */}
      {count > 0 && !drawer && !customize && (
        <div className="cartbar" onClick={() => setDrawer(true)}>
          <div className="cb-ic"><Icon name="bag" size={22} color="#fff" /><span className="cb-badge">{count}</span></div>
          <div className="cb-info">
            <div className="cb-count">{count} món · +{fmt(earnPts)} điểm</div>
            <div className="cb-total tnum">{fmt(payable)}đ</div>
          </div>
          <button className="cb-go">Xem giỏ <Icon name="arrow" size={16} color="var(--brand-deep)" /></button>
        </div>
      )}

      {/* cart drawer */}
      {drawer && (
        <div className="scrim" onClick={() => setDrawer(false)}>
          <div className="cart" onClick={e => e.stopPropagation()}>
            {placed ? (
              <div className="ok-wrap">
                <div className="ok-ring"><div className="ck"><Icon name="check" size={28} color="#fff" /></div></div>
                <h3>Đặt hàng thành công! 🎉</h3>
                <p>{selectedAddr ? <>Đơn của bạn sẽ được giao đến<br /><b>{selectedAddr.text}</b></> : <>Đơn của bạn đang được pha chế tại<br />Laboong {STORE}.</>}</p>
                <div className="ok-earn">
                  <span className="oi"><Icon name="coin" size={22} color="#fff" /></span>
                  <div><div className="ot">Bạn vừa tích được</div><div className="ov">+{fmt(earnPts)} điểm</div></div>
                </div>
                <button className="ok-btn" onClick={reset}>Đặt thêm món khác</button>
              </div>
            ) : couponView ? (
              <>
                <div className="cp-h">
                  <button className="cp-back" onClick={() => { setCouponView(false); setCouponErr(""); }}><Icon name="arrowleft" size={18} /></button>
                  <h3>Áp mã giảm giá</h3>
                </div>
                <div className="cp-b">
                  <div className="cp-input">
                    <input placeholder="Nhập mã giảm giá / voucher" value={couponInput}
                      onChange={e => { setCouponInput(e.target.value); setCouponErr(""); }}
                      onKeyDown={e => { if (e.key === "Enter") applyCode(couponInput); }} />
                    <button className="cp-apply" disabled={!couponInput.trim()} onClick={() => applyCode(couponInput)}>Áp dụng</button>
                  </div>
                  {couponErr && <div className="cp-err"><Icon name="alert" size={14} color="var(--hot)" /> {couponErr}</div>}

                  <div className="cp-sec">Voucher của bạn</div>
                  {usableVouchers.length === 0 ? (
                    <div className="cp-empty">Bạn chưa có voucher giảm tiền nào. Đổi điểm lấy voucher ở mục Đổi quà nhé!</div>
                  ) : (
                    <div className="vlist">
                      {usableVouchers.map(v => {
                        const ok = subtotal >= (v.min || 0);
                        return (
                          <button key={v.code} className="vopt" disabled={!ok} onClick={() => applyVoucher(v)}>
                            <span className="vi" style={{ background: "linear-gradient(135deg,#FF8A5B,#FF6FA5)" }}><Icon name="ticket" size={20} color="#fff" /></span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="vn">{v.name}</div>
                              <div className="vd">{v.min > 0 ? `Đơn từ ${fmt(v.min)}đ` : "Áp dụng mọi đơn"}</div>
                              <div className="vc">{v.code}</div>
                            </div>
                            <span className="vgo">{ok ? <>Dùng <Icon name="chev" size={14} /></> : `Còn thiếu ${fmt(v.min - subtotal)}đ`}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="cp-hint"><Icon name="info" size={13} color="var(--ink-3)" /> Mã demo có thể thử: <b>LABOONG10</b> (giảm 10%), <b>WELCOME20</b> (giảm 20k cho đơn từ 50k), <b>FREESHIP</b> (giảm 15k).</div>
                </div>
              </>
            ) : addrView ? (
              <>
                <div className="cp-h">
                  <button className="cp-back" onClick={() => setAddrView(false)}><Icon name="arrowleft" size={18} /></button>
                  <h3>Chọn nơi nhận hàng</h3>
                </div>
                <div className="cp-b">
                  <div className="cp-sec">Giao đến địa chỉ</div>
                  <div className="vlist">
                    {addresses.map(a => (
                      <button key={a.id} className={"aopt" + (addrId === a.id ? " on" : "")} onClick={() => { setAddrId(a.id); setAddrView(false); }}>
                        <span className="ai"><Icon name={addrIcon(a.label)} size={19} color="currentColor" /></span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="albl"><span className="atag">{a.label}</span>{a.def && <span className="adef">Mặc định</span>}</div>
                          <div className="atext">{a.text}</div>
                        </div>
                        <span className="aradio" />
                      </button>
                    ))}
                    {addresses.length === 0 && <div className="cp-empty">Bạn chưa có địa chỉ nào. Thêm địa chỉ trong mục Hồ sơ.</div>}
                  </div>

                  <div className="cp-sec">Hoặc</div>
                  <button className={"aopt pickup" + (addrId === "pickup" ? " on" : "")} onClick={() => { setAddrId("pickup"); setAddrView(false); }}>
                    <span className="ai"><Icon name="bag" size={19} color="currentColor" /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="albl"><span className="atag">Nhận tại quầy</span></div>
                      <div className="atext">Laboong {STORE}</div>
                    </div>
                    <span className="aradio" />
                  </button>

                  <a className="manage-addr" href={NAV_URLS.profile}><Icon name="plus2" size={15} color="currentColor" /> Quản lý địa chỉ trong Hồ sơ</a>
                </div>
              </>
            ) : (<>
              <div className="cart-h">
                <div>
                  <h3>Giỏ hàng</h3>
                  <div className="ch-sub">{STORE} · {count} món</div>
                </div>
                <button className="cart-x" onClick={() => setDrawer(false)}><Icon name="close" size={18} /></button>
              </div>
              {count === 0 ? (
                <div className="cart-empty"><div className="cei"><Icon name="bag" size={26} /></div>Giỏ hàng trống. Hãy chọn món bạn thích nhé!</div>
              ) : (<>
                <div className="cart-b">
                  <button className="deliv" onClick={() => setAddrView(true)}>
                    <span className="di"><Icon name={selectedAddr ? addrIcon(selectedAddr.label) : "pin"} size={19} color="currentColor" /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {selectedAddr ? (<>
                        <div className="dl">Giao đến <span className="dtag">{selectedAddr.label}</span>{selectedAddr.def && <span className="dtag" style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}>Mặc định</span>}</div>
                        <div className="dt">{selectedAddr.text}</div>
                      </>) : (<>
                        <div className="dl">Hình thức nhận</div>
                        <div className="dt">Nhận tại quầy · Laboong {STORE}</div>
                      </>)}
                    </div>
                    <span className="dchev"><Icon name="chev" size={18} /></span>
                  </button>
                  {lines.map(l => (
                    <div className="crow" key={l.key}>
                      <div className="cthumb" style={{ background: l.grad }}><Icon name="cup" size={22} color="#fff" /></div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="cn">{l.name}</div>
                        {optsText(l) && <div className="copts">{optsText(l)}</div>}
                        <div className="cp">{fmt(l.unit)}đ</div>
                      </div>
                      <div className="cstep">
                        <button onClick={() => changeQty(l.key, -1)}><Icon name="minus" size={15} color="currentColor" /></button>
                        <span className="qn">{l.qty}</span>
                        <button onClick={() => changeQty(l.key, 1)}><Icon name="plus" size={15} color="currentColor" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="cart-note">
                    <input placeholder="Ghi chú cho quán (giao tận bàn, ít đá…)" value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                </div>
                <div className="cart-f">
                  {coupon ? (
                    <div className="coupon-applied">
                      <span className="cai"><Icon name="ticket" size={17} color="#fff" /></span>
                      <div style={{ minWidth: 0 }}>
                        <div className="can">{coupon.name}</div>
                        <div className="cac">{coupon.code}</div>
                      </div>
                      <span className="cav">−{fmt(discount)}đ</span>
                      <button className="cax" onClick={() => setCoupon(null)} title="Bỏ mã"><Icon name="close" size={16} /></button>
                    </div>
                  ) : (
                    <button className="coupon-trigger" onClick={() => { setCouponView(true); setCouponErr(""); }}>
                      <span className="cti"><Icon name="ticket" size={17} color="currentColor" /></span>
                      Áp mã giảm giá / Voucher
                      <span className="ctchev"><Icon name="chev" size={17} /></span>
                    </button>
                  )}
                  <div className="csum"><span>Tạm tính</span><span className="v tnum">{fmt(subtotal)}đ</span></div>
                  {discount > 0 && <div className="csum" style={{ color: "var(--pink)" }}><span>Giảm giá</span><span className="v tnum" style={{ color: "var(--pink)" }}>−{fmt(discount)}đ</span></div>}
                  <div className="csum earn"><span>Điểm tích được</span><span className="v">+{fmt(earnPts)} điểm</span></div>
                  <div className="csum total"><span>Tổng cộng</span><span className="v tnum">{fmt(payable)}đ</span></div>
                  <button className="checkout" onClick={() => setPlaced(true)}><Icon name="check" size={18} color="#fff" /> Đặt hàng · {fmt(payable)}đ</button>
                </div>
              </>)}
            </>)}
          </div>
        </div>
      )}

      <TweaksPanel>
        <TweakSection label="Giao diện" />
        <TweakColor label="Màu chủ đạo" value={tw.brand}
          options={[["#0F623F", "#07432A"], ["#005A36", "#003D24"], ["#7A4A28", "#56331A"], ["#6B4FA0", "#4A357A"]]}
          onChange={v => setTweak("brand", v)} />
        <TweakToggle label="Chế độ tối" value={tw.dark} onChange={v => setTweak("dark", v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
