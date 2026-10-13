// // Danh sách sản phẩm
// export interface ISearchProductParams {
//   limit?: number,
//   loadAttr?: boolean,
//   icpp?: number;
//   page?: number;
// }
//
// export interface IResProduct {
//   id: string;
//   parentId: string;
//   code: string;
//   name: string;
//   status: number;
//   category: IResCategory;
//   prices: IResPrices;
//   vat: number;
//   image: string;
//   images: IResImages;
//   brand: IResBrand;
//   type: number;
//   unit: string;
//   inventory: IResInventory;
//   createdDateTime: string;
//   availableColors: string[],
//   availableSizes: string[]
//   childs: IResProduct[];
//   options: any
// }
//
// export interface ISearchProductResponse {
//   totalPages: number;
//   totalItems: number;
//   page: number;
//   pageSize: number;
//   category?: any;
//   result: IResProduct[];
// }
//
// interface IResCategory {
//   id: number;
//   name: string;
// }
//
// interface IResPrices {
//   contactPrice: number;
//   price: number;
//   wholesale: number;
//   priceOld: number;
//   priceAfterDiscount: number;
//   calcDiscountPercent: number;
// }
//
// interface IResImages {
//   others: string[];
// }
//
// interface IResBrand {
//   id: number;
//   name: string;
// }
//
// interface IResInventory {
//   remain: number;
//   shipping: number;
//   damaged: number;
//   holding: number;
//   available: number;
// }
//
// // Chi tiết sản phẩm
// export interface IProductDetailParams {
//   id: number
// }
//
// export interface IResProductDetail {
//   id: string;
//   parentId: string;
//   code: string;
//   name: string;
//   status: number;
//   image: string;
//   images: string[];
//   description: string;
//   price: number;
//   priceOld: number;
//   priceAfterDiscount: number;
//   contactPrice: number;
//   availableColors: string[];
//   availableSizes: string[];
//   brandId: string;
//   categoryId: string;
//   childs: IResProductChild[];
// }
//
// export interface IResProductChild {
//   id: string;
//   code: string;
//   name: string;
//   image: string;
//   price: number;
//   priceOld: number;
//   quantityAvailable: number;
//   size: string;
//   color: string;
// }
//
// // Flash sale
// export interface IProductPromotionParams {
//   limit?: number,
//   loadAttr?: number
// }
//
// export interface IResProductPromotion {
//   product: IResProduct[],
//   promotion: IResPromotion
// }
//
// export interface IResPromotion {
//   id: string;
//   image: string;
//   name: string;
//   description: string;
//   startDate: string;
//   endDate: string;
//   banner: string;
// }
