export type CheckoutFlowScreen = 'checkout' | 'voucher-picker';
export type ScreenTransition = 'forward' | 'back' | null;

export interface ICheckoutSummary {
  subtotal: number;
  shippingFee: number;
  productDiscount: number;
  voucherDiscount: number;
  pointDiscount: number;
  grandTotal: number;
  totalQuantity: number;
}
