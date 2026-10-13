// Thông tin vận chuyển
export interface IOrderCarrier {
  carrierId: number;
  carrierName: string;
  carrierShopId: string;
  carrierAccountId: string;
  isRequiredInsurance: number;
  serviceId: number;
  serviceName: string;
  serviceCode: string;
  serviceType?: number;
  shipFee?: number;
  codFee?: number;
  declaredFee: number;
  declaredValue?: number;
  customerShipFee: number;
  // FE-only
  id: number;
  logo: string;
  serviceDesc: string;
}

export interface IOrderGift {
  id?: number;
  productId?: number;
  productName?: string;
  quantity: number;
  price?: number;
  promotionId?: number;
  ruleId?: number;
  comboKey?: string;
}

export interface IOrderProduct {
  id: number;
  name?: string;
  quantity: number;
  price: number;
  promotionRuleDiscounts?: Record<string, Record<string, { quantity?: number; discountAmount: number }>>;
  gifts?: IOrderGift[];
  description?: string;
  weight?: number;
  attribute?: {
    size?: string | null;
    color?: string | null;
  };
  // FE-only
  productId: number;
  avatar: string;
}

export interface ISaveOrderV2ProductGift {
  productId: number;
  productName?: string;
  quantity: number;
  price?: number;
  promotionId?: number;
  ruleId?: number;
  comboKey?: string;
}

export interface ISaveOrderV2Product {
  id: number;
  name: string;
  quantity: number;
  avatar?: string;
  price: number;
  promotionRuleDiscounts?: Record<string, Record<string, { quantity?: number; discountAmount: number }>>;
  description?: string;
  weight?: number;
  attribute?: Record<string, string | number | null>;
  gifts?: ISaveOrderV2ProductGift[];
}

export interface ISaveOrderV2Params {
  info?: {
    description: string;
  };
  channel?: {
    webAppType: number;
  };
  customer: {
    name: string;
    mobile: string;
    address: string;
    email?: string;
    provinceId: number;
    districtId: number;
    wardId: number;
  };
  products: ISaveOrderV2Product[];
  carrier: {
    carrierId?: number;
    serviceId?: number | string;
    serviceCode?: string;
    serviceType?: number;
    serviceName?: string;
    carrierName?: string;
    carrierAccountId?: number | string;
    carrierShopId?: number | string;
    shipFee?: number;
    customerShipFee?: number;
    codFee?: number;
    isRequiredInsurance?: number;
    declaredFee?: number;
    declaredValue?: number;
  };
  payment: {
    paymentMethod: string;
    totalOrderAmount: number;
    couponCode?: string;
    usedPoints?: number; // Số điểm khách dùng; POS tự quy đổi tiền + validate min/max
  };
}

export interface IResCalculateFee {
  serviceCode: string;
  type: number | 'selfConnection' | null;
  hasSupport: string;
  codFee: number;
  shipFee: number;
  carrierName: string;
  serviceName: string;
  customerShipFee: number;
  contentId: string;
  weight: number | string;
  carrierId: number;
  codFeeDiscount: number;
  codFeePromotion: number;
  logo: string;
  totalCod: number;
  totalFee: number;
  serviceDescription: string;
  shipFeePromotion: number;
  serviceId: number;
  isRequiredInsurance: number | string;
  declaredFee: number;
  declaredValue: number;
  carrierShopId: string;
  carrierAccountId: number | string;
}

export interface ICalculateFeeParams {
  weight?: number, //Khối lượng đơn hàng
  totalOrderAmount: number, //Tổng giá trị sản phẩm
  totalMoney?: number, // Backward-compatible với API cũ
  products: {
    id: number;
    quantity: number;
    price: number;
  }[], // Sản phẩm trong đơn
  discount?: number, // Chiết khấu đơn hàng theo số tiền
  totalCod?: number, //Tổng tiền phải thu khách hàng
  toCityLocationId: number, //ID tỉnh/thành phố người nhận
  toDistrictLocationId?: number, //ID quận/huyện người nhận, không bắt buộc với địa chỉ 2 cấp
  toWardLocationId: number, //ID xã người nhận
  locationLevel?: number, //Địa chỉ 2 hoặc 3 cấp
  isCod?: number, // Mã phương thức thanh toán. Nếu **khác** `"1"`
  address: string,
}

export interface ICheckVoucherParams {
  voucherCode: string[],
  totalMoney: number,
  productIds: string
}

export interface IResCheckVoucher {
  code: string;
  valid: 0 | 1;                 // 1 = hợp lệ, 0 = không hợp lệ
  value?: number;               // chỉ có khi valid = 1
  useCouponPromotion?: 1;       // = 1 nếu là coupon promotion
  productPrice?: Record<string, number> | number[]; // có khi là promotion theo sp/danh mục
  totalMoney?: number;          // tổng tiền sau/cho lần áp mã
  reason?: string;              // chỉ có khi valid = 0 (message)
}

// Đăng kí hmac
export interface IPaymentHMACParams {
  totalAmount: number;
  item: PaymentItem[];
  desc: string;
  extradata: ExtraData;
  method: 'BANK_SANDBOX' | string;
}

export interface PaymentItem {
  id: string;
  price: number;
  quantity: number;
}

export interface ExtraData {
  subtotal: number;
  shippingFee: number;
}

// ===============================
// Interface API Tracking
// ===============================

export interface ITrackingOrderParams {
  mobile: string,
  status?: number
}

export interface IResOrderTracking {
  id: number
  status: string
  createdAt: number
  updatedAt: number
  description: string,
  paymentMethod: string,
  customer: {
    name: string
    mobile: string
    email: string
    address: string
  }
  shippingAddress: {
    province: {
      id: number,
      name: string
    },
    district: {
      id: number,
      name: string
    },
    "ward": {
      id: number,
      name: string
    },
    address: string
  }
  carrier?: IResOrderCarrier | null;
  totalAmount: number
  discountAmount: number
  shipFee: number
  products: IResProductTrackingDetail[];
  history?: IResOrderHistory[];
}

export interface IResOrderCarrier {
  carrierName: string | null;
  serviceName: string | null;
  serviceCode: string | null;
  serviceType: string | null;
}

export interface IResOrderHistory {
  step: number;
  stepName: string | null;
  description: string | null;
  createdDateTime: string | null;
  statusBefore: number | null;
  statusAfter: number | null;
  statusBeforeName: string | null;
  statusAfterName: string | null;
}

export interface IResProductTrackingDetail {
  id: number;
  name: string;
  avatar: string;
  quantity: number,
  weight: number,
  vat: number,
  prices: IProductLitePrices,
  description?: string,
}

export interface IProductLitePrices {
  price: number,
  discountAmount?: number,
  totalDiscountAmount?: number,
  priceAfterDiscount?: number,
  calcDiscountPercent?: number
}

export interface IResCustomer {
  name: string;
  mobile: string;
  email: string;
  address: string;
}

export interface ITrackingOrderDetailParams {
  id: number,
}

export interface IStatusTrackingOrderParams {
  mobile: string,
  act: string
}

export interface IResStatusTrackingOrder {
  status: number,
  count: number
}

export interface IResOrderList {
  id: number
  status: {
    id: string,
    name: string
  }
  createdAt: number
  updatedAt: number
  description: string,
  paymentMethod: string,
  customer: {
    name: string
    mobile: string
    email: string
    address: string
  }
  shippingAddress: {
    city: {
      cityId: number,
      cityName: string
    },
    district: {
      districtId: number,
      districtName: string
    },
    "ward": {
      wardId: number,
      wardName: string
    },
    address: string
  }
  totalAmount: number
  discountAmount: number
  shipFee: number
  products: IResProductTrackingDetail[];
}

export const OrderConsts = {
  STATUS_NEW: 'STATUS_NEW',
  STATUS_CONFIRMING: 'STATUS_CONFIRMING',
  STATUS_CONFIRMED: 'STATUS_CONFIRMED',
  STATUS_CHANGE_DEPOT: 'STATUS_CHANGE_DEPOT',
  STATUS_SHIPPING: 'STATUS_SHIPPING',
  STATUS_SUCCESS: 'STATUS_SUCCESS',
  STATUS_FAILED: 'STATUS_FAILED',
  STATUS_CANCELED: 'STATUS_CANCELED',
  STATUS_ABORTED: 'STATUS_ABORTED',
  STATUS_SOLDOUT: 'STATUS_SOLDOUT',
  STATUS_RETURNING: 'STATUS_RETURNING',
  STATUS_RETURNED: 'STATUS_RETURNED',
  STATUS_CUSTOMER_CONFIRMING: 'STATUS_CUSTOMER_CONFIRMING',
}

export const StatusesOrderConstArray = [
  OrderConsts.STATUS_NEW,
  OrderConsts.STATUS_CONFIRMING,
  OrderConsts.STATUS_CONFIRMED,
  OrderConsts.STATUS_CHANGE_DEPOT,
  OrderConsts.STATUS_SHIPPING,
  OrderConsts.STATUS_SUCCESS,
  OrderConsts.STATUS_FAILED,
  OrderConsts.STATUS_CANCELED,
  OrderConsts.STATUS_ABORTED,
  OrderConsts.STATUS_SOLDOUT,
  OrderConsts.STATUS_RETURNING,
  OrderConsts.STATUS_RETURNED,
  OrderConsts.STATUS_CUSTOMER_CONFIRMING
]

export const StatusesOrderConst: Record<string, string> = {
  [OrderConsts.STATUS_NEW]: 'Mới',
  [OrderConsts.STATUS_CONFIRMING]: 'Đang xác nhận',
  [OrderConsts.STATUS_CONFIRMED]: 'Đã xác nhận',
  [OrderConsts.STATUS_CHANGE_DEPOT]: 'Đổi kho xuất hàng',
  [OrderConsts.STATUS_SHIPPING]: 'Đang chuyển',
  [OrderConsts.STATUS_SUCCESS]: 'Thành công',
  [OrderConsts.STATUS_FAILED]: 'Thất bại',
  [OrderConsts.STATUS_CANCELED]: 'Khách hủy',
  [OrderConsts.STATUS_ABORTED]: 'Hệ thống hủy',
  [OrderConsts.STATUS_SOLDOUT]: 'Hết hàng',
  [OrderConsts.STATUS_RETURNING]: 'Đang chuyển hoàn',
  [OrderConsts.STATUS_RETURNED]: 'Đã chuyển hoàn',
  [OrderConsts.STATUS_CUSTOMER_CONFIRMING]: 'Chờ khách xác nhận'
};
