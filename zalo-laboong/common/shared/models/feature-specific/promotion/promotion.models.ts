// voucher.models.ts
export interface PromoProgram {
  id: string;
  name: string;
  banner?: string;
  primaryColor?: string;
  remainingSpins: number;
  rewards: PromoReward[];
}

export interface PromoReward {
  id: string;
  label: string;          // "20K", "Áo thun", ...
  imageUrl?: string;      // icon/ảnh hiển thị trên miếng bánh
  color?: string;         // màu miếng (optional)
  textColor?: string;     // màu chữ (optional)
  weight?: number;        // dùng để vẽ tỷ lệ lát
  meta?: any;             // thêm nếu cần
  voucherCode?: string
}

// BE trả kết quả spin (server quyết định)
export interface SpinStartResponse {
  spinId: string;
  winnerId: string;
  remainingSpins: number;
}
// BE xác nhận claim
export interface SpinConfirmResponse {
  code: 1 | 0;
  message?: string;
  rewardDetail?: any;     // mã coupon, ảnh, mô tả...
}

// Thông tin người chơi (lưu local)
export interface PlayerInfo {
  name: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
}
