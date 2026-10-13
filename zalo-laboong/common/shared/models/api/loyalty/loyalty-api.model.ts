export interface ILoyaltyMe {
  hasLinkedCustomer: boolean;
  points: number;
  pointValueRate?: number;
  levelId: number | null;
  levelName: string | null;
  totalMoney: number;
  totalBills: number;
}

export interface ILoyaltyTier {
  levelId: number;
  levelName: string;
  threshold: number;
  ruleType?: number;
  benefits: string[];
  sortOrder: number;
}

export interface ILoyaltyTiersRes {
  tiers: ILoyaltyTier[];
  metric: 'totalMoney' | string;
}

export interface IPointSettings {
  settingMinPoint: number; // điểm tối thiểu được tiêu
  settingMaxPoint: number; // điểm tối đa được tiêu (0 = không giới hạn)
  pointDefault: number;    // số điểm gốc để quy đổi
  moneyDefault: number;    // số tiền tương ứng pointDefault điểm
  pointValueRate: number;  // round(moneyDefault / pointDefault) — VND/điểm
}

export interface IPointHistoryItem {
  id: string;
  type: 'earn_purchase' | 'redeem_order' | 'gift' | 'deduct' | 'other' | string;
  title: string;
  points: number;       // có dấu: + cộng, - trừ
  orderId: number | null;
  createdAt: number;    // unix timestamp (giây)
}

export interface IPointHistoryRes {
  hasLinkedCustomer: boolean;
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
  items: IPointHistoryItem[];
}
