import {Component, OnDestroy, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {finalize, takeUntil} from 'rxjs';
import {openChat, openWebview} from 'zmp-sdk/apis';
import {OrderApiService} from '@shared/services/api/order/order-api.service';
import {IResOrderTracking} from '@shared/models/api';
import {
  labelsFromUiKey,
  ORDER_STATUS,
  ORDER_STATUS_LABEL,
  resolveUiKey,
  stepFromUiKey,
  UiStatus
} from '@shared/models/feature-specific/tracking-order/tracking-order.model';

@Component({
  selector: 'app-tracking-order-detail',
  templateUrl: 'tracking-order-detail.component.html',
  styleUrls: ['tracking-order-detail.component.scss'],
  standalone: false
})

export class TrackingOrderDetailComponent extends AppCommonComponent implements OnInit, OnDestroy {
  orderData!: IResOrderTracking;
  step = 1;
  labels: string[] = ['Đã đặt hàng', 'Đóng gói', 'Vận chuyển', 'Đã giao'];
  isCanceled = false;
  trackingUrl = '';

  constructor(
    private orderApi: OrderApiService
  ) {
    super();
  }

  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Đợi thanh toán'});
    this.setFooter({variant: 'tabs', show: false});
    const params = {
      id: Number(this.navService.getParam('id')),
    }
    this.trackingUrl = this.navService.getParam('trackingUrl') ?? '';
    this.spinner.show();
    this.orderApi.getTrackingOrderDetail(params)
      .pipe(takeUntil(this.destroyed),
        finalize(() => this.spinner.hide()))
      .subscribe({
        next: res => {
          if (!res.code) return;

          this.orderData = res.data;
          this.updateTracker({status: this.orderData.status});
        }
      })
  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  copyOrderCode(code: string | number) {
    if (!code) return;
    navigator.clipboard?.writeText(String(code)).then(() => {
      this.notifyService.success('Đã sao chép mã đơn hàng');
    });
  }


  openSupportChat() {
    openChat({type: 'oa', id: '762755468038541624', message: 'Xin chào'});
  }

  updateTracker(orderData: { status: string }) {
    const uiKey = this.resolveOrderUiKey(orderData.status);
    this.step = stepFromUiKey(uiKey);
    this.labels = labelsFromUiKey(uiKey);
    this.isCanceled = (uiKey === 'CANCELED');
  }

  openTracking(): void {
    if (!this.trackingUrl) return;
    openWebview({
      url: this.trackingUrl,
    });
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

  get shippingAddressText(): string {
    const shipping = this.orderData?.shippingAddress;
    if (!shipping) return '';

    return [
      shipping.address,
      shipping.ward?.name,
      shipping.district?.name,
      shipping.province?.name
    ].filter(Boolean).join(', ');
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

  private isStatusLabel(status: number | string, key: keyof typeof ORDER_STATUS): boolean {
    return status === ORDER_STATUS[key] || status === ORDER_STATUS_LABEL[ORDER_STATUS[key]];
  }
}
