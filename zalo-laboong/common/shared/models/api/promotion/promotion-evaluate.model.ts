// ── Request ──────────────────────────────────────────────────────────────

export interface IPromotionEvaluateItem {
  productId: number;
  price: number;
  quantity: number;
  key?: string;
}

export interface IPromotionEvaluateParams {
  items: IPromotionEvaluateItem[];
  couponCode?: string;
  customerMobile?: string;
}

// ── Response ─────────────────────────────────────────────────────────────

export interface IPromotionRuleDiscount {
  discountAmount: number;
}

export interface IPromotionProductDiscount {
  discountAmount: number;
  finalPrice: number;
  promotionRuleDiscounts: Record<string, Record<string, { quantity: number; discountAmount: number }>>;
}

export interface IPromotionBillDiscount {
  discountAmount: number;
  promotionRuleDiscounts: Record<string, Record<string, IPromotionRuleDiscount>>;
}

export interface IPromotionDiscount {
  totalDiscountAmount: number;
  promotions: { id: number; name: string }[];
  bill: IPromotionBillDiscount | null;
  products: Record<string, IPromotionProductDiscount>;
}

// ── Gifts ────────────────────────────────────────────────────────────────

export interface IGiftItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
}

export interface IGiftCombo {
  comboKey: string;
  label: string | null;
  items: IGiftItem[];
}

export interface IGiftRule {
  ruleId: number;
  ruleName: string | null;
  mode: string;
  giftItems: IGiftItem[];
  giftCombos: IGiftCombo[];
}

export interface IGiftApplied {
  promotionId: number;
  promotionName: string | null;
  rules: IGiftRule[];
}

export interface IGiftBill {
  mode: string;
  applied: IGiftApplied[];
}

export interface IGiftProduct {
  productId: number;
  mode: string;
  applied: IGiftApplied[];
}

export interface IPromotionGifts {
  mode: string;
  bill: IGiftBill | null;
  products: Record<string, IGiftProduct>;
}

// ── Coupon ───────────────────────────────────────────────────────────────

export interface IPromotionCoupon {
  status: number;
  code: string | null;
  message: string | null;
  amount: number | null;
}

// ── Top-level data ───────────────────────────────────────────────────────

export interface IPromotionEvaluateData {
  discount: IPromotionDiscount;
  gifts: IPromotionGifts | null;
  coupon: IPromotionCoupon;
}
