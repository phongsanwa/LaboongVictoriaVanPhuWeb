import { ICartItem } from '@shared/models/feature-specific';
import { IPromotionCoupon } from '@shared/models/api';

export type FlowScreen = 'cart' | 'gift-picker' | 'voucher-picker';
export type ScreenTransition = 'forward' | 'back' | null;
export type GiftPickerMode = 'many' | 'single' | 'combo';

export interface ICartFlowItem extends ICartItem {
  checked: boolean;
  hasGiftEntry: boolean;
  selectedGifts: IGiftDisplayProduct[];
}

export interface IGiftDisplayProduct {
  productId: number;
  name: string;
  image: string;
  quantity: number;
  price: number;
  priceOld: number;
}

export interface IGiftDisplayChoice {
  id: string;
  ruleId: number;
  type: 'single' | 'combo';
  title?: string;
  products: IGiftDisplayProduct[];
  selected: boolean;
  disabled: boolean;
}

export interface IGiftSelectionContext {
  target: 'product' | 'bill';
  productId?: number;
}

export interface IPromotionDetailDisplay {
  subtotal: number;
  productDiscount: number;
  voucherDiscount: number;
  saving: number;
  grandTotal: number;
  promotionNames: string[];
}
