/**
 * Ép giá trị sang number an toàn.
 * - Dùng Number() để cast.
 * - Trả về 0 nếu kết quả là NaN, Infinity hoặc không hợp lệ.
 */
export function safeNumber(value: any): number {
   const result = Number(value);
   return Number.isFinite(result) ? result : 0;
}
