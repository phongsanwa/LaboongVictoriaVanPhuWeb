import React, { useEffect, useMemo, useState } from "react";
import { Sheet, useSnackbar } from "zmp-ui";
import { money } from "../lib/format";
import { defaultSelections, extraOf, lineKey, productGroups, storeOffSet } from "../lib/variants";
import { useCart } from "../state/cart";
import { useData } from "../state/data";
import type { Product, Selections } from "../types";
import { Price, Stepper, Thumb } from "./ui";

const MAX_TOPPING = 10;

/** Chọn size / topping / đường / đá rồi thêm vào giỏ — giống bảng tuỳ chọn trên website. */
export function ProductSheet({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { menu } = useData();
  const cart = useCart();
  const { openSnackbar } = useSnackbar();
  const storeId = cart.storeId ?? menu?.storeId ?? null;

  const groups = useMemo(() => {
    if (!product || !menu) return [];
    return productGroups(product, menu.variantGroups, storeOffSet(menu.storeOffs, storeId));
  }, [product, menu, storeId]);

  const [sel, setSel] = useState<Selections>({});
  const [qty, setQty] = useState(1);
  useEffect(() => { setSel(defaultSelections(groups)); setQty(1); }, [groups]);

  if (!product) return <Sheet visible={false} onClose={onClose} />;

  const base = product.salePrice != null && product.salePrice < product.price ? product.salePrice : product.price;
  const extra = extraOf(groups, sel);
  const unit = base + extra;
  const soldOut = !product.available || groups.some((g) => g.type !== "addon" && g.required && g.options.length > 0 && !g.options.some((o) => o.available));
  const addonCount = (key: string, id: string) => ((sel[key] as string[]) || []).filter((x) => x === id).length;
  const setAddon = (key: string, id: string, n: number) => setSel((s) => {
    const rest = ((s[key] as string[]) || []).filter((x) => x !== id);
    return { ...s, [key]: [...rest, ...Array(Math.max(0, Math.min(MAX_TOPPING, n))).fill(id)] };
  });

  const add = () => {
    const selections = groups.length ? sel : null;
    cart.add({
      key: lineKey(product.id, selections), id: product.id, name: product.name, img: product.img, grad: product.grad,
      unit, origUnit: product.price + extra, qty, selections,
    });
    openSnackbar({ text: `Đã thêm ${qty} ${product.name}`, type: "success", duration: 1500 });
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} autoHeight mask handler swipeToClose>
      <div className="sheet-body" style={{ maxHeight: "78vh", overflowY: "auto" }}>
        <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
          <Thumb img={product.img} grad={product.grad} size={88} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="bold" style={{ fontSize: 17 }}>{product.name}</div>
            {product.promoLabel && <span className="badge red" style={{ marginTop: 4 }}>{product.promoLabel}</span>}
            <div style={{ marginTop: 6 }}><Price price={product.price} sale={product.salePrice} flash={!!product.promoLabel?.includes("Flash")} /></div>
            {product.desc && <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>{product.desc}</div>}
          </div>
        </div>

        {groups.map((g) => (
          <div key={g.key} className="opt-group">
            <h4>{g.label} {g.required ? <span className="badge gold">Bắt buộc</span> : g.type === "addon" ? <span className="muted small">Không bắt buộc</span> : null}</h4>
            {g.type === "addon" ? (
              g.options.map((o) => (
                <div key={o.id} className="addon-row" style={{ opacity: o.available ? 1 : 0.45 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{o.label}</div>
                    <div className="muted small">{o.available ? `+${money(o.extra)}` : "Tạm hết"}</div>
                  </div>
                  {o.available && <Stepper value={addonCount(g.key, o.id)} max={MAX_TOPPING} onChange={(n) => setAddon(g.key, o.id, n)} />}
                </div>
              ))
            ) : (
              <div className="opt-pills">
                {g.options.map((o) => (
                  <button key={o.id} className={"opt-pill" + (sel[g.key] === o.id ? " on" : "")} disabled={!o.available}
                    onClick={() => setSel((s) => ({ ...s, [g.key]: o.id }))}>
                    {o.label}{o.extra > 0 ? ` +${money(o.extra)}` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="between" style={{ marginTop: 20 }}>
          <span className="bold">Số lượng</span>
          <Stepper value={qty} min={1} onChange={setQty} />
        </div>
        <button className="btn block" style={{ marginTop: 16 }} disabled={soldOut} onClick={add}>
          {soldOut ? "Tạm hết món" : `Thêm vào giỏ · ${money(unit * qty)}`}
        </button>
      </div>
    </Sheet>
  );
}
