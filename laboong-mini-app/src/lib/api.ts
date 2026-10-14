import { API_BASE } from "../config";
import { getItem, removeItem, setItem } from "./storage";

const TOKEN_KEY = "lb_api_token";

export function getToken(): string | null { return getItem(TOKEN_KEY); }
export function setToken(token: string | null) { token ? setItem(TOKEN_KEY, token) : removeItem(TOKEN_KEY); }

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/** Gọi API website. Tự gắn Bearer token; lỗi trả về ApiError với thông báo tiếng Việt từ server. */
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token && opts.auth !== false) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ. Kiểm tra mạng và thử lại.", 0, null);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const first = data?.errors ? (Object.values(data.errors).flat()[0] as string) : null;
    throw new ApiError(first || data?.message || "Có lỗi xảy ra, vui lòng thử lại.", res.status, data);
  }
  return data as T;
}
