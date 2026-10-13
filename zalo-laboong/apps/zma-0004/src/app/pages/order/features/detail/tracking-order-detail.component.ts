import {Component, OnDestroy, OnInit} from '@angular/core';
import {takeUntil} from 'rxjs';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {IResOrderTracking} from '@shared/models/api';
import {OrderApiService} from '@shared/services/api/order/order-api.service';
import {
  labelsFromUiKey,
  resolveUiKey,
  stepFromUiKey
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

  constructor(
    private orderApi: OrderApiService
  ) {
    super();
  }

  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Đợi thanh toán'});
    this.setFooter({variant: 'tabs', show: false});
    const params = {
      id: this.navService.getParam('id')
    }

    this.orderApi.getTrackingOrderDetail(params)
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: res => {
          if(!res.code) return;

          this.orderData = res.data;
          this.updateTracker({status: this.orderData.status});
        }
      })
  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  copyOrderCode(code: string) {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      this.notifyService.success('Đã sao chép mã đơn hàng');
    });
  }



  updateTracker(orderData: { status: number | string }) {
    const uiKey = resolveUiKey(orderData.status);
    this.step = stepFromUiKey(uiKey);
    this.labels = labelsFromUiKey(uiKey);
    this.isCanceled = (uiKey === 'CANCELED');
  }
}
