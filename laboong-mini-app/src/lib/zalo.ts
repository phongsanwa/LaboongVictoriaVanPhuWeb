import {
  authorize, followOA, getAccessToken, getPhoneNumber, getUserInfo,
  openChat, openPhone, openShareSheet, openWebview,
} from "zmp-sdk/apis";
import { OA_ID, BRAND } from "../config";

/** Đang chạy trong app Zalo (các API zmp-sdk chỉ hoạt động ở đây). */
export function inZalo(): boolean {
  const ua = navigator.userAgent || "";
  return /Zalo/i.test(ua) || !!(window as any).ZaloJavaScriptInterface;
}

/** Tên + ảnh đại diện Zalo (cần người dùng đồng ý scope.userInfo). */
export async function zaloProfile(): Promise<{ name?: string; avatar?: string }> {
  try {
    await authorize({ scopes: ["scope.userInfo"] });
  } catch { /* người dùng từ chối — vẫn đăng nhập được, chỉ thiếu tên */ }
  try {
    const { userInfo } = await getUserInfo({ autoRequestPermission: false } as any);
    return { name: userInfo?.name, avatar: userInfo?.avatar };
  } catch {
    return {};
  }
}

export async function zaloAccessToken(): Promise<string> {
  return getAccessToken();
}

/** Token số điện thoại — server đổi ra SĐT bằng app secret. Chỉ xin khi thật sự cần (lần đầu). */
export async function zaloPhoneToken(): Promise<string | undefined> {
  const res: any = await getPhoneNumber();
  return res?.token || undefined;
}

export async function followShopOA(): Promise<boolean> {
  try { await followOA({ id: OA_ID }); return true; } catch { return false; }
}

export async function chatWithShop(message?: string) {
  try { await openChat({ type: "oa", id: OA_ID, message }); } catch { /* ngoài Zalo */ }
}

export async function callPhone(phone: string) {
  try { await openPhone({ phoneNumber: phone.replace(/\s+/g, "") }); }
  catch { window.location.href = `tel:${phone.replace(/\s+/g, "")}`; }
}

export async function openLink(url: string) {
  try { await openWebview({ url }); } catch { window.open(url, "_blank"); }
}

export async function shareApp(thumbnail: string) {
  try {
    await openShareSheet({
      type: "zmp_deep_link",
      data: { title: BRAND.name, description: "Đặt trà sữa, tích điểm và đổi quà ngay trên Zalo", thumbnail },
    });
  } catch { /* ngoài Zalo */ }
}

export function directionsUrl(lat?: number | null, lng?: number | null, address?: string) {
  const dest = lat && lng ? `${lat},${lng}` : encodeURIComponent(address || "");
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}
