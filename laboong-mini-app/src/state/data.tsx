import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { HomeData, MenuData } from "../types";
import { useAuth } from "./auth";

interface DataCtx {
  menu: MenuData | null;
  home: HomeData | null;
  error: string | null;
  reloadMenu: () => Promise<void>;
  reloadHome: () => Promise<void>;
}

const Ctx = createContext<DataCtx>(null as any);
export const useData = () => useContext(Ctx);

/** Thực đơn + trang chủ, tải lại khi đăng nhập/đăng xuất (vì có phần riêng của khách). */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [home, setHome] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reloadMenu = useCallback(async () => {
    try { setMenu(await api<MenuData>("/menu")); setError(null); } catch (e: any) { setError(e.message); }
  }, []);
  const reloadHome = useCallback(async () => {
    try { setHome(await api<HomeData>("/home")); setError(null); } catch (e: any) { setError(e.message); }
  }, []);

  useEffect(() => {
    if (!ready) return;
    reloadMenu();
    reloadHome();
  }, [ready, user?.id, reloadMenu, reloadHome]);

  return <Ctx.Provider value={{ menu, home, error, reloadMenu, reloadHome }}>{children}</Ctx.Provider>;
}
