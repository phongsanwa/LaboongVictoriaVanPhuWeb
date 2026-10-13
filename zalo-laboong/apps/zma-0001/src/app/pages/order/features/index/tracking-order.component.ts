import {Component, OnDestroy, OnInit, inject} from '@angular/core';
import {takeUntil, switchMap, map, tap, distinctUntilChanged} from 'rxjs/operators';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {NavTabItem} from '@shared/components/app-nav-tabs/app-nav-tab.component';
import {catchError, finalize, of} from 'rxjs';
import {uriFeConst} from '@shared/constants';
import {IResOrderTracking, ITrackingOrderParams} from '@shared/models/api';
import {OrderApiService} from '@shared/services/api/order/order-api.service';
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
  expandedOrderIds: Record<number, boolean> = {};

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
          this.activeTab = (typeof statusCode === 'number' && UI_CODE_TO_KEY[statusCode]) ? UI_CODE_TO_KEY[statusCode] : 'ALL';
        }),
        tap(() => this.spinner.show()),
        switchMap((statusCode) => {
          const params: ITrackingOrderParams = {
            mobile: (this.appService.getUserInfo && this.appService.getUserInfo.phoneNumber) ? this.appService.getUserInfo.phoneNumber : ''
          };
          if (typeof statusCode === 'number') params.status = statusCode;

          return this.orderApi.getTrackingOrder(params).pipe(
            catchError(() => of({ code: 0, data: { items: [] } } as any)),
            finalize(() => this.spinner.hide())
          );
        }),
        tap((res) => {
          const data = res?.data as any;
          this.ordersTracking = (Array.isArray(data?.items) ? data.items : Array.isArray(data?.result) ? data.result : Array.isArray(data) ? data : []);
        }),
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

  getShowProducts(order: IResOrderTracking) {
    const products = order?.products || [];
    if (this.expandedOrderIds[order.id]) return products;
    return products.slice(0, 1);
  }

  getRemainingProducts(order: IResOrderTracking) {
    const total = order?.products?.length || 0;
    if (this.expandedOrderIds[order.id]) return 0;
    return Math.max(total - 1, 0);
  }

  toggleProducts(orderId: number) {
    this.expandedOrderIds[orderId] = !this.expandedOrderIds[orderId];
  }

  getProductTotal(product: any) {
    const quantity = Number(product?.quantity || 0);
    const priceAfterDiscount = Number(product?.prices?.priceAfterDiscount || 0);
    const price = Number(product?.prices?.price || 0);
    const unit = priceAfterDiscount > 0 ? priceAfterDiscount : price;
    return unit * quantity;
  }

  protected readonly uriFeConst = uriFeConst;
}
