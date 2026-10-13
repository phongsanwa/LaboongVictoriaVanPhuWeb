import { Component, inject } from '@angular/core';
import { OffcanvasCustomService } from '@shared/services/global';
import { IResCalculateFee } from '@shared/models/api';

@Component({
  selector: 'app-carrier-offcanvas',
  standalone: false,
  template: `
    <div class="offcanvas-body p-0">
      <h5 class="text-center fw-semibold py-3 border-bottom mb-0">
        Chọn phương thức vận chuyển
      </h5>

      <div class="carrier-list">
        @for (opt of options; track opt.serviceId) {
          <div
            class="carrier-item"
            [class.active]="opt.serviceId === activeServiceId"
            (click)="selectCarrier(opt)">
            <div class="carrier-info d-flex flex-wrap">
              <p class="fw-semibold mb-1">{{ opt.serviceName }}</p>
              <p class="text-muted mb-0 small">
                {{ opt.customerShipFee | i18nCurrencyAmount:{showSymbol: true} }}
              </p>
            </div>
            <input
              type="checkbox"
              class="form-check-input"
              [checked]="opt.serviceId === activeServiceId"
              (click)="$event.stopPropagation(); selectCarrier(opt)"
            />
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .carrier-list { padding: 0 12px; max-height: 60vh; overflow-y: auto; }
    .carrier-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 4px; cursor: pointer; }
    .carrier-item.active { background-color: #f8f9fa; border-radius: 8px; }
    .carrier-info { flex: 1; padding-right: 10px; }
  `]
})
export class CarrierOffcanvasComponent {
  options: IResCalculateFee[] = [];
  activeServiceId = 0;

  private readonly offcanvasSvc = inject(OffcanvasCustomService);

  selectCarrier(opt: IResCalculateFee) {
    this.offcanvasSvc.dismissAll(opt);
  }
}
