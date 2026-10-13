import {IResDataDefault} from '@core/models';

export type ProductEntityId = number | string;

export const PRODUCT_FEATURE = {
  HOT: 3,
  HOME: 4,
  NEW: 5,
} as const;

export type ProductFeature = typeof PRODUCT_FEATURE[keyof typeof PRODUCT_FEATURE];

// Danh sách sản phẩm
export interface ISearchProductParams {
  productId?: number,
  pageSize?: number;
  loadAttr?: boolean;
  page?: number;
  name?: string;
  categoryId?: ProductEntityId;
  brandId?: ProductEntityId;
  fromPrice?: number;
  toPrice?: number;
  sortPrice?: 'ASC' | 'DESC';
  sortName?: 'ASC' | 'DESC';
  features?: ProductFeature[];
}

export interface IProductImageThumb {
  id: number;
  path: string;
}

export interface IProductPromotionDiscount {
  originPrice: number;
  discountAmount: number;
  finalPrice: number;
}

export interface IProductCategory {
  id: ProductEntityId;
  name: string;
}

export interface IProductAvailableColor {
  name: string;
  code: string;
}

export interface ILegacyProductPrices {
  contactPrice: number;
  price: number;
  wholesale: number;
  priceOld: number;
  priceAfterDiscount: number;
  calcDiscountPercent: number;
}

export interface IResProductInList {
  id: number;
  name: string;
  price: number;
  oldPrice: number;
  discountPercent: number | null;
  promotionDiscount: IProductPromotionDiscount | null;
  imageThumb: IProductImageThumb | null;
  unitName: string | null;
  category: IProductCategory | null;
  inventoryRemain: number;
  soldQuantity: number;

  /**
   * Compatibility aliases used by older app templates.
   * They are populated in API/service normalization and should not be used for new code.
   */
  image: string;
  unit: string | null;
  prices: ILegacyProductPrices;
  priceAfterDiscount: number;
  priceOld: number;
  contactPrice: number;
  categoryId?: ProductEntityId;
  code?: string;
}

export interface IResProduct extends Partial<IResProductInList> {
  [key: string]: any;
  id: number;
  name: string;
  category: IProductCategory | null;
  image: string;
  unit?: string | null;
  prices: ILegacyProductPrices;
}

export interface ISearchProductResponse extends IResDataDefault<IResProductInList[]> {
  category?: any;
}

export interface IProductBrandParams {
  page?: number;
  icpp?: number;
  name?: string;
}

export interface IResProductBrand {
  id: ProductEntityId;
  name: string;
  imageUri: string | null;
  numberProduct: number | null;
  childs?: IResProductBrand[];
}

// Chi tiết sản phẩm
export interface IProductDetailParams {
  id: number;
}

export type IProductImage = string | IProductImageThumb;

export interface IResProductDetail extends IResProductInList {
  images: IProductImage[];
  content: string;
  description: string;
  availableColors: Array<string | IProductAvailableColor>;
  availableSizes: string[];
  childs?: IResProductChild[];
}

export interface IResProductChild extends IResProductInList {
  color?: string | null;
  colorCode?: string | null;
  size?: string | null;
}

// related product
export interface IRelatedProductParams {
  loadAttr: boolean;
  pageSize: number;
  id: number;
  isUpSale?: boolean;
  categoryId?: ProductEntityId;
  excludedIds?: number[];
}

export interface IResponseProductList {
  data: ISearchProductResponse;
}

// Flash sale
export interface IProductPromotionParams {
  pageSize?: number;
  loadAttr?: number;
}

export interface IResProductPromotion {
  product: IResProductInList[];
  promotion: IResPromotion;
}

export interface IResPromotion {
  id: string;
  image: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  banner: string;
}
