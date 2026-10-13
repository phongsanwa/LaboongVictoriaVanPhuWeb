/**
 * Hàm tính toán chia và làm tròn lên.
 *  + Hiện đang dùng nhiều ở tính huống tính số page dựa vào limit & totalItems
 * */
export function ceilDivision(dividend: number, divisor: number) {
   if (!dividend || !divisor) return 0;

   if (dividend < divisor) {
      return 1;
   }

   return Math.ceil(dividend / divisor);
}
