import {
   IProductImage,
   IProductImageThumb,
   IProductPromotionDiscount,
   IResProductChild,
   IResProductDetail,
   IResProductInList,
   ISearchProductResponse,
} from '../models/api';
import { ceilDivision } from './pagination.utils';
import { safeNumber } from './number.utils';

export function productImageThumbPath(imageThumb?: IProductImageThumb | string | null): string {
   if (!imageThumb) return '';
   if (typeof imageThumb === 'string') return imageThumb;
   return imageThumb.path || '';
}

export function productDisplayPrice(product: Pick<IResProductInList, 'price' | 'promotionDiscount'>): number {
   return product.promotionDiscount?.finalPrice ?? product.price ?? 0;
}

export function productOriginalPrice(product: Pick<IResProductInList, 'price' | 'oldPrice' | 'promotionDiscount'>): number {
   if (product.promotionDiscount) return product.promotionDiscount.originPrice;
   return product.oldPrice > product.price ? product.oldPrice : 0;
}

export function productTotalPages(data?: Partial<ISearchProductResponse> | null): number {
   const paginator = data?.paginator;
   if (paginator) return ceilDivision(Number(paginator.total || 0), Number(paginator.size || 0)) || 1;
   return Number(data?.totalPages || 1);
}

export function normalizeProductItem(product: any): IResProductInList {
   const legacyPrices = product?.prices ?? {};
   const legacyImage = product?.image ?? '';
   const rawThumb = product?.imageThumb ?? legacyImage;
   const thumbPath = productImageThumbPath(rawThumb);
   const imageThumb = normalizeImageThumb(rawThumb, thumbPath);
   const promotionDiscount = normalizePromotionDiscount(product?.promotionDiscount);
   const price = safeNumber(product?.price ?? legacyPrices.price);
   const oldPrice = safeNumber(product?.oldPrice ?? legacyPrices.priceOld);
   const discountPercent = normalizeDiscountPercent(product?.discountPercent ?? legacyPrices.calcDiscountPercent);
   const unitName = product?.unitName ?? product?.unit ?? null;
   const category = product?.category ?? null;
   const priceAfterDiscount = promotionDiscount?.finalPrice ?? safeNumber(legacyPrices.priceAfterDiscount);

   return {
      ...product,
      id: Number(product?.id ?? 0),
      name: product?.name ?? '',
      price,
      oldPrice,
      discountPercent,
      promotionDiscount,
      imageThumb,
      unitName,
      category,
      inventoryRemain: safeNumber(product?.inventoryRemain ?? product?.inventory?.available ?? product?.inventory?.remain),
      soldQuantity: safeNumber(product?.soldQuantity),
      image: thumbPath,
      unit: unitName,
      priceAfterDiscount,
      priceOld: oldPrice,
      contactPrice: safeNumber(product?.contactPrice ?? legacyPrices.contactPrice),
      categoryId: product?.categoryId ?? category?.id,
      prices: {
         contactPrice: safeNumber(legacyPrices.contactPrice ?? product?.contactPrice),
         price,
         wholesale: safeNumber(legacyPrices.wholesale),
         priceOld: oldPrice,
         priceAfterDiscount,
         calcDiscountPercent: discountPercent ?? 0,
      },
   };
}

export function normalizeProductDetail(product: any): IResProductDetail {
   const normalized = normalizeProductItem(product);
   const fallbackImage = productImageThumbPath(normalized.imageThumb);

   return {
      ...normalized,
      images: normalizeProductImages(product?.images, fallbackImage),
      content: product?.content ?? '',
      description: product?.description ?? '',
      availableColors: normalizeAvailableColors(product?.availableColors),
      availableSizes: Array.isArray(product?.availableSizes) ? product.availableSizes : [],
      childs: Array.isArray(product?.childs)
         ? product.childs.map((child: any) => normalizeProductChild(child))
         : [],
   };
}

export function normalizeProductChild(product: any): IResProductChild {
   return {
      ...normalizeProductItem(product),
      color: product?.color ?? null,
      colorCode: product?.colorCode ?? null,
      size: product?.size ?? null,
   };
}

function normalizeAvailableColors(colors: any): IResProductDetail['availableColors'] {
   if (!Array.isArray(colors)) return [];

   return colors
      .map((color: any) => {
         if (typeof color === 'string') return color.trim();
         if (!color || typeof color !== 'object') return '';

         const name = String(color.name ?? '').trim();
         const code = String(color.code ?? '').trim();
         return name ? {name, code} : '';
      })
      .filter(Boolean) as IResProductDetail['availableColors'];
}

export function normalizeProductImages(images: IProductImage[] | any, fallbackImage = ''): string[] {
   const result = Array.isArray(images)
      ? images.map(image => productImageThumbPath(image)).filter(Boolean)
      : [];
   if (!result.length && fallbackImage) return [fallbackImage];
   return result;
}

export function normalizePaginatedProducts(data: any): ISearchProductResponse {
   const rawResult = Array.isArray(data?.result) ? data.result : [];
   const size = safeNumber(data?.paginator?.size ?? data?.pageSize ?? data?.size ?? rawResult.length);
   const total = safeNumber(data?.paginator?.total ?? data?.totalItems ?? rawResult.length);
   const page = safeNumber(data?.paginator?.page ?? data?.page ?? 1) || 1;
   const paginator = {
      page,
      size: size || rawResult.length || 1,
      total,
   };

   return {
      ...data,
      paginator,
      result: rawResult.map((item: any) => normalizeProductItem(item)),
      totalPages: ceilDivision(paginator.total, paginator.size) || 1,
      totalItems: paginator.total,
      page: paginator.page,
      pageSize: paginator.size,
   };
}

function normalizeImageThumb(imageThumb: IProductImageThumb | string | null | undefined, fallbackPath: string): IProductImageThumb | null {
   if (imageThumb && typeof imageThumb === 'object') {
      return {
         id: safeNumber(imageThumb.id),
         path: imageThumb.path || '',
      };
   }
   return fallbackPath ? {id: 0, path: fallbackPath} : null;
}

function normalizePromotionDiscount(value: any): IProductPromotionDiscount | null {
   if (!value || typeof value !== 'object') return null;
   return {
      originPrice: safeNumber(value.originPrice),
      discountAmount: safeNumber(value.discountAmount),
      finalPrice: safeNumber(value.finalPrice),
   };
}

function normalizeDiscountPercent(value: any): number | null {
   if (value === null || value === undefined || value === '') return null;
   const result = safeNumber(value);
   return result > 0 ? result : null;
}
