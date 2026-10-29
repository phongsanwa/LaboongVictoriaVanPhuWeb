import React, { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "../components/page-header";
import { Ico } from "../components/icons";
import { Page, Sheet, useNavigate, useSearchParams } from "zmp-ui";
import { ProductSheet } from "../components/product-sheet";
import { ErrorBox, Loading, Price, PromoBadge, Thumb } from "../components/ui";
import { money } from "../lib/format";
import { useCart } from "../state/cart";
import { useData } from "../state/data";
import type { Product } from "../types";

const noAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

export default function MenuPage() {
  const { menu, error, reloadMenu } = useData();
  const cart = useCart();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState<Product | null>(null);
  const [pickStore, setPickStore] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Mở thẳng 1 món khi đến từ trang chủ / flash sale (?p=p12).
  useEffect(() => {
    const pid = params.get("p");
    if (pid && menu) {
      const p = menu.menu.find((m) => m.id === pid);
      if (p) setOpen(p);
      params.delete("p");
      setParams(params, { replace: true });
    }
  }, [menu, params, setParams]);

  const storeId = cart.storeId ?? menu?.storeId ?? null;
  const store = menu?.stores.find((s) => s.id === storeId) || menu?.stores[0];

  const groups = useMemo(() => {
    if (!menu) return [];
    const words = noAccent(q).split(/\s+/).filter(Boolean);
    const match = (p: Product) => !words.length || words.every((w) => noAccent(p.name + " " + p.desc).includes(w));
    return menu.cats
      .map((c) => ({ cat: c, items: menu.menu.filter((p) => p.cat === c.key && match(p)) }))
      .filter((g) => g.items.length && (cat === "all" || g.cat.key === cat || q));
  }, [menu, q, cat]);

  if (!menu) return <Page className="page"><PageHeader title="Thực đơn" back={false} />{error ? <ErrorBox text={error} onRetry={reloadMenu} /> : <Loading />}</Page>;

  const jump = (key: string) => {
    setCat(key);
    if (key !== "all") setTimeout(() => sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  return (
    <Page className={"page with-nav" + (cart.count ? " with-bar" : "")}>
      <PageHeader title="Thực đơn" back={false} />
      <div style={{ position: "sticky", top: "var(--header-h)", zIndex: 20, background: "var(--cream)", paddingTop: 10, paddingBottom: 8 }}>
        <div className="pad">
          <button className="card between" style={{ width: "100%", padding: "10px 12px", textAlign: "left" }} onClick={() => setPickStore(true)}>
            <div style={{ minWidth: 0 }}>
              <div className="muted small">Đặt tại cửa hàng</div>
              <div className="bold ellipsis">{store?.name || "Chọn cửa hàng"}</div>
            </div>
            <Ico name="down" />
          </button>
          <div style={{ position: "relative", marginTop: 10 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", display: "flex" }}><Ico name="search" /></span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm món (gõ không dấu được)" style={{ paddingLeft: 42 }} />
          </div>
        </div>
        <div className="chips" style={{ marginTop: 10 }}>
          <button className={"chip" + (cat === "all" ? " on" : "")} onClick={() => jump("all")}>Tất cả</button>
          {menu.cats.map((c) => <button key={c.key} className={"chip" + (cat === c.key ? " on" : "")} onClick={() => jump(c.key)}>{c.label}</button>)}
        </div>
      </div>

      {groups.length === 0 && <div className="empty">Không tìm thấy món nào{q ? ` cho "${q}"` : ""}.</div>}
      {groups.map((g) => (
        <div key={g.cat.key} ref={(el) => (sectionRefs.current[g.cat.key] = el)} className="section" style={{ scrollMarginTop: 220 }}>
          <div className="section-title">{g.cat.label}</div>
          <div className="stack">
            {g.items.map((p) => (
              <button key={p.id} className="card row" style={{ textAlign: "left", gap: 12, opacity: p.available ? 1 : 0.5 }} onClick={() => p.available && setOpen(p)}>
                <Thumb img={p.img} grad={p.grad} size={76} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bold">{p.name}</div>
                  {p.desc && <div className="muted small clamp2" style={{ marginTop: 2 }}>{p.desc}</div>}
                  <div className="between" style={{ marginTop: 6 }}>
                    <div>
                      <Price price={p.price} sale={p.salePrice} flash={!!p.isFlash} />
                      {p.promoLabel && <div><PromoBadge label={p.promoLabel} flash={p.isFlash} /></div>}
                    </div>
                    {p.available
                      ? <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 700 }}>+</span>
                      : <span className="badge gray">Hết món</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div style={{ height: 24 }} />

      {cart.count > 0 && (
        <button className="cart-float" onClick={() => navigate("/cart")}>
          <span>🛒 {cart.count} món</span>
          <span>{money(cart.subtotal)} · Xem giỏ ›</span>
        </button>
      )}

      <ProductSheet product={open} onClose={() => setOpen(null)} />

      <Sheet visible={pickStore} onClose={() => setPickStore(false)} autoHeight mask handler swipeToClose title="Chọn cửa hàng">
        <div className="sheet-body stack">
          {menu.stores.map((s) => (
            <button key={s.id} className="card" style={{ textAlign: "left", borderColor: s.id === storeId ? "var(--brand)" : undefined, background: s.id === storeId ? "var(--brand-soft)" : "#fff" }}
              onClick={() => { cart.setStoreId(s.id); setPickStore(false); }}>
              <div className="bold">{s.name}</div>
              <div className="muted small" style={{ marginTop: 2 }}>{s.address}</div>
              {s.open && <div className="muted small">Mở cửa {s.open.slice(0, 5)} – {s.close?.slice(0, 5)}</div>}
            </button>
          ))}
        </div>
      </Sheet>
    </Page>
  );
}
