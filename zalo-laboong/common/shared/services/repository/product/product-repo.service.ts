import {inject, Injectable} from '@angular/core';
import {Observable, tap} from 'rxjs';
import {IResProductDetail,IRelatedProductParams, IResProductInList} from '../../../models/api';
import {map, shareReplay} from 'rxjs/operators';
import {ProductApiService} from '../../api';

@Injectable({
  providedIn: 'root',
})

export class ProductRepoService {
  private cache = new Map<number | string, Observable<IResProductDetail>>();
  private relatedCache = new Map<string, Observable<IResProductInList[]>>();
  private productApi = inject(ProductApiService);

  getDetailOnce(id: number): Observable<IResProductDetail> {
    const key = String(id).trim();

    if (!this.cache.has(key)) {
      const once$ = this.productApi.getProductDetail({id}).pipe(
        map(res => {
          if (!res?.code || !res.data) throw new Error('Invalid detail response');
          return res.data;
        }),
        tap({error: () => this.cache.delete(key)}),
        shareReplay(1)
      );
      this.cache.set(key, once$);
    }
    return this.cache.get(key)!;
  }

  /**
   * Get related products (no cache)
   * Sử dụng cho upSale products hoặc products theo category
   */
  getRelatedProducts(params: IRelatedProductParams): Observable<IResProductInList[]> {
    const cacheKey = params.isUpSale
      ? `${params.id}-upsale`
      : `${params.id}-cat-${params.categoryId}`;

    if (!this.relatedCache.has(cacheKey)) {
      const once$ = this.productApi.getRelatedProducts(params).pipe(
        map(res => {
          if (!res?.code) throw new Error('Invalid related products response');
          return res.data || [];
        }),
        tap({error: () => this.relatedCache.delete(cacheKey)}),
        shareReplay(1)
      );
      this.relatedCache.set(cacheKey, once$);
    }

    return this.relatedCache.get(cacheKey)!;
  }

  refresh(id: number | string): void {
    this.cache.delete(String(id).trim());
  }

  /**
   * Refresh related products cache
   */
  refreshRelated(productId: number): void {
    const keysToDelete = Array.from(this.relatedCache.keys())
      .filter(key => key.startsWith(`${productId}-`));

    keysToDelete.forEach(key => this.relatedCache.delete(key));
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}
