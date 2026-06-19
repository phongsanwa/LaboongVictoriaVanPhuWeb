/* global React, Icon, fmt */
const { useState: useStateCz } = React;

/* Build default selections from variantGroups array */
function makeDefaultSelections(variantGroups) {
  const sel = {};
  variantGroups.forEach(g => {
    if (g.type === 'addon') {
      sel[g.key] = [];
    } else {
      const availOpts = g.options.filter(o => o.available !== false);
      const def = availOpts.find(o => o.def) || availOpts[0];
      sel[g.key] = def ? def.id : null;
    }
  });
  return sel;
}

/* Calculate unit price from base price + variant selections */
function calcUnit(basePrice, variantGroups, selections) {
  let extra = 0;
  variantGroups.forEach(g => {
    const val = selections[g.key];
    if (g.type === 'size' && val) {
      const opt = g.options.find(o => o.id === val);
      extra += opt?.extra || 0;
    } else if (g.type === 'addon' && Array.isArray(val)) {
      val.forEach(id => {
        const opt = g.options.find(o => o.id === id);
        extra += opt?.extra || 0;
      });
    }
  });
  return basePrice + extra;
}

function CustomizeSheet({ item, variantGroups, onClose, onAdd }) {
  const [selections, setSelections] = useStateCz(() => makeDefaultSelections(variantGroups));
  const [qty, setQty] = useStateCz(1);

  const unit  = calcUnit(item.price, variantGroups, selections);
  const total = unit * qty;

  const selectSingle = (gKey, optId) => setSelections(s => ({ ...s, [gKey]: optId }));
  const toggleAddon  = (gKey, optId) => setSelections(s => {
    const curr = s[gKey] || [];
    return { ...s, [gKey]: curr.includes(optId) ? curr.filter(x => x !== optId) : [...curr, optId] };
  });

  const submit = () => {
    onAdd({
      id: item.id, name: item.name, base: item.price,
      grad: item.grad, img: item.img || null, cat: item.cat,
      selections: { ...selections }, unit, qty,
    });
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="cart" onClick={e => e.stopPropagation()}>
        <div className="cz-h">
          {item.img
            ? <div className="cz-thumb" style={{ background: item.grad, overflow: "hidden", padding: 0 }}>
                <img src={item.img} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            : <div className="cz-thumb" style={{ background: item.grad }}>
                <Icon name="cup" size={28} color="#fff" />
              </div>
          }
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3>{item.name}</h3>
            <div className="cz-desc">{item.desc}</div>
            <div className="cz-base">{fmt(item.price)}đ</div>
          </div>
          <button className="cz-x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="cz-b">
          {variantGroups.map(g => {
            const availOpts = g.options.filter(o => o.available !== false);
            if (availOpts.length === 0) return null;
            return (
              <div key={g.key} className="cz-sec">
                <div className="cz-sec-h">
                  <span className="cz-sec-ic"><Icon name={g.ic} size={15} color="currentColor" /></span>
                  <span className="cz-sec-t">
                    {g.label}
                    {!g.required && <span className="req">· chọn nhiều</span>}
                  </span>
                </div>
                {g.type === 'addon'
                  ? (
                    <div className="cz-tops">
                      {availOpts.map(o => {
                        const on = (selections[g.key] || []).includes(o.id);
                        return (
                          <button key={o.id} className={"cz-top" + (on ? " on" : "")} onClick={() => toggleAddon(g.key, o.id)}>
                            <span className="box">{on && <Icon name="check" size={14} color="#fff" />}</span>
                            <span className="tn">{o.label}</span>
                            <span className="tp">+{fmt(o.extra)}đ</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="cz-chips">
                      {availOpts.map(o => (
                        <button key={o.id} className={"cz-chip" + (selections[g.key] === o.id ? " on" : "")}
                          onClick={() => selectSingle(g.key, o.id)}>
                          {o.label}{o.extra > 0 ? ` +${fmt(o.extra)}đ` : ""}
                        </button>
                      ))}
                    </div>
                  )
                }
              </div>
            );
          })}
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
