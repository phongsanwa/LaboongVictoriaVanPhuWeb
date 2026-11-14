/* global React, ReactDOM, Icon, AdminSidebar */
const { useState, useMemo } = React;

const D = window.CHANNEL_PRICE_DATA;
const CH_COLOR = { shopee: "#EE4D2D", grab: "#00B14F", xanhsm: "#00A6B4" };
const fmt = n => Math.round(n || 0).toLocaleString("vi-VN") + "đ";
const inp = { borderWidth: 1.5, borderStyle: "solid", borderColor: "#E5E1D6", borderRadius: 10, padding: "8px 10px", fontSize: 14, width: "100%", background: "#fff", fontFamily: "inherit", outline: "none" };
const card = { background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #ECE8DC", marginBottom: 16 };
const csrf = () => document.querySelector('meta[name="csrf-token"]').content;
const noAccent = t => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();

/* Giống ChannelPricing::bump ở máy chủ: tăng % rồi làm tròn lên. */
function bump(amount, pct, round) {
  const v = Math.round(amount * (1 + (Number(pct) || 0) / 100) * 100) / 100;
  return round > 0 ? Math.ceil(v / round) * round : Math.round(v);
}

function ChannelPricesApp() {
  const [sideOpen, setSideOpen] = useState(false);
  const [markup, setMarkup] = useState(D.settings.markup);
  const [round, setRound] = useState(D.settings.round);
  const [overrides, setOverrides] = useState(D.settings.overrides || {});
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [dirty, setDirty] = useState(false);

  const touch = fn => (...a) => { fn(...a); setDirty(true); setMsg(null); };
  const setPct = touch((ch, v) => setMarkup(m => ({ ...m, [ch]: v })));
  const setOverride = touch((pid, ch, v) => setOverrides(o => {
    const n = { ...o, [pid]: { ...(o[pid] || {}) } };
    if (v === "" || v == null) delete n[pid][ch]; else n[pid][ch] = Number(v);
    if (!Object.keys(n[pid]).length) delete n[pid];
    return n;
  }));

  const groups = useMemo(() => {
    const words = noAccent(q).split(/\s+/).filter(Boolean);
    const match = p => !words.length || words.every(w => noAccent(p.name).includes(w));
    const byCat = D.cats.map(c => ({ ...c, items: D.products.filter(p => p.cat === c.id && match(p)) }));
    const other = D.products.filter(p => !D.cats.some(c => c.id === p.cat) && match(p));
    if (other.length) byCat.push({ id: "other", name: "Khác", items: other });
    return byCat.filter(g => g.items.length);
  }, [q]);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const r = await fetch(D.urls.save, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": csrf() }, body: JSON.stringify({ markup, round, overrides }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || "Lưu không được");
      setOverrides(j.settings.overrides || {}); setMarkup(j.settings.markup); setDirty(false);
      setMsg({ ok: true, text: j.message });
    } catch (e) { setMsg({ ok: false, text: e.message }); } finally { setSaving(false); }
  };

  return (
    <div className="shell">
      <AdminSidebar activeLabel="Giá bán app" admin={D.admin} sideOpen={sideOpen} onClose={() => setSideOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-toggle" onClick={() => setSideOpen(true)}><Icon name="grid" size={19} /></button>
          <div><div className="crumb">Quản lý · Thực đơn</div><h1>Giá bán trên app giao hàng</h1></div>
          <div className="topbar-spacer" />
          <button className="btn primary" disabled={saving || !dirty} onClick={save}><Icon name="check" size={16} color="#fff" /> {saving ? "Đang lưu…" : dirty ? "Lưu giá" : "Đã lưu"}</button>
        </header>
        <div className="content">
          {msg && <div style={{ ...card, padding: "10px 14px", background: msg.ok ? "#EAF3EE" : "#FDECEA", color: msg.ok ? "#0F623F" : "#C0392B", fontWeight: 700 }}>{msg.text}</div>}

          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Mức tăng so với giá tại quầy</div>
            <div style={{ fontSize: 13, color: "#6B756F", margin: "4px 0 14px", lineHeight: 1.5 }}>
              Dùng khi thu ngân lên đơn ShopeeFood / GrabFood / Xanh SM ở màn hình "Lên đơn". Áp cho giá món và phụ thu size, topping.
              Món nào app bán giá khác thì nhập giá riêng ở bảng dưới (phụ thu size/topping vẫn tăng theo %).
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
              {D.channels.map(c => (
                <div key={c.key} style={{ border: `1.5px solid ${CH_COLOR[c.key]}33`, borderRadius: 14, padding: 14, background: `${CH_COLOR[c.key]}0d` }}>
                  <div style={{ fontWeight: 800, color: CH_COLOR[c.key] }}>{c.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>+</span>
                    <input type="number" min="0" max="200" step="1" value={markup[c.key] ?? 0} onChange={e => setPct(c.key, e.target.value)} style={{ ...inp, width: 90, fontWeight: 800 }} />
                    <span style={{ fontWeight: 700 }}>%</span>
                  </div>
                  {D.commission?.[c.key] ? <div style={{ fontSize: 12, color: "#8A9189", marginTop: 6 }}>Phí sàn đang cài: {D.commission[c.key]}%</div> : null}
                </div>
              ))}
              <div style={{ border: "1.5px solid #E5E1D6", borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 800 }}>Làm tròn lên</div>
                <select value={round} onChange={touch(e => setRound(Number(e.target.value)))} style={{ ...inp, marginTop: 8 }}>
                  <option value={1000}>Đến 1.000đ</option>
                  <option value={500}>Đến 500đ</option>
                  <option value={0}>Không làm tròn</option>
                </select>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Giá từng món (size mặc định)</div>
                <div style={{ fontSize: 12.5, color: "#6B756F", marginTop: 2 }}>Ô để trống = tự tính theo %. Nhập số để đặt giá riêng; xoá số để quay lại tự tính.</div>
              </div>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm món…" style={{ ...inp, width: 220 }} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 640 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#6B756F", fontSize: 12.5 }}>
                    <th style={{ padding: "8px 6px" }}>Món</th><th style={{ padding: "8px 6px" }}>Tại quầy</th>
                    {D.channels.map(c => <th key={c.key} style={{ padding: "8px 6px", color: CH_COLOR[c.key] }}>{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {groups.map(g => (
                    <React.Fragment key={g.id}>
                      <tr><td colSpan={2 + D.channels.length} style={{ padding: "14px 6px 6px", fontWeight: 800, fontSize: 13.5, color: "#0F623F" }}>{g.name}</td></tr>
                      {g.items.map(p => (
                        <tr key={p.id} style={{ borderTop: "1px solid #F2EFE6", opacity: p.available ? 1 : 0.55 }}>
                          <td style={{ padding: "8px 6px", fontWeight: 700 }}>{p.name}{!p.available && <span style={{ fontSize: 11.5, color: "#8A9189", fontWeight: 600 }}> · tạm hết</span>}</td>
                          <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{fmt(p.price)}</td>
                          {D.channels.map(c => {
                            const own = overrides[p.id]?.[c.key];
                            const auto = bump(p.price, markup[c.key], round);
                            return (
                              <td key={c.key} style={{ padding: "6px" }}>
                                <input type="number" min="1000" step="1000" value={own ?? ""} placeholder={auto.toLocaleString("vi-VN")}
                                  onChange={e => setOverride(p.id, c.key, e.target.value)}
                                  style={{ ...inp, width: 120, fontWeight: own ? 800 : 500, borderColor: own ? CH_COLOR[c.key] : "#E5E1D6" }} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ChannelPricesApp />);
