// ===============================
// TYPES ORDER
// ===============================

export const ORDER_TYPE = {
  SHIPPING: 1, // Giao hàng tận nhà
  SHOPPING: 2, // Mua tại quầy (tại cửa hàng)
  PREORDER: 3, // Đặt trước
  GIFT_EXCHANGE: 5, // Đổi quà
} as const;

export const ORDER_TYPE_LABEL: Record<(typeof ORDER_TYPE)[keyof typeof ORDER_TYPE], string> = {
  [ORDER_TYPE.SHIPPING]: 'Chuyển hàng',
  [ORDER_TYPE.SHOPPING]: 'Mua tại quầy',
  [ORDER_TYPE.PREORDER]: 'Đặt hàng trước',
  [ORDER_TYPE.GIFT_EXCHANGE]: 'Đổi quà',
};

// ===============================
// STATUSES
// ===============================
export const ORDER_STATUS = {
  PACKING: 42,
  PICKUP: 43,
  PICKINGUP: 44,
  PICKEDUP: 45,
  NEW: 54,
  CONFIRMING: 55,
  CONFIRMED: 56,
  CUSTOMER_CONFIRMING: 57,
  SHIPPING: 59,
  SUCCESS: 60,
  FAILED: 61,
  CANCELED: 63,
  ABORTED: 64,
  SOLDOUT: 68,
  RETURNING: 71,
  RETURNED: 72,
  CHANGE_DEPOT: 73,
} as const;

export const ORDER_STATUS_LABEL: Record<(typeof ORDER_STATUS)[keyof typeof ORDER_STATUS], string> = {
  [ORDER_STATUS.NEW]: 'Mới',
  [ORDER_STATUS.CONFIRMING]: 'Đang xác nhận',
  [ORDER_STATUS.CONFIRMED]: 'Đã xác nhận',
  [ORDER_STATUS.PACKING]: 'Đang đóng gói sản phẩm',
  [ORDER_STATUS.CHANGE_DEPOT]: 'Đổi kho xuất hàng',
  [ORDER_STATUS.PICKUP]: 'Chờ hãng vận chuyển lấy hàng',
  [ORDER_STATUS.PICKINGUP]: 'Hãng vận chuyển đang đi lấy hàng',
  [ORDER_STATUS.PICKEDUP]: 'Hãng vận chuyển đã nhận hàng',
  [ORDER_STATUS.SHIPPING]: 'Đang chuyển',
  [ORDER_STATUS.SUCCESS]: 'Thành công',
  [ORDER_STATUS.FAILED]: 'Thất bại',
  [ORDER_STATUS.CANCELED]: 'Khách hủy',
  [ORDER_STATUS.ABORTED]: 'Hệ thống hủy',
  [ORDER_STATUS.SOLDOUT]: 'Hết hàng',
  [ORDER_STATUS.RETURNING]: 'Đang chuyển hoàn',
  [ORDER_STATUS.RETURNED]: 'Đã chuyển hoàn',
  [ORDER_STATUS.CUSTOMER_CONFIRMING]: 'Chờ khách xác nhận',
};

// ==============================================
// Nhóm trạng thái tracking order check riêng cho UI
// Sẽ chỉ hiển thị các trạng thái sau: Chờ thanh toán, Chờ xác nhận, Đang xử lý, Đang giao, Đã giao, Đã hủy
// ==============================================
export const ORDER_TRACKING_STATUS = {
  /** Chờ thanh toán */
  PENDING_PAYMENT: [
    ORDER_STATUS.NEW,
  ],

  /** Chờ xác nhận */
  AWAIT_CONFIRM: [
    ORDER_STATUS.CONFIRMING,
    ORDER_STATUS.CUSTOMER_CONFIRMING,
  ],

  /** Đang xử lý (đã xác nhận/đang chuẩn bị/đổi kho…/đang chuyển hoàn) */
  PROCESSING: [
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.PACKING,
    ORDER_STATUS.CHANGE_DEPOT,
    ORDER_STATUS.PICKUP,
    ORDER_STATUS.PICKINGUP,
    ORDER_STATUS.PICKEDUP,
    ORDER_STATUS.RETURNING,
  ],

  /** Đang giao */
  SHIPPING: [
    ORDER_STATUS.SHIPPING,
  ],

  /** Đã giao */
  DELIVERED: [
    ORDER_STATUS.SUCCESS,
  ],

  /** Đã huỷ */
  CANCELED: [
    ORDER_STATUS.FAILED,
    ORDER_STATUS.CANCELED,
    ORDER_STATUS.ABORTED,
    ORDER_STATUS.SOLDOUT,
    ORDER_STATUS.RETURNED,
  ],
} as const;

export const ORDER_TRACKING_STATUS_UI = {
  PENDING_PAYMENT: 1,
  AWAIT_CONFIRM: 2,
  PROCESSING: 3,
  SHIPPING: 4,
  DELIVERED: 5,
  CANCELED: 6,
}

// ===============================
// Xử lý cho UI
// ===============================

export type UiStatus =
  | 'PENDING_PAYMENT'
  | 'AWAIT_CONFIRM'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELED';

export type TabKey = 'ALL' | UiStatus;

export const TAB_KEYS = [
  'ALL',
  'PENDING_PAYMENT',
  'AWAIT_CONFIRM',
  'PROCESSING',
  'SHIPPING',
  'DELIVERED',
  'CANCELED',
] as const;

export function isTabKey(v: any): v is TabKey {
  return TAB_KEYS.includes(v as any);
}

export const UI = ORDER_TRACKING_STATUS_UI;

export const UI_CODE_TO_KEY: Record<number, UiStatus> = {
  [UI.PENDING_PAYMENT]: 'PENDING_PAYMENT',
  [UI.AWAIT_CONFIRM]: 'AWAIT_CONFIRM',
  [UI.PROCESSING]: 'PROCESSING',
  [UI.SHIPPING]: 'SHIPPING',
  [UI.DELIVERED]: 'DELIVERED',
  [UI.CANCELED]: 'CANCELED',
};

export const KEY_TO_UI_CODE: Record<Exclude<TabKey, 'ALL'>, number> = {
  PENDING_PAYMENT: UI.PENDING_PAYMENT,
  AWAIT_CONFIRM: UI.AWAIT_CONFIRM,
  PROCESSING: UI.PROCESSING,
  SHIPPING: UI.SHIPPING,
  DELIVERED: UI.DELIVERED,
  CANCELED: UI.CANCELED,
};

const GROUP_SETS = {
  PENDING_PAYMENT: new Set<number>(ORDER_TRACKING_STATUS.PENDING_PAYMENT as readonly number[]),
  AWAIT_CONFIRM: new Set<number>(ORDER_TRACKING_STATUS.AWAIT_CONFIRM as readonly number[]),
  PROCESSING: new Set<number>(ORDER_TRACKING_STATUS.PROCESSING as readonly number[]),
  SHIPPING: new Set<number>(ORDER_TRACKING_STATUS.SHIPPING as readonly number[]),
  DELIVERED: new Set<number>(ORDER_TRACKING_STATUS.DELIVERED as readonly number[]),
  CANCELED: new Set<number>(ORDER_TRACKING_STATUS.CANCELED as readonly number[]),
} as const;

function normalizeCode(input: unknown): number | null {
  const n = typeof input === 'string' ? Number(input)
    : typeof input === 'number' ? input
      : NaN;
  return Number.isFinite(n) ? n : null;
}

export function resolveUiKey(code: number | string): UiStatus {
  const n = normalizeCode(code);
  if (n == null) return 'PENDING_PAYMENT';

  if (GROUP_SETS.CANCELED.has(n)) return 'CANCELED';
  if (GROUP_SETS.DELIVERED.has(n)) return 'DELIVERED';

  if (GROUP_SETS.SHIPPING.has(n)) return 'SHIPPING';
  if (GROUP_SETS.PROCESSING.has(n)) return 'PROCESSING';
  if (GROUP_SETS.AWAIT_CONFIRM.has(n)) return 'AWAIT_CONFIRM';
  if (GROUP_SETS.PENDING_PAYMENT.has(n)) return 'PENDING_PAYMENT';

  return 'PENDING_PAYMENT';
}

export function stepFromUiKey(uiKey: UiStatus): number {
  switch (uiKey) {
    case 'PENDING_PAYMENT':
    case 'AWAIT_CONFIRM':
      return 1;                       // Đã đặt hàng
    case 'PROCESSING':
      return 2;                       // Đóng gói
    case 'SHIPPING':
      return 3;                       // Vận chuyển
    case 'DELIVERED':
    case 'CANCELED':
      return 4;                       // Đã giao / Đã huỷ
    default:
      return 1;
  }
}

export function labelsFromUiKey(uiKey: UiStatus): [string, string, string, string] {
  const base: [string, string, string, string] = ['Đã đặt hàng', 'Đóng gói', 'Vận chuyển', 'Đã giao'];
  if (uiKey === 'CANCELED') base[3] = 'Đã huỷ';
  return base;
}

// ===============================
// Interface API
// ===============================

export interface ITrackingOrderParams {
  mobile: string,
  status?: number
}

export interface IResOrderTracking {
  id: string;
  customer: IResCustomer;
  shipToCityLocationId: string;
  shipToDistrictLocationId: string;
  shipToWardLocationId: string;
  shipFee: string;
  customerShipFee: string;
  createdDate: number;
  createdTime: string;
  status: number;
  description: string;
  calculateTotalMoney: number;
  estimatedPrice: number;
  moneyDiscount: number;
  paymentMethod: string;
  products: IResProductTrackingDetail[];
}

export interface IResProductTrackingDetail {
  id: number;
  code: string;
  name: string;
  otherName: string;
  status: string;
  prices: IProductLitePrices;
  image: string;
  attribute: {
    color: string,
    size: string
  };
  quantity: number;
}

export interface IProductLitePrices {
  contactPrice: number;
  price: number;
  wholesale: number;
  priceOld: number;
  priceAfterDiscount: number;
  calcDiscountPercent: number;
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
