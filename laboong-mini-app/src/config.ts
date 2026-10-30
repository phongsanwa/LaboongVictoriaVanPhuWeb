/** Cấu hình chung. Ghi đè bằng biến VITE_* trong file .env khi cần (xem .env.example). */
const env = import.meta.env;

/** Địa chỉ API của website, có /api ở cuối. */
export const API_BASE: string = (env.VITE_API_BASE || "https://laboongtoanhav3victoriavanphu.com/api").replace(/\/+$/, "");

/** Gốc website — dùng để ghép đường dẫn ảnh dạng "/storage/...". */
export const SITE_ORIGIN = API_BASE.replace(/\/api$/, "");

/** Zalo Official Account của quán. */
export const OA_ID: string = env.VITE_OA_ID || "889352807962806936";

export const BRAND = {
  name: "Laboong Victoria Văn Phú",
  short: "Laboong",
  primary: "#0F623F",
};
