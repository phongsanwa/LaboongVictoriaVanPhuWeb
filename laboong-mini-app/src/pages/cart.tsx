import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/page-header";
import { Ico } from "../components/icons";
import { Page, Sheet, useNavigate, useSnackbar } from "zmp-ui";
import { Empty, LoginCard, Stepper, Thumb } from "../components/ui";
import { api } from "../lib/api";
import { haversineKm, money } from "../lib/format";
import { optsText } from "../lib/variants";
import { useAuth } from "../state/auth";
import { useCart } from "../state/cart";
import { useData } from "../state/data";
import type { CartVoucher, OrderPromo, Quote, ShippingPromo } from "../types";

interface WalletVoucher extends CartVoucher { fromReward?: boolean }

function feeFor(km: number, tiers: { min_km: number; max_km: number | null; fee: number }[]) {
  if (!tiers.length) return 0;
  const sorted = [...tiers].sort((a, b) => a.min_km - b.min_km);
  for (const t of sorted) if (km >= t.min_km && (t.max_km === null || km < t.max_km)) return t.fee;
  return sorted[sorted.length - 1].fee;
}

export default function CartPage() {
  const cart = useCart();
  const { menu, reloadMenu } = useData();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();

  const [addrId, setAddrId] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState<"cod" | "bank">("cod");
  const [vouchers, setVouchers] = useState<{ order: WalletVoucher[]; shipping: WalletVoucher[] }>({ order: [], shipping: [] });
  const [voucherId, setVoucherId] = useState<number | null>(null);
  const [promoId, setPromoId] = useState<number | null>(null);
  const [shipVoucherId, setShipVoucherId] = useState<number | null>(null);
  const [shipPromoId, setShipPromoId] = useState<number | null>(null);
  const [km, setKm] = useState<number | null>(null);
  const [distState, setDistState] = useState<"idle" | "pending" | "ok" | "fail">("idle");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [offers, setOffers] = useState(false);
  const [placing, setPlacing] = useState(false);

  const storeId = cart.storeId ?? menu?.storeId ?? null;
  const store = menu?.stores.find((s) => s.id === storeId) || menu?.stores[0];
  const ship = cart.mode === "ship";
  const addresses = menu?.addresses || [];
  const address = addresses.find((a) => a.id === addrId) || null;

  useEffect(() => { if (user && !phone) setPhone(user.phone || ""); }, [user]); // eslint-disable-line
  useEffect(() => { if (!addrId && addresses.length) setAddrId((addresses.find((a) => a.def) || addresses[0]).id); }, [addresses]); // eslint-disable-line

  // Voucher trong ví của khách (giảm đơn + giảm ship), gồm cả voucher từ quà đổi điểm.
  useEffect(() => {
    if (!user) return;
    api<{ order: CartVoucher[]; shipping: CartVoucher[]; redemptions: { voucher: CartVoucher | null }[] }>("/cart/vouchers")
      .then((r) => {
        const fromRewards = r.redemptions.map((x) => x.voucher).filter(Boolean).map((v) => ({ ...(v as CartVoucher), fromReward: true }));
        const seen = new Set<number>();
        const order = [...r.order, ...fromRewards].filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)));
        setVouchers({ order, shipping: r.shipping });
      })
      .catch(() => {});
  }, [user]);

  // Khoảng cách giao hàng: ưu tiên đường bộ (máy chủ tính), lỗi thì dùng đường chim bay.
  useEffect(() => {
    setKm(null); setGeo(null); setDistState("idle");
    if (!ship || !address) return;
    if (!store?.lat || !store?.lng) { setDistState("fail"); return; }
    let cancelled = false;
    setDistState("pending");
    (async () => {
      let lat = address.lat, lng = address.lng;
      if (!lat || !lng) {
        try {
          const g = await api<{ ok: boolean; lat: number; lng: number }>(`/geo/geocode?q=${encodeURIComponent(address.text)}`);
          if (g.ok) { lat = g.lat; lng = g.lng; }
        } catch { /* bỏ qua */ }
      }
      if (cancelled) return;
      if (!lat || !lng) { setDistState("fail"); return; }
      setGeo({ lat, lng });
      let d: number | null = null;
      try {
        const r = await api<{ ok: boolean; km: number }>(`/geo/distance?olat=${store.lat}&olng=${store.lng}&dlat=${lat}&dlng=${lng}`);
        if (r.ok) d = r.km;
      } catch { /* bỏ qua */ }
      if (!cancelled) { setKm(d ?? haversineKm(store.lat!, store.lng!, lat, lng)); setDistState("ok"); }
    })();
    return () => { cancelled = true; };
  }, [ship, address?.id, store?.id]); // eslint-disable-line

  const shipFee = ship && km != null ? feeFor(km, menu?.shippingTiers || []) : 0;
  const subtotal = cart.subtotal;

  const body = useMemo(() => ({
    lines: cart.lines.map((l) => ({ id: l.id, qty: l.qty, ...(l.selections ? { selections: l.selections } : {}) })),
    note: note.trim() || null,
    store_id: storeId,
    shipping_fee: ship ? shipFee : 0,
    payment_method: payment,
    delivery_address: ship ? address?.text || null : null,
    delivery_phone: ship ? phone.trim() || null : null,
    delivery_lat: ship ? geo?.lat ?? null : null,
    delivery_lng: ship ? geo?.lng ?? null : null,
    voucher_id: voucherId, order_promo_id: promoId,
    shipping_voucher_id: ship ? shipVoucherId : null, ship_promo_id: ship ? shipPromoId : null,
  }), [cart.lines, note, storeId, ship, shipFee, payment, address, phone, geo, voucherId, promoId, shipVoucherId, shipPromoId]);

  // Tổng tiền tính lại ở máy chủ (đúng khuyến mãi, flash sale, voucher như website).
  useEffect(() => {
    if (!user || !cart.lines.length) { setQuote(null); return; }
    const t = setTimeout(() => {
      api<Quote>("/orders", { body: { ...body, quote: true } })
        .then((q) => { setQuote(q); setQuoteErr(null); })
        .catch((e) => { setQuote(null); setQuoteErr(e.message); });
    }, 350);
    return () => clearTimeout(t);
  }, [body, user, cart.lines.length]);

  if (!cart.lines.length) {
    return (
      <Page className="page with-nav">
        <PageHeader title="Giỏ hàng" back={false} />
        <Empty icon="🛒" title="Giỏ hàng đang trống" sub="Chọn món yêu thích để đặt ngay nhé!" action={<button className="btn" onClick={() => navigate("/menu")}>Xem thực đơn</button>} />
      </Page>
    );
  }

  const usable = (min: number | null | undefined) => subtotal >= (min || 0);
  const offerCount = vouchers.order.length + (menu?.orderPromos.length || 0) + (ship ? vouchers.shipping.length + (menu?.shippingPromos.length || 0) : 0);
  const chosen = [voucherId, promoId, ship ? shipVoucherId : null, ship ? shipPromoId : null].filter(Boolean).length;
  const bankOn = !!menu?.payment.bankEnabled;

  const place = async () => {
    if (ship && !address) return openSnackbar({ text: "Chọn địa chỉ giao hàng", type: "error" });
    if (ship && !/^0\d{9}$/.test(phone.trim())) return openSnackbar({ text: "Số điện thoại nhận hàng gồm 10 số, bắt đầu bằng 0", type: "error" });
    setPlacing(true);
    try {
      const r = await api<{ order_code: string; total_amount: number; payment_method: string; points_earned: number; message: string }>("/orders", { body });
      cart.clear();
      setVoucherId(null); setPromoId(null); setShipVoucherId(null); setShipPromoId(null); setNote("");
      refresh(); reloadMenu();
      navigate("/order-done", { state: { ...r, bank: menu?.payment }, replace: true });
    } catch (e: any) {
      openSnackbar({ text: e.message, type: "error" });
    } finally { setPlacing(false); }
  };

  const row = (label: React.ReactNode, value: React.ReactNode, color?: string) => (
    <div className="between" style={{ padding: "4px 0", fontSize: 14.5 }}><span style={{ color: "var(--ink-2)" }}>{label}</span><span style={{ fontWeight: 700, color }}>{value}</span></div>
  );

  return (
    <Page className="page with-nav with-bar">
      <PageHeader title="Giỏ hàng" back={false} />

      <div className="section">
        <div className="seg">
          <button className={!ship ? "on" : ""} onClick={() => cart.setMode("pickup")}>🏪 Nhận tại quầy</button>
          <button className={ship ? "on" : ""} onClick={() => cart.setMode("ship")}>🛵 Giao tận nơi</button>
        </div>
      </div>

      <div className="section card">
        <div className="muted small">{ship ? "Giao từ cửa hàng" : "Nhận tại cửa hàng"}</div>
        <div className="bold">{store?.name}</div>
        <div className="muted small">{store?.address}</div>
        {(menu?.stores.length || 0) > 1 && (
          <div className="chips" style={{ padding: "10px 0 0" }}>
            {menu!.stores.map((s) => <button key={s.id} className={"chip" + (s.id === storeId ? " on" : "")} onClick={() => cart.setStoreId(s.id)}>{s.name}</button>)}
          </div>
        )}
      </div>

      {ship && user && (
        <div className="section card stack">
          <div className="between"><div className="bold">Địa chỉ giao hàng</div><button className="link" onClick={() => navigate("/addresses")}>+ Thêm / sửa</button></div>
          {addresses.length === 0 ? <div className="muted">Chưa có địa chỉ — bấm "Thêm / sửa" để thêm.</div> : addresses.map((a) => (
            <button key={a.id} className="row" style={{ border: 0, background: "none", textAlign: "left", padding: 0 }} onClick={() => setAddrId(a.id)}>
              <Ico name={a.id === addrId ? "dot" : "circle"} color="var(--brand)" />
              <div style={{ minWidth: 0 }}><div className="bold small">{a.label}</div><div className="small" style={{ color: "var(--ink-2)" }}>{a.text}</div></div>
            </button>
          ))}
          <div className="field"><label>Số điện thoại nhận hàng</label><input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          {address && <div className="muted small">{distState === "pending" ? "Đang tính khoảng cách…" : distState === "fail" ? "Chưa xác định được vị trí địa chỉ — quán sẽ gọi xác nhận phí ship." : km != null ? `Khoảng cách ~${km.toFixed(1)} km · Phí ship ${money(shipFee)}` : ""}</div>}
        </div>
      )}

      <div className="section card" style={{ padding: "4px 14px" }}>
        {cart.lines.map((l) => (
          <div key={l.key} className="row" style={{ padding: "12px 0", borderBottom: "1px solid #F2EFE6", alignItems: "flex-start" }}>
            <Thumb img={l.img} grad={l.grad} size={56} radius={12} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bold">{l.name}</div>
              {l.selections && <div className="muted small">{optsText(l, menu?.variantGroups || [])}</div>}
              <div className="between" style={{ marginTop: 6 }}>
                <span className="price">{money(l.unit * l.qty)}</span>
                <Stepper value={l.qty} onChange={(n) => cart.setQty(l.key, n)} />
              </div>
            </div>
          </div>
        ))}
        <button className="link" style={{ padding: "12px 0" }} onClick={() => navigate("/menu")}>+ Thêm món</button>
      </div>

      {!user ? (
        <div className="section"><LoginCard title="Đăng nhập để đặt hàng" onError={(m) => openSnackbar({ text: m, type: "error" })} /></div>
      ) : (
        <>
          <div className="section">
            <button className="card between" style={{ width: "100%", textAlign: "left" }} onClick={() => setOffers(true)}>
              <div className="row"><span style={{ fontSize: 20 }}>🎟️</span><div><div className="bold">Ưu đãi & voucher</div><div className="muted small">{chosen ? `Đã chọn ${chosen} ưu đãi` : offerCount ? `Có ${offerCount} ưu đãi có thể dùng` : "Chưa có ưu đãi"}</div></div></div>
              <Ico name="right" />
            </button>
          </div>

          <div className="section card stack">
            <div className="bold">Thanh toán</div>
            <div className="seg">
              <button className={payment === "cod" ? "on" : ""} onClick={() => setPayment("cod")}>💵 Tiền mặt</button>
              <button className={payment === "bank" ? "on" : ""} disabled={!bankOn} onClick={() => bankOn && setPayment("bank")}>🏦 Chuyển khoản</button>
            </div>
            {!bankOn && <div className="muted small">Quán chưa bật chuyển khoản — thanh toán khi nhận món.</div>}
            <div className="field"><label>Ghi chú cho quán</label><textarea className="input" rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="VD: ít đá, giao giờ hành chính…" /></div>
          </div>

          <div className="section card">
            {quote ? (
              <>
                {row("Tạm tính", money(quote.subtotal))}
                {quote.badge_discount > 0 && row("Khuyến mãi gạch giá", "−" + money(quote.badge_discount), "var(--flash)")}
                {quote.voucher_discount > 0 && row("Voucher", "−" + money(quote.voucher_discount), "var(--flash)")}
                {quote.promo_discount > 0 && row("Mã giảm đơn", "−" + money(quote.promo_discount), "var(--flash)")}
                {ship && row("Phí giao hàng", money(quote.shipping_fee))}
                {quote.ship_discount > 0 && row("Giảm phí ship", "−" + money(quote.ship_discount), "var(--flash)")}
                {quote.weather_surcharge > 0 && row(menu?.weatherSurcharge.label || "Phụ thu thời tiết", money(quote.weather_surcharge))}
                <div className="between" style={{ borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 8 }}>
                  <span className="bold">Tổng thanh toán</span><span className="price" style={{ fontSize: 20 }}>{money(quote.total)}</span>
                </div>
                {quote.points_earned > 0 && <div className="muted small" style={{ marginTop: 4 }}>Nhận +{quote.points_earned} điểm khi đơn hoàn tất</div>}
              </>
            ) : quoteErr ? <div style={{ color: "var(--danger)", fontWeight: 600 }}>{quoteErr}</div> : <div className="muted">Đang tính tổng tiền…</div>}
          </div>
        </>
      )}
      <div style={{ height: 20 }} />

      {user && (
        <div className="bottom-bar above-nav between">
          <div><div className="muted small">Tổng cộng</div><div className="price" style={{ fontSize: 19 }}>{money(quote?.total ?? subtotal + shipFee)}</div></div>
          <button className="btn" style={{ minWidth: 150 }} disabled={placing || !quote || (ship && (!address || distState === "pending"))} onClick={place}>{placing ? "Đang đặt…" : "Đặt hàng"}</button>
        </div>
      )}

      <Sheet visible={offers} onClose={() => setOffers(false)} mask handler swipeToClose height="80vh" title="Ưu đãi & voucher">
        <div className="sheet-body" style={{ overflowY: "auto", height: "100%" }}>
          <OfferGroup title="Voucher của bạn" empty="Chưa có voucher — đổi điểm lấy quà ở mục Đổi quà"
            items={vouchers.order.map((v) => ({ id: v.id, name: v.name, sub: v.min_purchase ? `Đơn từ ${money(v.min_purchase)}` : v.valid_until ? `HSD ${v.valid_until}` : "", ok: usable(v.min_purchase) }))}
            value={voucherId} onChange={setVoucherId} />
          <OfferGroup title="Mã giảm đơn" empty="Hiện chưa có mã giảm đơn"
            items={(menu?.orderPromos || []).map((p: OrderPromo) => ({ id: p.id, name: p.name, sub: [p.badge, p.min_purchase ? `Đơn từ ${money(p.min_purchase)}` : ""].filter(Boolean).join(" · "), ok: usable(p.min_purchase) }))}
            value={promoId} onChange={setPromoId} />
          {ship && (
            <>
              <OfferGroup title="Voucher phí ship" empty="Chưa có voucher phí ship"
                items={vouchers.shipping.map((v) => ({ id: v.id, name: v.name, sub: v.valid_until ? `HSD ${v.valid_until}` : "", ok: usable(v.min_purchase) }))}
                value={shipVoucherId} onChange={(id) => { setShipVoucherId(id); if (id) setShipPromoId(null); }} />
              <OfferGroup title="Ưu đãi phí ship" empty="Hiện chưa có ưu đãi phí ship"
                items={(menu?.shippingPromos || []).map((p: ShippingPromo) => ({ id: p.id, name: p.name, sub: [p.badge, p.min_order_amount ? `Đơn từ ${money(p.min_order_amount)}` : "", p.max_km ? `≤ ${p.max_km} km` : ""].filter(Boolean).join(" · "), ok: usable(p.min_order_amount) && (p.max_km == null || km == null || km <= p.max_km) }))}
                value={shipPromoId} onChange={(id) => { setShipPromoId(id); if (id) setShipVoucherId(null); }} />
            </>
          )}
          <button className="btn block" style={{ marginTop: 16 }} onClick={() => setOffers(false)}>Xong</button>
        </div>
      </Sheet>
    </Page>
  );
}

function OfferGroup({ title, items, value, onChange, empty }: {
  title: string; empty: string; value: number | null; onChange: (id: number | null) => void;
  items: { id: number; name: string; sub: string; ok: boolean }[];
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <div className="bold" style={{ marginBottom: 8 }}>{title}</div>
      {items.length === 0 ? <div className="muted small">{empty}</div> : (
        <div className="stack" style={{ gap: 8 }}>
          {items.map((it) => {
            const on = value === it.id;
            return (
              <button key={it.id} className="card row" disabled={!it.ok}
                style={{ textAlign: "left", padding: 12, opacity: it.ok ? 1 : 0.5, borderColor: on ? "var(--brand)" : undefined, background: on ? "var(--brand-soft)" : "#fff" }}
                onClick={() => onChange(on ? null : it.id)}>
                <Ico name={on ? "check" : "circle"} color="var(--brand)" />
                <div style={{ minWidth: 0 }}>
                  <div className="bold small">{it.name}</div>
                  {it.sub && <div className="muted small">{it.sub}{!it.ok ? " · chưa đủ điều kiện" : ""}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
