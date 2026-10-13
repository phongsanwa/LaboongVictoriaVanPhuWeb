import {
  IProductPromotionParams,
  IResProductInList, IResProductPromotion,
  ISearchProductParams,
  ISearchProductResponse
} from '../../../models/api';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map, shareReplay} from 'rxjs/operators';
import {CategoryApiService, ProductApiService} from '../../api';
import {IResLoadCategory} from '../../../models/api';
import {IResDataDefault} from '../../../../core/models';
import {productTotalPages} from '../../../utils';

@Injectable({ providedIn: 'root' })
export class HomeManageService {
  private categories$?: Observable<IResLoadCategory[]>;
  private productsByKey = new Map<string, Observable<IResDataDefault<IResProductInList[]>>>();
  private productsPromotion$?: Observable<IResProductPromotion>;
  productsCache: IResProductInList[] = [];
  currentPageCache = 1;
  totalPagesCache = 1;
  scrollPositionCache = 0;

  constructor(
    private productApi: ProductApiService,
    private categoryApi: CategoryApiService
  ) {}

  getCategoriesOnce(): Observable<IResLoadCategory[]> {
    if (!this.categories$) {
      this.categories$ = this.categoryApi.searchCategory({})
        .pipe(
          map(res => this.normalizeCategories(res.data)),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }
    return this.categories$;
  }

  getProductsOnce(params: ISearchProductParams): Observable<IResDataDefault<IResProductInList[]>> {
    const key = this.productCacheKey(params);
    if (!this.productsByKey.has(key)) {
      const request$ = this.productApi.searchProduct(params)
        .pipe(
          map(res => res.data),
          shareReplay({ bufferSize: 1, refCount: true })
        );
      this.productsByKey.set(key, request$);
    }
    return this.productsByKey.get(key)!;
  }

  getProductPromotionOnce(params: IProductPromotionParams): Observable<IResProductPromotion> {
    if (!this.productsPromotion$) {
      this.productsPromotion$ = this.productApi.searchFlashSale(params)
        .pipe(
          map(res => res.data ?? []),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }
    return this.productsPromotion$;
  }

  //product cache khi có phân trang
  getProductsOncePaginator(params: ISearchProductParams): Observable<ISearchProductResponse> {
    return this.productApi.searchProductPaginator(params).pipe(
      map(res => {
        const data = res.data;
        if (params.page && params.page > 1) {
          const newItems = data.result.filter(
            np => !this.productsCache.some(p => p.id === np.id)
          );
          this.productsCache = [...this.productsCache, ...newItems];
        } else {
          this.productsCache = data.result;
        }
        this.currentPageCache = data.paginator?.page ?? params.page ?? 1;
        this.totalPagesCache = productTotalPages(data);
        return data;
      })
    );
  }

  refresh() {
    this.categories$ = undefined;
    this.productsByKey.clear();
  }

  private productCacheKey(params: ISearchProductParams): string {
    const normalized = {
      ...params,
      features: Array.isArray(params.features) ? [...params.features].sort() : undefined,
    };
    return JSON.stringify(normalized);
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
}
