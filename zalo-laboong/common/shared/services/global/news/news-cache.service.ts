import {Injectable} from '@angular/core';
import {map, shareReplay} from 'rxjs/operators';
import {Observable, tap} from 'rxjs';
import {NewsApiService} from '@shared/services/api';
import {IResGetCategoryNews, IResNewsDetail, IResNewsList, ISearchNewsListParam} from '@shared/models/api';
import {IParamArticleByType, IResArticleByType} from '../../../models/api';

@Injectable({
  providedIn: 'root',
})
export class NewsCategoryCacheService {
  private category$?: Observable<IResGetCategoryNews[]>;
  private newsListCache = new Map<string, Observable<IResNewsList[]>>();
  private cache = new Map<number | string, Observable<IResNewsDetail>>();
  private articleByTypeCache = new Map<string, Observable<IResArticleByType>>();
  constructor(
    private newsApi: NewsApiService
  ) {
  }

  getNewsCategoriesOnce(forceReload = false): Observable<IResGetCategoryNews[]> {
    if (!this.category$ || forceReload) {
      this.category$ = this.newsApi
        .getNewsCategory({})
        .pipe(
          map((res) => res.data ?? []),
          shareReplay({bufferSize: 1, refCount: true})
        );
    }
    return this.category$;
  }

  getNewsOnce(params: ISearchNewsListParam): Observable<IResNewsList[]> {
    const key = this.newsListCacheKey(params);
    if (!this.newsListCache.has(key)) {
      const once$ = this.newsApi.searchNewsList(params)
        .pipe(
          map(res => res.data.result ?? []),
          shareReplay({bufferSize: 1, refCount: true})
        );
      this.newsListCache.set(key, once$);
    }
    return this.newsListCache.get(key)!;
  }


  getNewsDetailOnce(id: number): Observable<IResNewsDetail> {
    const key = String(id).trim();

    if (!this.cache.has(key)) {
      const once$ = this.newsApi.getNewsDetail({ id }).pipe(
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

  getArticleByTypeOnce(
    params: IParamArticleByType
  ): Observable<IResArticleByType> {
    const key = String(params.type);
    if (!this.articleByTypeCache.has(key)) {

      const once$ = this.newsApi.loadArticleByType(params).pipe(
        map(res => {
          if (!res?.code || !res.data) {
            throw new Error('Invalid article response');
          }
          return res.data ?? [];
        }),
        tap({
          error: () => this.articleByTypeCache.delete(key)
        }),
        shareReplay(1)
      );
      this.articleByTypeCache.set(key, once$);
    }
    return this.articleByTypeCache.get(key)!;
  }


  // Gọi hàm để xóa toàn bộ cache
  clearCache(): void {
    this.category$ = undefined;
    this.newsListCache.clear();
    this.cache.clear();
    this.articleByTypeCache.clear();
  }

  private newsListCacheKey(params: ISearchNewsListParam): string {
    return [
      params.type ?? '',
      params.categoryId ?? '',
      params.status ?? '',
      params.keyword ?? '',
      params.fromDate ?? '',
      params.toDate ?? '',
      params.sort ?? '',
      params.dir ?? '',
      params.pageSize ?? '',
      params.nextLastId ?? '',
      params.reqTotalCount ?? '',
    ].join(':');
  }
}
