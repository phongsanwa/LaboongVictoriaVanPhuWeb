import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {finalize, takeUntil} from 'rxjs';
import {OrderApiService} from '@shared/services/api/order/order-api.service';
import {IResOrderHistory, IResOrderTracking} from '@shared/models/api';
import {
  labelsFromUiKey,
  ORDER_STATUS,
  ORDER_STATUS_LABEL,
  resolveUiKey,
  stepFromUiKey,
  UiStatus
} from '@shared/models/feature-specific/tracking-order/tracking-order.model';
import {openChat} from 'zmp-sdk/apis'
import {environment} from '../../../../../environments';
import {Router} from '@angular/router';
import {uriFeConst} from '@shared/constants';

@Component({
  selector: 'app-tracking-order-detail',
  templateUrl: 'order-detail.component.html',
  styleUrls: ['order-detail.component.scss'],
  standalone: false
})
export class OrderDetailComponent extends AppCommonComponent implements OnInit, OnDestroy {

  @ViewChild('pointsRow', {static: false}) pointsRowRef!: ElementRef<HTMLElement>;

  orderData!: IResOrderTracking;
  step = 1;
  labels: string[] = ['Đã đặt hàng', 'Đóng gói', 'Vận chuyển', 'Đã giao'];
  isCanceled = false;
  isCancelingOrder = false;

  isShippingOpen = false;
  isTooltipVisible = false;
  tooltipTop = 0;

  constructor(
    private orderApi: OrderApiService,
    private router: Router,
  ) {
    super();
  }

  ngOnInit(): void {
    const fromCheckoutSuccess = !!history.state?.fromCheckoutSuccess;

    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Chi tiết đơn hàng',
      backHandler: fromCheckoutSuccess ? () => this.backToHomeAfterCheckout() : undefined,
    });
    this.setFooter({variant: 'tabs', show: false});

    this.loadOrderDetail();
  }

  private backToHomeAfterCheckout(): void {
    this.router.navigate([uriFeConst.home], {replaceUrl: true});
  }

  ngOnDestroy(): void {
    this.getDestroySubs();
  }

  updateTracker(orderData: {status: number | string}): void {
    const uiKey = this.resolveOrderUiKey(orderData.status);
    this.step = stepFromUiKey(uiKey);
    this.labels = labelsFromUiKey(uiKey);
    this.isCanceled = (uiKey === 'CANCELED');
  }

  toggleShipping(): void {
    this.isShippingOpen = !this.isShippingOpen;
  }

  togglePointsTooltip(event: MouseEvent): void {
    event.stopPropagation();

    if (this.isTooltipVisible) {
      this.closePointsTooltip();
      return;
    }

    const row = this.pointsRowRef?.nativeElement;
    if (row) {
      const card = row.closest('.card-section') as HTMLElement | null;
      if (card) {
        this.tooltipTop = row.offsetTop + row.offsetHeight + 8;
      }
    }

    this.isTooltipVisible = true;
  }

  onCancelOrder(): void {
    const orderId = Number(this.orderData?.id || this.navService.getParam('id'));
    if (!orderId || this.isCancelingOrder || !this.canCancelOrder) return;

    this.notifyService.dialogConfirmDelete({
      title: 'Huỷ đơn hàng',
      content: 'Bạn có chắc chắn muốn huỷ đơn hàng này không?',
      btnCloseName: 'Quay lại',
      btnConfirmName: 'Đồng ý',
      btnConfirmClass: 'btn-danger',
      variant: 'modern'
    })
      .pipe(takeUntil(this.destroyed))
      .subscribe((result: {confirmDelete?: boolean}) => {
        if (!result?.confirmDelete) return;
        this.cancelOrder(orderId);
      });
  }

  closePointsTooltip(): void {
    this.isTooltipVisible = false;
  }

  copyOrderCode(code: string | number): void {
    if (!code) return;

    const text = String(code);

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }

    this.notifyService.success('Đã sao chép mã đơn hàng');
  }

  openSupportChat(): void {
    openChat({type: 'oa', id: environment.OAId, message: 'Xin chào'});
  }

  get orderCompletedLabel(): string {
    const uiKey = this.resolveOrderUiKey(this.orderData?.status);

    switch (uiKey) {
      case 'CANCELED':
        return 'Thời gian huỷ đơn';

      case 'DELIVERED':
        return 'Thời gian hoàn thành đơn';

      default:
        return '';
    }
  }

  get canCancelOrder(): boolean {
    return this.isCancelableStatus(this.orderData?.status);
  }

  get shippingHistory(): IResOrderHistory[] {
    const history = Array.isArray(this.orderData?.history) ? this.orderData.history : [];
    return [...history].sort((a, b) => {
      const timeA = this.historyDateTime(a.createdDateTime)?.getTime() ?? 0;
      const timeB = this.historyDateTime(b.createdDateTime)?.getTime() ?? 0;
      return timeB - timeA;
    });
  }

  get latestShippingHistory(): IResOrderHistory | null {
    return this.shippingHistory[0] ?? null;
  }

  get shippingSummaryLabel(): string {
    const latest = this.latestShippingHistory;
    return latest?.stepName || latest?.statusAfterName || latest?.description || 'Chưa có thông tin vận chuyển';
  }

  get shippingSummaryTime(): string {
    return this.formatHistoryDateTime(this.latestShippingHistory?.createdDateTime);
  }

  get hasCarrierInfo(): boolean {
    const carrier = this.orderData?.carrier;
    return !!(carrier?.carrierName || carrier?.serviceName || carrier?.serviceCode || carrier?.serviceType);
  }

  formatTimelineDay(value: string | null | undefined): string {
    const date = this.historyDateTime(value);
    if (!date) return '';

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDay(date, today)) return 'Hôm nay';
    if (this.isSameDay(date, yesterday)) return 'Hôm qua';
    return date.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'});
  }

  formatTimelineTime(value: string | null | undefined): string {
    const date = this.historyDateTime(value);
    if (!date) return '';
    return date.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
  }

  formatHistoryDateTime(value: string | null | undefined): string {
    const date = this.historyDateTime(value);
    if (!date) return '';
    const time = date.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
    const day = date.toLocaleDateString('vi-VN');
    return `${time} · ${day}`;
  }

  historyIcon(history: IResOrderHistory, index: number): string {
    if (index === 0) return 'ph-light ph-check';

    const text = `${history.stepName || ''} ${history.description || ''} ${history.statusAfterName || ''}`.toLowerCase();
    if (text.includes('giao') || text.includes('chuyển') || text.includes('ship')) return 'ph-light ph-truck';
    if (text.includes('đóng') || text.includes('gói') || text.includes('xác nhận')) return 'ph-light ph-package';
    if (text.includes('tạo')) return 'ph-light ph-plus';
    return 'ph-light ph-clock';
  }

  private loadOrderDetail(): void {
    const id = Number(this.navService.getParam('id'));
    if (!id) return;

    this.orderApi.getTrackingOrderDetail({id})
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: res => {
          if (!res.code) {
            this.notifyService.error(res.messages || 'Không thể lấy thông tin đơn hàng');
            return;
          }

          this.orderData = res.data;
          this.updateTracker({status: this.orderData.status});
        },
        error: () => this.notifyService.error('Không thể lấy thông tin đơn hàng')
      });
  }

  private cancelOrder(orderId: number): void {
    this.isCancelingOrder = true;
    this.spinner.show();

    this.orderApi.cancelOrder(orderId)
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => {
          this.isCancelingOrder = false;
          this.spinner.hide();
        })
      )
      .subscribe({
        next: res => {
          if (!res.code) {
            this.notifyService.error(res.messages || 'Không thể huỷ đơn hàng');
            return;
          }

          this.notifyService.success(res.messages || 'Huỷ đơn hàng thành công');
          this.loadOrderDetail();
        },
        error: () => this.notifyService.error('Không thể huỷ đơn hàng')
      });
  }

  private resolveOrderUiKey(status: number | string | undefined): UiStatus {
    if (status == null) return 'PENDING_PAYMENT';

    if (this.isStatusLabel(status, 'SUCCESS')) return 'DELIVERED';

    if (
      this.isStatusLabel(status, 'FAILED') ||
      this.isStatusLabel(status, 'CANCELED') ||
      this.isStatusLabel(status, 'ABORTED') ||
      this.isStatusLabel(status, 'SOLDOUT') ||
      this.isStatusLabel(status, 'RETURNED')
    ) {
      return 'CANCELED';
    }

    return resolveUiKey(status);
  }

  private isCancelableStatus(status: number | string | undefined): boolean {
    return [
      ORDER_STATUS.NEW,
      ORDER_STATUS.CONFIRMING,
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.CUSTOMER_CONFIRMING,
      ORDER_STATUS_LABEL[ORDER_STATUS.NEW],
      ORDER_STATUS_LABEL[ORDER_STATUS.CONFIRMING],
      ORDER_STATUS_LABEL[ORDER_STATUS.CONFIRMED],
      ORDER_STATUS_LABEL[ORDER_STATUS.CUSTOMER_CONFIRMING],
    ].includes(status as any);
  }

  private isStatusLabel(status: number | string, key: keyof typeof ORDER_STATUS): boolean {
    return status === ORDER_STATUS[key] || status === ORDER_STATUS_LABEL[ORDER_STATUS[key]];
  }

  private historyDateTime(value: string | null | undefined): Date | null {
    if (!value) return null;
    const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }
}
