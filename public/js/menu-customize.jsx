/* global React, Icon, fmt, SUGAR_OPTS, ICE_OPTS, DEFAULT_SUGAR, DEFAULT_ICE, SIZE_OPTS, DEFAULT_SIZE, TOPPING_ADDONS */
const { useState: useStateCz } = React;

function CustomizeSheet({ item, onClose, onAdd }) {
  const [sugar, setSugar] = useStateCz(DEFAULT_SUGAR);
  const [ice, setIce] = useStateCz(DEFAULT_ICE);
  const [size, setSize] = useStateCz(DEFAULT_SIZE);
  const [tops, setTops] = useStateCz([]);   // array of topping ids
  const [qty, setQty] = useStateCz(1);

  const toggleTop = (id) => setTops(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);
  const chosen = TOPPING_ADDONS.filter(t => tops.includes(t.id));
  const addonTotal = chosen.reduce((s, t) => s + t.price, 0);
  const sizeObj = SIZE_OPTS.find(s => s.key === size) || SIZE_OPTS[0];
  const unit = item.price + sizeObj.extra + addonTotal;
  const total = unit * qty;

  const submit = () => {
    onAdd({
      id: item.id, name: item.name, base: item.price, grad: item.grad, cat: item.cat,
      sugar, ice, size, toppings: chosen.map(t => ({ id: t.id, name: t.name, price: t.price })),
      unit, qty,
    });
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="cart" onClick={e => e.stopPropagation()}>
        <div className="cz-h">
          <div className="cz-thumb" style={{ background: item.grad }}><Icon name="cup" size={28} color="#fff" /></div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3>{item.name}</h3>
            <div className="cz-desc">{item.desc}</div>
            <div className="cz-base">{fmt(item.price)}đ</div>
          </div>
          <button className="cz-x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="cz-b">
          {/* size */}
          <div className="cz-sec">
            <div className="cz-sec-h"><span className="cz-sec-ic"><Icon name="cup" size={15} color="currentColor" /></span><span className="cz-sec-t">Size cốc</span></div>
            <div className="cz-chips">
              {SIZE_OPTS.map(s => <button key={s.key} className={"cz-chip" + (size === s.key ? " on" : "")} onClick={() => setSize(s.key)}>{s.label}{s.extra > 0 ? ` +${fmt(s.extra)}đ` : ""}</button>)}
            </div>
          </div>
          {/* sugar */}
          <div className="cz-sec">
            <div className="cz-sec-h"><span className="cz-sec-ic"><Icon name="coin" size={15} color="currentColor" /></span><span className="cz-sec-t">Lượng đường</span></div>
            <div className="cz-chips">
              {SUGAR_OPTS.map(s => <button key={s} className={"cz-chip" + (sugar === s ? " on" : "")} onClick={() => setSugar(s)}>{s}</button>)}
            </div>
          </div>
          {/* ice */}
          <div className="cz-sec">
            <div className="cz-sec-h"><span className="cz-sec-ic"><Icon name="flame" size={15} color="currentColor" /></span><span className="cz-sec-t">Lượng đá</span></div>
            <div className="cz-chips">
              {ICE_OPTS.map(s => <button key={s} className={"cz-chip" + (ice === s ? " on" : "")} onClick={() => setIce(s)}>{s}</button>)}
            </div>
          </div>
          {/* toppings */}
          <div className="cz-sec">
            <div className="cz-sec-h"><span className="cz-sec-ic"><Icon name="plus" size={15} color="currentColor" /></span><span className="cz-sec-t">Topping<span className="req">· chọn nhiều</span></span></div>
            <div className="cz-tops">
              {TOPPING_ADDONS.map(t => {
                const on = tops.includes(t.id);
                return (
                  <button key={t.id} className={"cz-top" + (on ? " on" : "")} onClick={() => toggleTop(t.id)}>
                    <span className="box">{on && <Icon name="check" size={14} color="#fff" />}</span>
                    <span className="tn">{t.name}</span>
                    <span className="tp">+{fmt(t.price)}đ</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="cz-f">
          <div className="cz-qty">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}><Icon name="minus" size={17} color="currentColor" /></button>
            <span className="qn">{qty}</span>
            <button onClick={() => setQty(q => q + 1)}><Icon name="plus" size={17} color="currentColor" /></button>
          </div>
          <button className="cz-add" onClick={submit}><Icon name="bag" size={17} color="#fff" /> Thêm · {fmt(total)}đ</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CustomizeSheet });
