import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {IResStatusTrackingOrder} from '../../models/api';
import {RouterLink} from '@angular/router';
import {ORDER_TRACKING_STATUS_UI} from '../../models/feature-specific/tracking-order/tracking-order.model';

type StatusCode = 1 | 3 | 4 | 5;
type UiKey = 'pending_payment' | 'processing' | 'shipping' | 'review';

const STATUS_UI: Record<StatusCode, { key: UiKey; label: string; icon: string; query: any }> = {
  1: {key: 'pending_payment', label: 'Chờ thanh toán', icon: 'ph-package', query: {status: ORDER_TRACKING_STATUS_UI.PENDING_PAYMENT}},
  3: {key: 'processing', label: 'Đang xử lý', icon: 'ph-seal-check', query: {status: ORDER_TRACKING_STATUS_UI.PROCESSING}},
  4: {key: 'shipping', label: 'Đang giao', icon: 'ph-truck', query: {status: ORDER_TRACKING_STATUS_UI.SHIPPING}},
  5: {key: 'review', label: 'Đã giao', icon: 'ph-star', query: {status: ORDER_TRACKING_STATUS_UI.DELIVERED}},
} as const;


@Component({
  selector: 'app-quick-order-status',
  standalone: true,
  template: `
    <div class="row row-cols-4 g-3 mt-0 px-1 text-center">
      @for (t of tiles; track t.code) {
        <div class="p-0 mt-2">
          <a [routerLink]="trackingRoute" [queryParams]="t.ui.query"
             class="d-flex flex-column align-items-center text-decoration-none link-dark order-tile">
            <div class="position-relative">
              <i class="ph-light {{ t.ui.icon }} icon-tile"></i>
              @if (t.count > 0) {
                <span class="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle">
                      {{ t.count }}
                  </span>
              }
            </div>
            <small class="text-muted text-label">{{ t.ui.label }}</small>
          </a>
        </div>
      }
    </div>
  `,
  styles: [`
    .order-tile {
      .icon-tile {
        font-size: 1.3rem;
        color: #c1c6ce;
      }

      &:hover .icon-tile {
        color: #8a8f98;
      }

      .text-label {
        font-size: 11px;
      }

      .badge {
        --badge-padding-x: 0.3rem;
        --badge-padding-y: 0.22rem;
        --badge-font-size: 0.525rem;

        padding: var(--badge-padding-y) var(--badge-padding-x);
        font-size: var(--badge-font-size);
        min-width: calc(var(--badge-padding-y) * 2 + var(--badge-font-size));
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink
  ]
})
export class QuickOrderStatusComponent {
  @Input() trackingRoute: any[] | string = ['/orders/tracking'];
  @Input() statuses: IResStatusTrackingOrder[] = [];


  get tiles() {
    const counts = new Map<StatusCode, number>();
    for (const s of this.statuses) {
      const code = Number(s?.status);
      if (code === 1 || code === 3 || code === 4 || code === 5) {
        counts.set(code as StatusCode, Number(s?.count) || 0);
      }
    }
    const order: StatusCode[] = [1, 3, 4, 5];
    return order.map(code => ({
      code,
      ui: STATUS_UI[code],
      count: counts.get(code) ?? 0,
    }));
  }
}
