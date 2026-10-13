import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, map, switchMap, tap } from 'rxjs/operators';
import { PromotionApiService } from '../../api';
import {
  IPromotionEvaluateData,
  IPromotionEvaluateItem,
  IPromotionEvaluateParams,
} from '@shared/models/api';

@Injectable({ providedIn: 'root' })
export class PromotionEvaluateService {
  private resultSub = new BehaviorSubject<IPromotionEvaluateData | null>(null);
  readonly result$ = this.resultSub.asObservable();

  private loadingSub = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSub.asObservable();

  private evaluateTrigger$ = new Subject<IPromotionEvaluateParams>();

  readonly debouncedResult$: Observable<IPromotionEvaluateData | null>;

  constructor(private promotionApi: PromotionApiService) {
    this.debouncedResult$ = this.evaluateTrigger$.pipe(
      debounceTime(400),
      tap(() => this.loadingSub.next(true)),
      switchMap(params => this.callApi(params)),
      tap(() => this.loadingSub.next(false)),
    );
  }

  evaluate(items: IPromotionEvaluateItem[], couponCode?: string, customerMobile?: string): void {
    if (!items.length) {
      this.clear();
      return;
    }
    this.evaluateTrigger$.next({ items, couponCode, customerMobile });
  }

  evaluateImmediate$(
    items: IPromotionEvaluateItem[],
    couponCode?: string,
    customerMobile?: string,
  ): Observable<IPromotionEvaluateData | null> {
    if (!items.length) {
      this.clear();
      return of(null);
    }
    this.loadingSub.next(true);
    return this.callApi({ items, couponCode, customerMobile }).pipe(
      tap(() => this.loadingSub.next(false)),
    );
  }

  clear(): void {
    this.resultSub.next(null);
  }

  get snapshot(): IPromotionEvaluateData | null {
    return this.resultSub.value;
  }

  get totalDiscount(): number {
    return this.resultSub.value?.discount?.totalDiscountAmount ?? 0;
  }

  private callApi(params: IPromotionEvaluateParams): Observable<IPromotionEvaluateData | null> {
    return this.promotionApi.evaluate(params).pipe(
      map(res => {
        if (res.code === 1 && res.data) {
          this.resultSub.next(res.data);
          return res.data;
        }
        this.resultSub.next(null);
        return null;
      }),
      catchError(() => {
        this.resultSub.next(null);
        return of(null);
      }),
    );
  }
}
