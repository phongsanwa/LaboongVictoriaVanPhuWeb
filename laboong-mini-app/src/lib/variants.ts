import type { CartLine, Product, Selections, VariantGroup } from "../types";

/** Option đang hết riêng ở cửa hàng đã chọn: Set "TYPE|Tên". */
export function storeOffSet(storeOffs: Record<string, string[]>, storeId: number | null): Set<string> {
  return new Set(storeId != null ? storeOffs[String(storeId)] || [] : []);
}

/**
 * Nhóm tuỳ chọn áp cho 1 món (giống website): chỉ giữ option món đó có, giá phụ thu theo món,
 * option hết ở cửa hàng đang chọn thì đánh dấu hết.
 */
export function productGroups(item: Product, groups: VariantGroup[], off: Set<string>): VariantGroup[] {
  const isOff = (g: VariantGroup, id: string) => off.has(`${g.key}|${id}`);
  const variants = Array.isArray(item.variants) ? {} : item.variants || {};
  if (Object.keys(variants).length === 0) {
    return groups.map((g) => ({ ...g, options: g.options.map((o) => ({ ...o, available: o.available && !isOff(g, o.id) })) }));
  }
  return groups
    .map((g) => {
      const own = variants[g.key];
      if (!own) return null;
      const options = g.options
        .filter((o) => own[o.id] !== undefined)
        .map((o) => ({ ...o, extra: own[o.id].extra, available: own[o.id].available && !isOff(g, o.id), def: false }));
      if (!options.length) return null;
      const avail = options.filter((o) => o.available);
      const defId = g.options.find((o) => o.def)?.id;
      if (defId && options.some((o) => o.id === defId)) options.forEach((o) => (o.def = o.id === defId));
      else if (g.required && avail.length) options.forEach((o) => (o.def = o.id === avail[0].id));
      return { ...g, options };
    })
    .filter(Boolean) as VariantGroup[];
}

export function defaultSelections(groups: VariantGroup[]): Selections {
  const sel: Selections = {};
  groups.forEach((g) => {
    if (g.type === "addon") sel[g.key] = [];
    else {
      const avail = g.options.filter((o) => o.available !== false);
      const def = avail.find((o) => o.def) || avail[0];
      sel[g.key] = def ? def.id : null;
    }
  });
  return sel;
}

/** Phụ thu size + topping (đường/đá không tính tiền). */
export function extraOf(groups: VariantGroup[], sel: Selections): number {
  let extra = 0;
  groups.forEach((g) => {
    const v = sel[g.key];
    if (g.type === "size" && typeof v === "string") extra += g.options.find((o) => o.id === v)?.extra || 0;
    if (g.type === "addon" && Array.isArray(v)) v.forEach((id) => (extra += g.options.find((o) => o.id === id)?.extra || 0));
  });
  return extra;
}

export function lineKey(id: string, sel: Selections | null): string {
  if (!sel) return id;
  const parts = Object.entries(sel)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Array.isArray(v) ? [...v].sort().join(",") : v ?? "-"}`)
    .join("|");
  return `${id}|${parts}`;
}

/** Mô tả lựa chọn: "Size L · Thạch phô mai x2 · 50% đường". */
export function optsText(line: Pick<CartLine, "selections">, groups: VariantGroup[]): string {
  if (!line.selections) return "";
  const parts: string[] = [];
  groups.forEach((g) => {
    const v = line.selections![g.key];
    if (v == null) return;
    if (Array.isArray(v)) {
      if (!v.length) return;
      const counts: Record<string, number> = {};
      v.forEach((id) => (counts[id] = (counts[id] || 0) + 1));
      parts.push(Object.entries(counts).map(([id, n]) => (n > 1 ? `${id} x${n}` : id)).join(", "));
    } else {
      const label = g.options.find((o) => o.id === v)?.label || v;
      parts.push(g.type === "level" ? `${label} ${g.label.toLowerCase()}` : label);
    }
  });
  return parts.join(" · ");
}
