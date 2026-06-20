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
      const def = availOpts.find(o => o.def) || availOpts[0] || g.options[0];
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
            <div className="cz-base">
              {item.origPrice != null && (
                <span style={{ textDecoration: "line-through", color: "var(--ink-3)", fontSize: 13, fontWeight: 500, marginRight: 6 }}>{fmt(item.origPrice)}đ</span>
              )}
              <span style={item.origPrice != null ? { color: "var(--danger)", fontWeight: 800 } : {}}>{fmt(item.price)}đ</span>
              {item.promoLabel && (
                <span style={{ fontSize: 11, fontWeight: 800, background: "var(--danger)", color: "#fff", borderRadius: 5, padding: "1px 6px", marginLeft: 6 }}>{item.promoLabel}</span>
              )}
            </div>
          </div>
          <button className="cz-x" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="cz-b">
          {variantGroups.map(g => {
            if (g.options.length === 0) return null;
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
                      {g.options.map(o => {
                        const avail = o.available !== false;
                        const on = avail && (selections[g.key] || []).includes(o.id);
                        return (
                          <button key={o.id} className={"cz-top" + (on ? " on" : "")}
                            onClick={() => avail && toggleAddon(g.key, o.id)}
                            disabled={!avail}
                            style={!avail ? { opacity: 0.45, cursor: "not-allowed" } : {}}>
                            <span className="box">{on && <Icon name="check" size={14} color="#fff" />}</span>
                            <span className="tn" style={!avail ? { textDecoration: "line-through" } : {}}>{o.label}</span>
                            <span className="tp">{avail ? `+${fmt(o.extra)}đ` : "Hết"}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="cz-chips">
                      {g.options.map(o => {
                        const avail = o.available !== false;
                        return (
                          <button key={o.id}
                            className={"cz-chip" + (selections[g.key] === o.id ? " on" : "")}
                            onClick={() => avail && selectSingle(g.key, o.id)}
                            disabled={!avail}
                            style={!avail ? { opacity: 0.45, cursor: "not-allowed", textDecoration: "line-through" } : {}}>
                            {o.label}{o.extra > 0 ? ` +${fmt(o.extra)}đ` : ""}
                            {!avail && <span style={{ fontSize: 10, marginLeft: 4, fontWeight: 700, color: "var(--hot, #e53)" }}>Hết</span>}
                          </button>
                        );
                      })}
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
