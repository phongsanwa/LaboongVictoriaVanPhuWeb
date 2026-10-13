import { Injectable } from '@angular/core';
import {IProductAttribute, IResponseProductList, IResProductInList} from '@shared/models/api';
import { map, shareReplay } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { IResPaginator, IResponseApi } from '@core/models';
import {CategoryApiService} from '@shared/services/api';
import {IProductByCategoryParams, IResLoadCategory} from '@shared/models/api';
import {productTotalPages} from '../../../utils';

export interface CachedProductResponse {
  paginator: IResPaginator;
  result: IResProductInList[];
  totalPages: number;
  totalItems: number;
}

@Injectable({
  providedIn: 'root',
})
export class CategoryCacheService {
  private category$?: Observable<IResLoadCategory[]>;
  private productsCache: Record<string, Observable<CachedProductResponse>> = {};
  private attributesCache: Record<string, Observable<IProductAttribute[]>> = {};

  constructor(private categoryApi: CategoryApiService) {}

  getCategories(forceReload = false): Observable<IResLoadCategory[]> {
    if (!this.category$ || forceReload) {
      this.category$ = this.categoryApi
        .searchCategory({})
        .pipe(
          map((res: IResponseApi<IResLoadCategory[]>) => this.normalizeCategories(res.data)),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }
    return this.category$;
  }

  getProducts(params: IProductByCategoryParams): Observable<CachedProductResponse> {
    const cacheKey = this.buildProductsCacheKey(params);

    if (!this.productsCache[cacheKey]) {
      this.productsCache[cacheKey] = this.categoryApi
        .getProductsByCategory(params)
        .pipe(
          map((res: IResponseProductList) => ({
            paginator: res.data?.paginator ?? {page: 1, size: 0, total: 0},
            result: res.data?.result ?? [],
            totalPages: productTotalPages(res.data),
            totalItems: res.data?.paginator?.total ?? res.data?.totalItems ?? 0,
          })),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.productsCache[cacheKey];
  }

  getAttributes(categoryId: number | string, forceReload = false): Observable<IProductAttribute[]> {
    const cacheKey = String(categoryId);

    if (!this.attributesCache[cacheKey] || forceReload) {
      this.attributesCache[cacheKey] = this.categoryApi
        .loadAttributesByCategory({categoryId})
        .pipe(
          map((res: IResponseApi<IProductAttribute[]>) => this.normalizeAttributes(res.data)),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.attributesCache[cacheKey];
  }

  private normalizeCategories(data: unknown): IResLoadCategory[] {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];

    const value = data as {
      result?: IResLoadCategory[];
      data?: IResLoadCategory[];
      items?: IResLoadCategory[];
    };

    return value.result ?? value.data ?? value.items ?? [];
  }

  private normalizeAttributes(data: unknown): IProductAttribute[] {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];

    const value = data as {
      result?: IProductAttribute[];
      data?: IProductAttribute[];
      items?: IProductAttribute[];
    };

    if (Array.isArray(value.result)) return value.result;
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.items)) return value.items;

    return Object.values(data as Record<string, unknown>).filter(this.isProductAttribute);
  }

  private isProductAttribute(value: unknown): value is IProductAttribute {
    return !!value && typeof value === 'object' && 'id' in value && 'name' in value && 'values' in value;
  }

  private buildProductsCacheKey(params: IProductByCategoryParams): string {
    const entries = Object.entries(params)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .sort(([a], [b]) => a.localeCompare(b));

    return JSON.stringify(entries);
  }
}
