import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError, getToken, setToken } from "../lib/api";
import { inZalo, zaloAccessToken, zaloPhoneToken, zaloProfile } from "../lib/zalo";
import type { User } from "../types";

interface AuthCtx {
  user: User | null;
  ready: boolean;
  loggingIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

// Bản chạy thử (npm run dev): mở kèm ?dev_token=<API token> để đăng nhập khi không ở trong Zalo.
if (import.meta.env.DEV) {
  const t = new URLSearchParams(window.location.search).get("dev_token");
  if (t) setToken(t);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); return; }
    try {
      const { user } = await api<{ user: User }>("/me");
      setUser(user);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { setToken(null); setUser(null); }
    }
  }, []);

  useEffect(() => { refresh().finally(() => setReady(true)); }, [refresh]);

  /**
   * Đăng nhập bằng Zalo: access token → server nhận diện theo Zalo ID.
   * Lần đầu server cần số điện thoại (need_phone) → mới xin quyền SĐT rồi gửi lại.
   */
  const login = useCallback(async () => {
    if (!inZalo()) throw new Error("Hãy mở mini app trong ứng dụng Zalo để đăng nhập.");
    setLoggingIn(true);
    try {
      const accessToken = await zaloAccessToken();
      const profile = await zaloProfile();
      const send = (phone_token?: string) =>
        api<{ token: string; user: User }>("/auth/zalo", { body: { access_token: accessToken, phone_token, name: profile.name }, auth: false });
      let res;
      try {
        res = await send();
      } catch (e) {
        if (!(e instanceof ApiError && e.data?.need_phone)) throw e;
        let phoneToken: string | undefined;
        try { phoneToken = await zaloPhoneToken(); } catch { /* từ chối */ }
        if (!phoneToken) throw new Error("Cần cho phép chia sẻ số điện thoại để tạo tài khoản thành viên.");
        res = await send(phoneToken);
      }
      setToken(res.token);
      setUser(res.user);
    } finally {
      setLoggingIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* bỏ qua */ }
    setToken(null);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, ready, loggingIn, login, logout, refresh, setUser }}>{children}</Ctx.Provider>;
}
