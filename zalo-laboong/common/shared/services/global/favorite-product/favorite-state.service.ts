import { Injectable, inject } from '@angular/core';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import {ZmaNativeStorageService, ZmpService} from '@core/services';
import {FAV_KEY, IFavoriteList} from '@shared/models/feature-specific';

@Injectable({ providedIn: 'root' })
export class FavoriteStateService {
  private storage = inject(ZmaNativeStorageService);
  private zmp = inject(ZmpService);

  private changed$ = new Subject<void>();

  notifyChanged(): void { this.changed$.next(); }

  favoriteSet$(): Observable<Set<string>> {
    const uid$ = this.zmp.getUserId$().pipe(
      catchError(() => of('guest')),
      map(uid => String(uid || 'guest'))
    );

    return combineLatest([
      uid$,
      this.changed$.pipe(startWith(void 0))
    ]).pipe(
      map(([uid]) => {
        const lists = this.storage.get<IFavoriteList[]>(FAV_KEY(uid), []);
        const ids = (lists || []).flatMap(l => (l.data || []).map(p => String(p.id)));
        return new Set(ids);
      })
    );
  }

  /** Kiểm tra 1 sản phẩm có nằm trong favorites chưa */
  has$(productId: string | number): Observable<boolean> {
    const id = String(productId);
    return this.favoriteSet$().pipe(map(set => set.has(id)));
  }
}
