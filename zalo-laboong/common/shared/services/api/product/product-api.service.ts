import {Injectable} from '@angular/core';
import {ApiService} from '@core/services';
import {
  IProductBrandParams,
  IProductDetailParams,
  IProductPromotionParams,
  IRelatedProductParams,
  IResProductBrand,
  IResProductDetail, IResProductPromotion,
  ISearchProductParams,
  ISearchProductResponse
} from '@shared/models/api';
import {IResDataDefault, IResponseApi} from '@core/models';
import {uriApiConst} from '../../../constants';
import {IResProductInList} from '../../../models/api';
import {map} from 'rxjs/operators';
import {normalizePaginatedProducts, normalizeProductDetail, normalizeProductItem} from '../../../utils';

@Injectable({
  providedIn: 'any',
})
export class ProductApiService extends ApiService {
  // Danh sách sản phẩm không có phân trang
  searchProduct = (params: ISearchProductParams) => {
    return this.post<IResponseApi<IResDataDefault<IResProductInList[]>>>(uriApiConst.product.loadProduct, params)
      .pipe(map(res => ({...res, data: normalizePaginatedProducts(res.data)})));
  }

  // Danh sách sản phẩm có phân trang
  searchProductPaginator = (params: ISearchProductParams) => {
    return this.post<IResponseApi<ISearchProductResponse>>(uriApiConst.product.loadProduct, params)
      .pipe(map(res => ({...res, data: normalizePaginatedProducts(res.data)})));
  }

  searchProductRelated = (params: ISearchProductParams) => {
    return this.post<IResponseApi<ISearchProductResponse>>(uriApiConst.product.relatedProduct, params)
      .pipe(map(res => ({...res, data: normalizePaginatedProducts(res.data)})));
  }

  // Chi tiết sản phẩm
  getProductDetail = (params: IProductDetailParams) => {
    return this.post<IResponseApi<IResProductDetail>>(uriApiConst.product.productView, params)
      .pipe(map(res => ({...res, data: res.data ? normalizeProductDetail(res.data) : res.data})));
  }
  // Sản phẩm liên quan
  getRelatedProducts = (params: IRelatedProductParams) => {
    return this.post<IResponseApi<IResProductInList[]>>(uriApiConst.product.relatedProduct, params)
      .pipe(map(res => ({
        ...res,
        data: Array.isArray(res.data) ? res.data.map(item => normalizeProductItem(item)) : []
      })));
  }
  searchFlashSale = (params: IProductPromotionParams) => {
    return this.post<IResponseApi<IResProductPromotion>>(uriApiConst.product.promotion, params)
      .pipe(map(res => ({
        ...res,
        data: {
          ...res.data,
          product: Array.isArray(res.data?.product)
            ? res.data.product.map(item => normalizeProductItem(item))
            : []
        }
      })));
  }

  // tìm kiếm sản phẩm
  search = (params: ISearchProductParams = {}) => {
    return this.post<IResponseApi<IResDataDefault<IResProductInList[]>>>(
      uriApiConst.search.searchProduct, params
    ).pipe(map(res => ({...res, data: normalizePaginatedProducts(res.data)})));
  };

  // Danh sách thương hiệu sản phẩm
  loadBrands = (params: IProductBrandParams = {}) => {
    return this.post<IResponseApi<IResDataDefault<IResProductBrand[]>>>(
      uriApiConst.product.loadBrand, params
    );
  };

  //Gợi ý sản phẩm
  suggestionSearchProduct = (params: ISearchProductParams) => {
    return this.post<IResponseApi<IResProductInList[]>>(uriApiConst.search.suggestion, params)
      .pipe(map(res => ({
        ...res,
        data: Array.isArray(res.data) ? res.data.map(item => normalizeProductItem(item)) : []
      })));
  }
}
