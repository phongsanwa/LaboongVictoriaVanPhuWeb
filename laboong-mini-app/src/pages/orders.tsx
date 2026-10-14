import React, { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../components/page-header";
import { Page, Sheet, useNavigate } from "zmp-ui";
import { Empty, ErrorBox, Loading, LoginCard } from "../components/ui";
import { api } from "../lib/api";
import { money, vietQrUrl } from "../lib/format";
import { useAuth } from "../state/auth";
import { useCart } from "../state/cart";
import { useData } from "../state/data";
import { extraOf, lineKey, productGroups, storeOffSet } from "../lib/variants";
import type { OrderHistoryItem } from "../types";

const STATUS: Record<string, string> = { new: "Chờ xác nhận", making: "Đang pha chế", ready: "Sẵn sàng / đang giao", done: "Hoàn tất", cancel: "Đã huỷ" };

export default function OrdersPage() {
  const { user } = useAuth();
  const cart = useCart();
  const { menu } = useData();
  const navigate = useNavigate();
  const [data, setData] = useState<{ orders: OrderHistoryItem[]; bank: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<OrderHistoryItem | null>(null);

  const load = useCallback(async () => {
    try { setData(await api("/orders")); setError(null); } catch (e: any) { setError(e.message); }
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 30000); // cập nhật trạng thái đơn mỗi 30 giây
    return () => clearInterval(t);
  }, [user, load]);

  // Đặt lại: lấy giá hiện tại theo thực đơn, bỏ qua món đã ngừng bán.
  const reorder = (o: OrderHistoryItem) => {
    if (!menu) return;
    const off = storeOffSet(menu.storeOffs, cart.storeId ?? menu.storeId);
    o.items.forEach((it) => {
      const p = menu.menu.find((m) => m.id === it.id);
      if (!p || !p.available) return;
      const groups = productGroups(p, menu.variantGroups, off);
      const sel = it.selections && groups.length ? it.selections : null;
      const extra = sel ? extraOf(groups, sel) : 0;
      const base = p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;
      cart.add({ key: lineKey(p.id, sel), id: p.id, name: p.name, img: p.img, grad: p.grad, unit: base + extra, origUnit: p.price + extra, qty: it.qty, selections: sel });
    });
    setOpen(null);
    navigate("/cart");
  };

  return (
    <Page className="page with-nav">
      <PageHeader title="Đơn hàng của tôi" back={false} />
      {!user ? <div className="section"><LoginCard title="Đăng nhập để xem đơn hàng" /></div>
        : error ? <ErrorBox text={error} onRetry={load} />
        : !data ? <Loading />
        : data.orders.length === 0 ? <Empty icon="🧾" title="Chưa có đơn hàng" sub="Đơn bạn đặt trên mini app và website sẽ hiện ở đây." action={<button className="btn" onClick={() => navigate("/menu")}>Đặt món ngay</button>} />
        : (
          <div className="section stack">
            {data.orders.map((o) => (
              <button key={o.code} className="card" style={{ textAlign: "left" }} onClick={() => setOpen(o)}>
                <div className="between">
                  <div className="bold">{o.code} <span className="muted small">· {o.type === "ship" ? "Giao tận nơi" : "Nhận tại quầy"}</span></div>
                  <span className={`badge status-${o.status}`}>{STATUS[o.status] || o.status}</span>
                </div>
                <div className="muted small" style={{ marginTop: 4 }}>{o.time} · {o.store}</div>
                <div className="small ellipsis" style={{ marginTop: 6, color: "var(--ink-2)" }}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</div>
                <div className="between" style={{ marginTop: 8 }}>
                  <span className="price">{money(o.total)}</span>
                  {o.paymentMethod === "bank" && o.paymentStatus !== "paid" && o.status !== "cancel" ? <span className="badge red">Chưa chuyển khoản</span>
                    : o.points > 0 ? <span className="badge gold">+{o.points} điểm</span> : null}
                </div>
              </button>
            ))}
          </div>
        )}
      <div style={{ height: 20 }} />

      <Sheet visible={!!open} onClose={() => setOpen(null)} mask handler swipeToClose height="85vh" title={open ? `Đơn ${open.code}` : ""}>
        {open && (
          <div className="sheet-body" style={{ overflowY: "auto", height: "100%" }}>
            <span className={`badge status-${open.status}`}>{STATUS[open.status] || open.status}</span>
            <div className="muted small" style={{ marginTop: 8 }}>{open.time} · {open.store}</div>
            <div className="small" style={{ marginTop: 4 }}>{open.type === "ship" ? `Giao tới: ${open.addr}` : `Nhận tại: ${open.storeAddr}`}</div>
            <div className="card" style={{ marginTop: 12, padding: "4px 12px" }}>
              {open.items.map((it, i) => (
                <div key={i} className="between" style={{ padding: "8px 0", borderBottom: "1px solid #F2EFE6", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}><div className="bold small">{it.qty}× {it.name}</div>{it.opt && <div className="muted small">{it.opt}</div>}</div>
                  <div className="small bold">{money(it.unit * it.qty)}</div>
                </div>
              ))}
              <div style={{ padding: "8px 0" }}>
                <div className="between small"><span>Tạm tính</span><span>{money(open.sub)}</span></div>
                {open.discounts.map((d, i) => <div key={i} className="between small" style={{ color: "var(--flash)" }}><span>{d.label}</span><span>−{money(d.amount)}</span></div>)}
                {open.type === "ship" && <div className="between small"><span>Phí giao hàng</span><span>{money(open.ship)}</span></div>}
                <div className="between bold" style={{ marginTop: 6 }}><span>Tổng</span><span className="price">{money(open.total)}</span></div>
              </div>
            </div>
            {open.paymentMethod === "bank" && open.paymentStatus !== "paid" && open.status !== "cancel" && data?.bank?.ready && (
              <div className="card" style={{ marginTop: 12, textAlign: "center" }}>
                <div className="bold">Chuyển khoản cho đơn này</div>
                <img src={vietQrUrl(data.bank, open.total, open.code)} alt="VietQR" style={{ width: "100%", maxWidth: 280, margin: "10px auto 0" }} />
              </div>
            )}
            <button className="btn ghost block" style={{ marginTop: 16 }} onClick={() => reorder(open)}>Đặt lại đơn này</button>
          </div>
        )}
      </Sheet>
    </Page>
  );
}
