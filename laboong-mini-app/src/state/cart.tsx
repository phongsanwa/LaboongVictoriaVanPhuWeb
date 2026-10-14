import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getJSON, setJSON } from "../lib/storage";
import type { CartLine } from "../types";

export type Mode = "pickup" | "ship";

interface CartCtx {
  lines: CartLine[];
  count: number;
  subtotal: number;
  storeId: number | null;
  mode: Mode;
  setStoreId: (id: number) => void;
  setMode: (m: Mode) => void;
  add: (line: CartLine) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx>(null as any);
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => getJSON("lb_cart", []));
  const [storeId, setStoreId] = useState<number | null>(() => getJSON("lb_store", null));
  const [mode, setMode] = useState<Mode>(() => getJSON("lb_mode", "pickup"));

  useEffect(() => setJSON("lb_cart", lines), [lines]);
  useEffect(() => setJSON("lb_store", storeId), [storeId]);
  useEffect(() => setJSON("lb_mode", mode), [mode]);

  const value = useMemo<CartCtx>(() => ({
    lines,
    count: lines.reduce((s, l) => s + l.qty, 0),
    subtotal: lines.reduce((s, l) => s + l.unit * l.qty, 0),
    storeId, mode, setStoreId, setMode,
    add: (line) => setLines((ls) => {
      const i = ls.findIndex((l) => l.key === line.key);
      if (i < 0) return [...ls, line];
      const next = [...ls];
      next[i] = { ...next[i], qty: Math.min(99, next[i].qty + line.qty) };
      return next;
    }),
    setQty: (key, qty) => setLines((ls) => (qty <= 0 ? ls.filter((l) => l.key !== key) : ls.map((l) => (l.key === key ? { ...l, qty: Math.min(99, qty) } : l)))),
    remove: (key) => setLines((ls) => ls.filter((l) => l.key !== key)),
    clear: () => setLines([]),
  }), [lines, storeId, mode]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
