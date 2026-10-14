import { SITE_ORIGIN } from "../config";

export const money = (n: number | null | undefined) => Math.round(n || 0).toLocaleString("vi-VN") + "đ";
export const num = (n: number | null | undefined) => (Math.round((n || 0) * 100) / 100).toLocaleString("vi-VN");

/** Ảnh từ server có thể là đường dẫn tương đối ("/storage/…") → ghép với tên miền website. */
export function imgUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return src;
  return SITE_ORIGIN + (src.startsWith("/") ? "" : "/") + src;
}

export function vietQrUrl(bank: { bankCode: string; accountNumber: string; accountName: string }, amount: number, info: string) {
  const q = new URLSearchParams({ amount: String(Math.round(amount)), addInfo: info, accountName: bank.accountName });
  return `https://img.vietqr.io/image/${encodeURIComponent(bank.bankCode)}-${encodeURIComponent(bank.accountNumber)}-compact2.png?${q}`;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");
