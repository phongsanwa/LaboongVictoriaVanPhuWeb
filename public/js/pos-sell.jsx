/* global React, ReactDOM, Icon, CustomizeSheet, getProductVariantGroups, lineKey, loadPrintSettings, receiptHtml, labelsHtml, printHtml, PrinterSettings, printOpts, printTops */
/*
 * Lên đơn tại quầy: chọn loại đơn (tại chỗ / mang về / ShopeeFood / GrabFood / Xanh SM),
 * đơn app giao hàng nhập mã đơn trước, rồi chọn món theo nhóm → lưu → in hoá đơn + tem.
 */
const { useState, useEffect, useMemo, useRef } = React;

const D = window.POS_SELL_DATA || {};
const CHANNELS = D.channels || [];
const CH = Object.fromEntries(CHANNELS.map(c => [c.key, c]));
const CH_COLOR = { tai_cho: "#0F623F", mang_ve: "#1E8FA8", shopee: "#EE4D2D", grab: "#00B14F", xanhsm: "#00A6B4" };
const CH_ICON = { tai_cho: "chair", mang_ve: "bag", shopee: "bike", grab: "bike", xanhsm: "car" };
const PAY = { cash: "Tiền mặt", bank: "Chuyển khoản", app: "Qua app" };
const money = (n) => Math.round(n || 0).toLocaleString("vi-VN") + "đ";
const noAccent = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

function csrf() { return document.querySelector('meta[name="csrf-token"]').content; }
async function api(method, url, body) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": csrf() }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || Object.values(j.errors || {}).flat()[0] || "Có lỗi, vui lòng thử lại.");
  return j;
}
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};

/* Mô tả lựa chọn của 1 dòng: "Size L · Đường: 50% · + Trân châu x2" */
function lineOpts(line, groups) {
  if (!line.selections) return "";
  const parts = [];
  groups.forEach(g => {
    const v = line.selections[g.key];
    if (v == null || (Array.isArray(v) && !v.length)) return;
    if (Array.isArray(v)) {
      const c = {}; v.forEach(x => { c[x] = (c[x] || 0) + 1; });
      parts.push("+ " + Object.entries(c).map(([n, k]) => k > 1 ? `${n} x${k}` : n).join(", "));
    } else parts.push(g.type === "level" ? `${g.label}: ${v}` : v);
  });
  return parts.join(" · ");
}

function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 20000); return () => clearInterval(i); }, []);
  return <span className="clock">{t.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}</span>;
}

/* Popup nhập mã đơn ShopeeFood / GrabFood / Xanh SM */
function CodeDialog({ channel, initial, onCancel, onOk }) {
  const [code, setCode] = useState(initial || "");
  const ok = () => { if (code.trim()) onOk(code.trim().toUpperCase()); };
  return (
    <div className="dlg-scrim" onClick={onCancel}>
      <div className="dlg" onClick={e => e.stopPropagation()}>
        <h3 style={{ color: CH_COLOR[channel] }}>Đơn {CH[channel]?.label}</h3>
        <p className="hint">Nhập mã đơn trên app {CH[channel]?.label} để in lên hoá đơn và tem.</p>
        <input className="big-input" autoFocus value={code} onChange={e => setCode(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") ok(); }} placeholder="VD: GF-123456" maxLength={60} />
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn ghost" onClick={onCancel}>Huỷ</button>
          <button className="btn" style={{ background: CH_COLOR[channel] }} disabled={!code.trim()} onClick={ok}>Tiếp tục chọn món</button>
        </div>
      </div>
    </div>
  );
}

/* Danh sách đơn trong ngày: tổng theo kênh, in lại, huỷ */
function OrdersDialog({ storeId, onClose, onPrint, notify }) {
  const [date, setDate] = useState(D.today);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const load = () => {
    setErr("");
    api("GET", `${D.urls.orders}?store_id=${storeId}&date=${date}`).then(setData).catch(e => setErr(e.message));
  };
  useEffect(load, [date, storeId]); // eslint-disable-line
  const cancel = async (o) => {
    const reason = prompt(`Huỷ đơn #${o.queue_no}? Nhập lý do (có thể bỏ trống):`, "");
    if (reason === null) return;
    try { const r = await api("POST", D.urls.cancel.replace("__ID__", o.id), { reason }); notify(r.message); load(); }
    catch (e) { notify(e.message); }
  };
  return (
    <div className="dlg-scrim" onClick={onClose}>
      <div className="dlg wide" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <h3>Đơn đã lên</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={date} max={D.today} onChange={e => setDate(e.target.value)}
              style={{ height: 40, borderRadius: 10, border: "1.5px solid var(--line)", padding: "0 10px" }} />
            <button className="btn ghost sm" onClick={onClose}><Icon name="close" size={16} /></button>
          </div>
        </div>
        {err && <div className="err">{err}</div>}
        {!data ? <div style={{ padding: 30, display: "flex", justifyContent: "center" }}><span className="lb-spin lg" /></div> : (
          <>
            <div className="ol-sum">
              <span style={{ background: "var(--brand)", color: "#fff" }}>Tổng: {data.count} đơn · {data.cups} ly · {money(data.total)}</span>
              {data.summary.filter(s => s.count).map(s => (
                <span key={s.key} style={{ color: CH_COLOR[s.key] }}>{s.label}: {s.count} đơn · {money(s.total)}</span>
              ))}
            </div>
            {data.orders.length === 0 && <div className="tk-empty">Chưa có đơn nào trong ngày này.</div>}
            {data.orders.map(o => (
              <div key={o.id} className={"ol-row" + (o.status === "cancelled" ? " cancel" : "")}>
                <div className="ol-no">#{o.queue_no}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="badge" style={{ background: CH_COLOR[o.channel] }}>{o.channel_label}</span>
                    {o.external_code && <b style={{ fontSize: 13.5 }}>{o.external_code}</b>}
                    <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{o.time} · {PAY[o.payment_method]}{o.cashier ? " · " + o.cashier : ""}</span>
                    {o.status === "cancelled" && <span className="badge" style={{ background: "#C0392B" }}>Đã huỷ</span>}
                  </div>
                  <div style={{ fontSize: 13.5, marginTop: 4, color: "var(--ink-2)" }}>{o.items.map(i => `${i.qty}× ${i.name}`).join(", ")}</div>
                  {o.cancel_reason && <div style={{ fontSize: 12.5, color: "#C0392B" }}>Lý do huỷ: {o.cancel_reason}</div>}
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div style={{ fontWeight: 800, fontSize: 15.5 }}>{money(o.total)}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
                    <button className="btn ghost sm" title="In lại hoá đơn" onClick={() => onPrint(o, "receipt")}><Icon name="receipt" size={16} /></button>
                    <button className="btn ghost sm" title="In lại tem" onClick={() => onPrint(o, "label")}><Icon name="ticket" size={16} /></button>
                    {o.status !== "cancelled" && <button className="btn danger sm" title="Huỷ đơn" onClick={() => cancel(o)}><Icon name="trash" size={16} /></button>}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function SellApp() {
  const stores = D.stores || [];
  const [storeId, setStoreId] = useState(() => {
    const saved = store.get("lb_pos_store", null);
    return stores.some(s => s.id === saved) ? saved : (D.staff?.store_id ?? stores[0]?.id);
  });
  const [step, setStep] = useState("start");      // start | menu
  const [channel, setChannel] = useState(null);
  const [code, setCode] = useState("");
  const [codeFor, setCodeFor] = useState(null);   // kênh app đang nhập mã
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [lines, setLines] = useState([]);
  const [pick, setPick] = useState(null);         // { item, line? } đang mở bảng chọn
  const [payment, setPayment] = useState("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);         // đơn vừa lưu
  const [showOrders, setShowOrders] = useState(false);
  const [showPrinter, setShowPrinter] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastT = useRef(null);

  useEffect(() => { store.set("lb_pos_store", storeId); }, [storeId]);
  const notify = (t) => { setToast(t); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(""), 2600); };

  const offSet = useMemo(() => new Set((D.storeOffs || {})[String(storeId)] || []), [storeId]);
  const groupsOf = (item) => getProductVariantGroups(item, D.variantGroups || [], offSet);
  const isApp = channel && CH[channel]?.app;

  const chooseChannel = (key) => {
    if (CH[key]?.app) { setCodeFor(key); return; }
    setChannel(key); setCode(""); setPayment(p => (p === "app" ? "cash" : p)); setStep("menu");
  };
  const confirmCode = (c) => { setChannel(codeFor); setCode(c); setPayment("app"); setCodeFor(null); setStep("menu"); };

  const cats = D.cats || [];
  const shown = useMemo(() => {
    const words = noAccent(q).split(/\s+/).filter(Boolean);
    return (D.menu || []).filter(m => (cat === "all" || m.cat === cat) && (!words.length || words.every(w => noAccent(m.name).includes(w))));
  }, [cat, q]);
  const countById = useMemo(() => lines.reduce((acc, l) => ({ ...acc, [l.id]: (acc[l.id] || 0) + l.qty }), {}), [lines]);

  const tapItem = (m) => {
    if (m.available === false) return;
    const groups = groupsOf(m);
    if (!groups.length) return addLine({ id: m.id, name: m.name, unit: m.price, qty: 1, selections: null, note: "" });
    setPick({ item: m });
  };
  const addLine = (line) => {
    const key = lineKey({ id: line.id, selections: line.selections }) + "|" + (line.note || "");
    setLines(ls => {
      const i = ls.findIndex(l => l.key === key);
      if (i >= 0) { const n = [...ls]; n[i] = { ...n[i], qty: n[i].qty + line.qty }; return n; }
      return [...ls, { ...line, key }];
    });
  };
  const onSheetAdd = (line) => {
    const edited = pick?.line;
    if (edited) setLines(ls => ls.filter(l => l.key !== edited.key));
    addLine({ id: line.id, name: line.name, unit: line.unit, qty: line.qty, selections: line.selections, note: line.note || "" });
    setPick(null);
  };
  const setQty = (key, qty) => setLines(ls => qty <= 0 ? ls.filter(l => l.key !== key) : ls.map(l => l.key === key ? { ...l, qty: Math.min(99, qty) } : l));
  const editLine = (l) => { const m = (D.menu || []).find(x => x.id === l.id); if (m && l.selections) setPick({ item: m, line: l }); };

  const total = lines.reduce((s, l) => s + l.unit * l.qty, 0);
  const cups = lines.reduce((s, l) => s + l.qty, 0);

  const resetOrder = () => { setLines([]); setNote(""); setErr(""); setChannel(null); setCode(""); setPayment("cash"); setStep("start"); setTicketOpen(false); setQ(""); setCat("all"); };

  const doPrint = async (order, which) => {
    const s = loadPrintSettings();
    if (which === "receipt" || which === "both") await printHtml(receiptHtml(order, s));
    if (which === "label" || which === "both") await printHtml(labelsHtml(order, s));
  };

  const save = async () => {
    if (!lines.length || saving) return;
    setSaving(true); setErr("");
    try {
      const r = await api("POST", D.urls.store, {
        store_id: storeId, channel, external_code: code || null, payment_method: isApp ? "app" : payment, note: note.trim() || null,
        lines: lines.map(l => ({ id: l.id, qty: l.qty, selections: l.selections, note: l.note || null })),
      });
      setDone(r.order);
      setTicketOpen(false);
      const s = loadPrintSettings();
      if (s.autoReceipt) await printHtml(receiptHtml(r.order, s));
      if (s.autoLabel) await printHtml(labelsHtml(r.order, s));
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  const chColor = channel ? CH_COLOR[channel] : "var(--brand)";
  const curStore = stores.find(s => s.id === storeId);

  const ticket = (
    <div className={"ps-ticket" + (ticketOpen ? " open" : "")}>
      <div className="tk-h">
        <div><b>Đơn mới</b> <span style={{ color: "var(--ink-3)", fontWeight: 700, fontSize: 13 }}>· {cups} ly</span></div>
        {ticketOpen ? <button className="btn ghost sm" onClick={() => setTicketOpen(false)}><Icon name="close" size={16} /></button>
          : lines.length > 0 && <button className="btn ghost sm" onClick={() => { if (confirm("Xoá hết món trong đơn?")) setLines([]); }}>Xoá hết</button>}
      </div>
      <div className="tk-lines">
        {!lines.length && <div className="tk-empty">Chọn món bên trái để thêm vào đơn</div>}
        {lines.map(l => {
          const m = (D.menu || []).find(x => x.id === l.id);
          const opts = m ? lineOpts(l, groupsOf(m)) : "";
          return (
            <div key={l.key} className="tk-line">
              <div className="info" onClick={() => editLine(l)} title="Bấm để sửa món">
                <div className="n">{l.name}</div>
                {opts && <div className="o">{opts}</div>}
                {l.note && <div className="nt">* {l.note}</div>}
                <div className="p">{money(l.unit * l.qty)}</div>
              </div>
              <div className="qty">
                <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Bớt">−</button>
                <span>{l.qty}</span>
                <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Thêm">+</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="tk-f">
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Ghi chú cho cả đơn…" />
        {isApp ? (
          <div className="seg"><button className="on" style={{ color: chColor }}>Thanh toán qua app {CH[channel]?.label}</button></div>
        ) : (
          <div className="seg">
            <button className={payment === "cash" ? "on" : ""} onClick={() => setPayment("cash")}>💵 Tiền mặt</button>
            <button className={payment === "bank" ? "on" : ""} onClick={() => setPayment("bank")}>🏦 Chuyển khoản</button>
          </div>
        )}
        <div className="tk-total"><span>Tổng cộng</span><b>{money(total)}</b></div>
        {err && <div className="err">{err}</div>}
        <button className="btn" style={{ background: chColor, height: 56, fontSize: 17 }} disabled={!lines.length || saving} onClick={save}>
          {saving ? <><span className="lb-spin" /> Đang lưu…</> : <><Icon name="print" size={20} color="#fff" /> Lưu & In đơn</>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="ps">
      <div className="ps-top">
        <a className="back" href={D.urls.home} title="Về màn hình thu ngân"><Icon name="arrowleft" size={20} /></a>
        <div style={{ minWidth: 0 }}>
          <div className="ttl">Lên đơn</div>
          <div className="sub">{D.staff?.name}</div>
        </div>
        {stores.length > 1 ? (
          <select value={storeId} onChange={e => setStoreId(Number(e.target.value))} className="hide-sm" title="Cửa hàng đang bán">
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        ) : <span className="sub hide-sm">{curStore?.name}</span>}
        <div className="sp" />
        {step === "menu" && channel && (
          <button className="ch-chip" style={{ background: chColor }} onClick={() => setStep("start")} title="Đổi loại đơn">
            <Icon name={CH_ICON[channel]} size={18} color="#fff" /> {CH[channel]?.label}{code ? <small>· {code}</small> : null}
          </button>
        )}
        <button className="tbtn" onClick={() => setShowOrders(true)}><Icon name="receipt" size={17} /><span className="hide-sm">Đơn đã lên</span></button>
        <button className="tbtn" onClick={() => setShowPrinter(true)} title="Cài đặt máy in"><Icon name="print" size={17} /></button>
        <span className="hide-sm"><Clock /></span>
      </div>

      {step === "start" ? (
        <div className="start">
          <div style={{ width: "100%", maxWidth: 980 }}>
            <h2>Chọn loại đơn</h2>
            <p>{lines.length ? `Đơn đang có ${cups} ly — chọn loại đơn để tiếp tục` : "Đơn app giao hàng sẽ hỏi mã đơn trước khi chọn món"}</p>
            <div className="ch-grid">
              {CHANNELS.map(c => (
                <button key={c.key} className="ch-btn" style={{ background: CH_COLOR[c.key] }} onClick={() => chooseChannel(c.key)}>
                  <Icon name={CH_ICON[c.key]} size={34} color="#fff" />
                  <span className="big">{c.label}</span>
                  <small>{c.app ? "Nhập mã đơn" : c.key === "tai_cho" ? "Uống tại quán" : "Khách mang đi"}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="ps-body">
          <div className="ps-menu">
            <div className="ps-cats">
              <button className={"ps-cat" + (cat === "all" ? " on" : "")} onClick={() => setCat("all")}>Tất cả</button>
              {cats.map(c => <button key={c.key} className={"ps-cat" + (cat === c.key ? " on" : "")} onClick={() => setCat(c.key)}>{c.label}</button>)}
            </div>
            <div className="ps-search">
              <span className="ic"><Icon name="search" size={18} /></span>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm món (gõ không dấu được)" />
            </div>
            <div className="ps-grid-wrap">
              {(cat === "all" && !q ? cats : [{ key: cat, label: null }]).map(c => {
                const items = cat === "all" && !q ? shown.filter(m => m.cat === c.key) : shown;
                if (!items.length) return null;
                return (
                  <div key={c.key}>
                    {c.label && <div className="ps-group-h">{c.label}</div>}
                    <div className="ps-grid">
                      {items.map(m => (
                        <button key={m.id} className={"ps-item" + (m.available === false ? " off" : "")} onClick={() => tapItem(m)}>
                          <div className="pic" style={m.img ? { backgroundImage: `url(${m.img})` } : { background: m.grad }}>{!m.img && <Icon name="cup" size={28} color="#fff" />}</div>
                          <div className="nm">{m.name}</div>
                          <div className="pr">{m.available === false ? "Tạm hết" : money(m.price)}</div>
                          {countById[m.id] ? <span className="cnt">{countById[m.id]}</span> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!shown.length && <div className="tk-empty">Không tìm thấy món nào.</div>}
            </div>
            <div className="tk-bar">
              <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 700 }}>{cups} ly</div><b style={{ fontFamily: "var(--display)", fontSize: 20 }}>{money(total)}</b></div>
              <button className="btn" style={{ background: chColor }} disabled={!lines.length} onClick={() => setTicketOpen(true)}>Xem đơn & lưu</button>
            </div>
          </div>
          {ticket}
        </div>
      )}

      {pick && (
        <CustomizeSheet item={pick.item} variantGroups={groupsOf(pick.item)} withNote
          initialSelections={pick.line?.selections || null} initialQty={pick.line?.qty || 1} initialNote={pick.line?.note || ""}
          editing={!!pick.line} onClose={() => setPick(null)} onAdd={onSheetAdd} />
      )}
      {codeFor && <CodeDialog channel={codeFor} initial={channel === codeFor ? code : ""} onCancel={() => setCodeFor(null)} onOk={confirmCode} />}
      {showOrders && <OrdersDialog storeId={storeId} onClose={() => setShowOrders(false)} onPrint={doPrint} notify={notify} />}
      {showPrinter && <PrinterSettings onClose={() => setShowPrinter(false)} onSaved={() => notify("Đã lưu cài đặt máy in")} />}

      {done && (
        <div className="dlg-scrim">
          <div className="dlg" style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: CH_COLOR[done.channel], color: "#fff", display: "grid", placeItems: "center", margin: "0 auto 10px" }}><Icon name="check" size={34} color="#fff" /></div>
            <h3>Đã lưu đơn #{done.queue_no}</h3>
            <p className="hint">{done.channel_label}{done.external_code ? ` · ${done.external_code}` : ""} · {done.items.reduce((n, i) => n + i.qty, 0)} ly · {money(done.total)}</p>
            <div className="row" style={{ marginBottom: 10 }}>
              <button className="btn ghost" onClick={() => doPrint(done, "receipt")}><Icon name="receipt" size={18} /> In hoá đơn</button>
              <button className="btn ghost" onClick={() => doPrint(done, "label")}><Icon name="ticket" size={18} /> In tem</button>
            </div>
            <button className="btn" style={{ width: "100%", height: 56 }} autoFocus onClick={() => { setDone(null); resetOrder(); }}>
              <Icon name="plus" size={20} color="#fff" /> Đơn mới
            </button>
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<SellApp />);
