export interface Category { key: string; label: string; ic?: string }

export interface VariantOption { id: string; label: string; extra: number; available: boolean; def: boolean }
export interface VariantGroup {
  key: string; label: string; ic?: string;
  type: "size" | "addon" | "level" | string;
  required: boolean; options: VariantOption[];
}

export interface Product {
  id: string; cat: string; name: string; desc: string;
  price: number; salePrice: number | null; promoLabel: string | null; isFlash?: boolean;
  grad: string; img: string | null; tags: string[]; available: boolean; isCombo: boolean;
  variants: Record<string, Record<string, { extra: number; available: boolean }>> | [];
}

export interface StoreLite {
  id: number; name: string; address: string; phone?: string;
  lat?: number | null; lng?: number | null; open?: string; close?: string;
}

export interface ShippingTier { id: number; label: string; min_km: number; max_km: number | null; fee: number }
export interface ShippingPromo {
  id: number; name: string; min_order_amount: number; max_km: number | null;
  discount_type: "free" | "percent" | "amount" | string; discount_value: number; badge?: string;
}
export interface OrderPromo {
  id: number; name: string; type: "percent" | "amount" | "fixed" | string; value: number;
  min_purchase: number; max_discount: number | null; valid_until: string | null; badge?: string;
}

export interface MenuData {
  cats: Category[]; menu: Product[]; variantGroups: VariantGroup[];
  storeOffs: Record<string, string[]>; storeId: number | null; stores: StoreLite[];
  shippingTiers: ShippingTier[]; shippingPromos: ShippingPromo[]; orderPromos: OrderPromo[];
  perPoint: number; weatherSurcharge: { enabled: boolean; fee: number; label: string };
  payment: { bankEnabled: boolean; bankCode: string; accountNumber: string; accountName: string };
  addresses: Address[]; customerName: string; customerPhone: string;
}

export interface Address { id: number; label: string; name?: string; text: string; lat: number | null; lng: number | null; def: boolean }

export interface User {
  id: number; name: string; phone: string; email: string | null; avatar_url: string | null;
  points: number; lifetime_points: number; tier: { id: number; name: string } | null;
  referral_code: string | null; total_orders: number; total_spent: number; dob: string | null;
}

export interface FlashSale {
  name: string; status: "live" | "upcoming"; start: string; end: string;
  items: { id: string; name: string; img: string | null; grad: string; price: number; flash_price: number; quota: number | null; sold: number }[];
}

export interface HomeData {
  member: { name: string; id: string; tier: string } | null;
  points: number; goal: number; reward: string;
  promos: { tag: string; icon: string; bg: string; title: string; sub: string | null; benefit: string | null; start: string; end: string }[];
  transactions: { type: string; title: string; meta: string; amt: number }[];
  pointsThisWeek: number;
  checkin: { streak: number; last: string | null; today: boolean };
  checkinConfig: { d: string; pts: number; bonus?: boolean }[];
  checkinEnabled: boolean;
  news: { id: number; title: string; excerpt: string; body: string; media_type: string; image_url: string | null; video_url: string | null; youtube_id: string | null; date: string | null }[];
  banners: { desktop: string; mobile: string; link: string | null; title: string | null; subtitle: string | null }[];
  flashSale: FlashSale | null;
  stores: { id: number; name: string; address: string; phone: string; latitude: number | null; longitude: number | null; opening_time: string; closing_time: string; photos: string[] }[];
}

export type Selections = Record<string, string | string[] | null>;

export interface CartLine {
  key: string; id: string; name: string; img: string | null; grad: string;
  unit: number; origUnit: number; qty: number; selections: Selections | null;
}

export interface CartVoucher {
  id: number; code: string; name: string; applies_to: "ORDER" | "SHIPPING";
  discount_type: string; discount_value: number; min_purchase: number | null; max_discount: number | null; valid_until: string | null;
}

export interface Quote {
  subtotal: number; badge_discount: number; voucher_discount: number; promo_discount: number; order_discount: number;
  shipping_fee: number; ship_discount: number; weather_surcharge: number; total: number; points_earned: number; payment_method: "cod" | "bank";
}

export interface OrderHistoryItem {
  code: string; time: string; daysAgo: number; status: "new" | "making" | "ready" | "done" | "cancel" | string;
  store: string; storeAddr: string; type: "ship" | "pickup"; addr: string | null;
  items: { id: string; name: string; opt: string; unit: number; qty: number; selections: Selections | null }[];
  sub: number; discount: number; discounts: { label: string; amount: number; ship: boolean }[];
  ship: number; total: number; points: number; paymentMethod: "cod" | "bank" | string; paymentStatus: string;
  prepEtaAt: string | null; etaAt: string | null;
}
