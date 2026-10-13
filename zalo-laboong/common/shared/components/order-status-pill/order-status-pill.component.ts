import {CommonModule} from '@angular/common';
import {Component, Input, OnChanges} from '@angular/core';
import {ORDER_TRACKING_STATUS, UiStatus} from '../../models/feature-specific/tracking-order/tracking-order.model';

const UI_LABEL: Record<UiStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  AWAIT_CONFIRM: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELED: 'Đã huỷ',
};

@Component({
  selector: 'app-order-status-pill',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host {
      display: inline-block;
    }

    .pill {
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 999px;
      font-weight: 600;
      display: inline-flex;
      align-items: center
    }

    .pending {
      background: #fff4e5;
      color: #b07a2d;
    }

    .await {
      background: #eef3ff;
      color: #2d58b0;
    }

    .processing {
      background: #f5efff;
      color: #6b47b0;
    }

    .shipping {
      background: #e9fbf1;
      color: #1a8f55;
    }

    .delivered {
      background: #e6fff5;
      color: #128f67;
    }

    .canceled {
      background: #ffefef;
      color: #b02d2d;
    }
  `],
  template: `
    @if (ui) {
      <span class="pill"
            [class.pending]="ui==='PENDING_PAYMENT'"
            [class.await]="ui==='AWAIT_CONFIRM'"
            [class.processing]="ui==='PROCESSING'"
            [class.shipping]="ui==='SHIPPING'"
            [class.delivered]="ui==='DELIVERED'"
            [class.canceled]="ui==='CANCELED'">
        {{ UI_LABEL[ui] }}
      </span>
    }
  `
})
export class OrderStatusPillComponent implements OnChanges {
  @Input({required: true}) statusCode!: number;
  ui: UiStatus | null = null;
  readonly UI_LABEL = UI_LABEL;

  ngOnChanges(): void {
    this.ui = this.codeToUiStatus(Number(this.statusCode));
  }

  private codeToUiStatus(code: number): UiStatus | null {
    if ((ORDER_TRACKING_STATUS.PENDING_PAYMENT as readonly number[]).includes(code)) return 'PENDING_PAYMENT';
    if ((ORDER_TRACKING_STATUS.AWAIT_CONFIRM as readonly number[]).includes(code)) return 'AWAIT_CONFIRM';
    if ((ORDER_TRACKING_STATUS.PROCESSING as readonly number[]).includes(code)) return 'PROCESSING';
    if ((ORDER_TRACKING_STATUS.SHIPPING as readonly number[]).includes(code)) return 'SHIPPING';
    if ((ORDER_TRACKING_STATUS.DELIVERED as readonly number[]).includes(code)) return 'DELIVERED';
    if ((ORDER_TRACKING_STATUS.CANCELED as readonly number[]).includes(code)) return 'CANCELED';
    return null;
  }
}
