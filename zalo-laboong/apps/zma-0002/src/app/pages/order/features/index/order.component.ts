import {Component, OnDestroy, OnInit, TemplateRef, ViewChild, inject} from '@angular/core';
import {takeUntil, switchMap, map, tap, distinctUntilChanged} from 'rxjs/operators';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {NavTabItem} from '@shared/components/app-nav-tabs/app-nav-tab.component';
import {catchError, finalize, of} from 'rxjs';
import {uriFeConst} from '@shared/constants';
import {OrderApiService} from '@shared/services/api/order/order-api.service';
import {IResOrderList, ITrackingOrderParams, OrderConsts} from '@shared/models/api';
import {ModalCustomService} from '@shared/services/global';
import {
  isTabKey,
  KEY_TO_UI_CODE,
  TabKey,
  UI_CODE_TO_KEY
} from '@shared/models/feature-specific/tracking-order/tracking-order.model';

@Component({
  selector: 'app-order-tracking',
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss'],
  standalone: false
})
export class OrderComponent extends AppCommonComponent implements OnInit, OnDestroy {
  readonly tabs: NavTabItem[] = [
    {key: 'ALL', label: 'Tất cả'},
    {key: 'PENDING_PAYMENT', label: 'Chờ thanh toán'},
    {key: 'AWAIT_CONFIRM', label: 'Chờ xác nhận'},
    {key: 'PROCESSING', label: 'Đang xử lý'},
    {key: 'SHIPPING', label: 'Đang giao'},
    {key: 'DELIVERED', label: 'Đã giao'},
    {key: 'CANCELED', label: 'Đã huỷ'}
  ];

  activeTab: TabKey = 'ALL';
  ordersTracking: IResOrderList[] = [];
  pendingCancelOrderId: number | null = null;
  isCancelingOrder = false;
  @ViewChild('cancelOrderModal', {static: true}) cancelOrderModal!: TemplateRef<unknown>;

  private readonly orderApi = inject(OrderApiService);
  private readonly modalCustomService = inject(ModalCustomService);
  private readonly expandableOrderIds = new Set<number>();
  private readonly cancelableStatuses = new Set<string>([
    OrderConsts.STATUS_NEW,
    OrderConsts.STATUS_CONFIRMING,
    OrderConsts.STATUS_CONFIRMED,
    OrderConsts.STATUS_CUSTOMER_CONFIRMING
  ]);

  ngOnInit(): void {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Lịch sử đơn hàng'});
    this.setFooter({variant: 'tabs', show: true});

    this.navService.subQueryParams()
      .pipe(
        takeUntil(this.destroyed),
        map((params) => {
          const status = Number(params?.['status']);
          return Number.isFinite(status) ? status : undefined;
        }),
        distinctUntilChanged(),
        tap((statusCode) => {
          this.activeTab = typeof statusCode === 'number' && UI_CODE_TO_KEY[statusCode]
            ? UI_CODE_TO_KEY[statusCode]
            : 'ALL';
        }),
        tap(() => this.spinner.show()),
        switchMap((statusCode) => this.fetchOrders(statusCode))
      )
      .subscribe((orders) => {
        this.ordersTracking = orders;
      });
  }

  ngOnDestroy(): void {
    this.getDestroySubs();
  }

  onActiveChange(next: string): void {
    const key: TabKey = isTabKey(next) ? next : 'ALL';
    this.activeTab = key;
    this.navService.addParams({status: key === 'ALL' ? null : KEY_TO_UI_CODE[key]});
  }

  onCancelOrder(order: IResOrderList, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const orderId = Number(order.id);
    if (!Number.isFinite(orderId)) return;

    this.pendingCancelOrderId = orderId;
    this.modalCustomService.openIntro(this.cancelOrderModal, {
      centered: true,
    });
  }

  closeCancelModal(): void {
    if (this.isCancelingOrder) return;
    this.modalCustomService.dismissAll();
    this.pendingCancelOrderId = null;
  }

  confirmCancelOrder(): void {
    if (this.pendingCancelOrderId === null || this.isCancelingOrder) return;

    const orderId = this.pendingCancelOrderId;
    this.isCancelingOrder = true;

    this.orderApi.cancelOrder(orderId)
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: (res) => {
          if (!res?.code) {
            this.notifyService.warning(res?.messages?.[0] ?? 'Không thể hủy đơn hàng');
            return;
          }

          this.notifyService.success(res.messages?.[0] ?? 'Hủy đơn hàng thành công');
          this.ordersTracking = this.ordersTracking.filter((item) => Number(item.id) !== orderId);
          this.modalCustomService.dismissAll();
          this.pendingCancelOrderId = null;
        },
        error: () => {
          this.isCancelingOrder = false;
          this.notifyService.error('Có lỗi xảy ra khi hủy đơn hàng');
        },
        complete: () => {
          this.isCancelingOrder = false;
        }
      });
  }

  onToggleProducts(orderId: number, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.expandableOrderIds.has(orderId)) {
      this.expandableOrderIds.delete(orderId);
      return;
    }

    this.expandableOrderIds.add(orderId);
  }

  isExpanded(orderId: number): boolean {
    return this.expandableOrderIds.has(orderId);
  }

  canCancel(order: IResOrderList): boolean {
    return this.cancelableStatuses.has(order.status?.id);
  }

  canPay(order: IResOrderList): boolean {
    return (order.status?.name || '').toLowerCase().includes('chờ thanh toán');
  }

  getOrderProducts(order: IResOrderList): IResOrderList['products'] {
    if (order.products.length <= 1 || this.isExpanded(order.id)) {
      return order.products;
    }

    return [order.products[0]];
  }

  private fetchOrders(statusCode?: number) {
    const params: ITrackingOrderParams = {
      mobile: this.appService.getUserInfo?.phoneNumber ?? ''
    };

    if (typeof statusCode === 'number') {
      params.status = statusCode;
    }

    return this.orderApi.getTrackingOrder(params).pipe(
      map((res: any) => res?.data?.result ?? []),
      catchError(() => of([] as IResOrderList[])),
      finalize(() => this.spinner.hide())
    );
  }

  protected readonly uriFeConst = uriFeConst;
}
