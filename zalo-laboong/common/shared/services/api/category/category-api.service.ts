import {Injectable} from '@angular/core';
import {ApiService} from '@core/services';
import {IResDataDefault, IResponseApi} from '@core/models';
import {uriApiConst} from '@shared/constants';
import {
  ILoadCategoryParams,
  ILoadProductAttributeParams,
  IProductByCategoryParams,
  IProductAttribute,
  IResLoadCategory,
} from '@shared/models/api';
import {IResponseProductList} from '../../../models/api';
import {map} from 'rxjs/operators';
import {normalizePaginatedProducts} from '../../../utils';

@Injectable({
  providedIn: 'any',
})
export class CategoryApiService extends ApiService {
  // Danh sách danh mục
  searchCategory = (params: ILoadCategoryParams) => {
    return this.post<IResponseApi<IResLoadCategory[]>>(
      uriApiConst.product.loadCategory, params
    );
  };

  // Danh sách thuộc tính theo danh mục sản phẩm
  loadAttributesByCategory = (params: ILoadProductAttributeParams) => {
    return this.post<IResponseApi<IProductAttribute[]>>(
      uriApiConst.product.loadAttribute, params
    );
  };

  // Lấy danh sách sản phẩm theo danh mục
  getProductsByCategory = (params: IProductByCategoryParams) => {
    return this.post<IResponseProductList>(
      uriApiConst.product.productByCategory, params
    ).pipe(map(res => ({...res, data: normalizePaginatedProducts(res.data)})));
  };
}
