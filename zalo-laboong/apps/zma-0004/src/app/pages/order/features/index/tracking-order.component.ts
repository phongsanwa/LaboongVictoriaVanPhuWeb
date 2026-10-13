import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {NavTabItem} from '@shared/components/app-nav-tabs/app-nav-tab.component';
import {distinctUntilChanged, map, switchMap, takeUntil, tap} from 'rxjs/operators';
import {catchError, of} from 'rxjs';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {uriFeConst} from '@shared/constants';
import {OrderApiService} from '@shared/services/api/order/order-api.service';
import {IResOrderTracking, ITrackingOrderParams} from '@shared/models/api';
import {
  isTabKey,
  KEY_TO_UI_CODE,
  TabKey,
  UI_CODE_TO_KEY
} from '@shared/models/feature-specific/tracking-order/tracking-order.model';

@Component({
  selector: 'app-order-tracking',
  templateUrl: './tracking-order.component.html',
  styleUrls: ['./tracking-order.component.scss'],
  standalone: false
})


export class TrackingOrderComponent extends AppCommonComponent implements OnInit, OnDestroy {
  tabs: NavTabItem[] = [];
  activeTab: TabKey = 'ALL';
  ordersTracking: IResOrderTracking[] = [];

  private readonly orderApi = inject(OrderApiService);

  ngOnInit(): void {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Lịch sử đơn hàng'});
    this.setFooter({variant: 'tabs', show: false});

    this.tabs = [
      {key: 'ALL', label: 'Tất cả'},
      {key: 'PENDING_PAYMENT', label: 'Chờ thanh toán'},
      {key: 'AWAIT_CONFIRM', label: 'Chờ xác nhận'},
      {key: 'PROCESSING', label: 'Đang xử lý'},
      {key: 'SHIPPING', label: 'Đang giao'},
      {key: 'DELIVERED', label: 'Đã giao'},
      {key: 'CANCELED', label: 'Đã huỷ'},
    ];

    this.navService.subQueryParams()
      .pipe(
        takeUntil(this.destroyed),
        map((params) => {
          const n = Number(params?.['status']);
          return Number.isFinite(n) ? n : undefined;
        }),
        distinctUntilChanged(),
        tap((statusCode) => {
          this.activeTab =
            (typeof statusCode === 'number' && UI_CODE_TO_KEY[statusCode])
              ? UI_CODE_TO_KEY[statusCode]
              : 'ALL';
        }),

        switchMap((statusCode) => {
          const params: ITrackingOrderParams = {
            mobile: (this.appService.getUserInfo && this.appService.getUserInfo.phoneNumber)
              ? this.appService.getUserInfo.phoneNumber
              : ''
          };
          if (typeof statusCode === 'number') params.status = statusCode;
          return this.orderApi.getTrackingOrder(params)
            .pipe(
              catchError(() => of({code: 0, data: {result: []}} as any))
            );
        }),

        tap((res) => {
          this.ordersTracking = res.data.result ?? [];
        })
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.getDestroySubs();
  }

  onActiveChange(next: string) {
    const key: TabKey = isTabKey(next) ? next : 'ALL';
    this.activeTab = key;

    if (key === 'ALL') {
      this.navService.addParams({status: null});
    } else {
      this.navService.addParams({status: KEY_TO_UI_CODE[key]});
    }
  }

  protected readonly length = length;
  protected readonly uriFeConst = uriFeConst;
}
