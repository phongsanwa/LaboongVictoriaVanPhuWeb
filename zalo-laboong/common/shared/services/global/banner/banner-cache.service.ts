import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map, shareReplay} from 'rxjs/operators';
import {BannerApiService} from '@shared/services/api';
import {BannerCode, IResBanner} from '@shared/models/api';

@Injectable({
  providedIn: 'root',
})

export class BannerCacheService {
  private banner$?: Observable<IResBanner[]>;
  private bannerCacheMap = new Map<string, Observable<IResBanner[]>>();
  constructor(
    private bannerService: BannerApiService
  ) {
  }

  getBannerMainOnce(params: { positionCode?: BannerCode }): Observable<IResBanner[]> {
    const key = `${params.positionCode ?? 'all'}`;
    if (!this.bannerCacheMap.has(key)) {
      const banner$ = this.bannerService.searchBanner(params).pipe(
        map(res => res.data ?? []),
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.bannerCacheMap.set(key, banner$);
    }
    return this.bannerCacheMap.get(key)!;
  }

}
