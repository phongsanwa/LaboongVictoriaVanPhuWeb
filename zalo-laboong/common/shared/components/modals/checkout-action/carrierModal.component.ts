import { Component, ElementRef, inject } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
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
            [class.is-closing]="isClosing"
            (click)="selectCarrier(opt)">
            <div class="carrier-info">
              <p class="fw-semibold mb-1">{{ opt.serviceName }}</p>
              <p class="text-muted mb-0 small">
                {{ opt.customerShipFee | i18nCurrencyAmount:{showSymbol: true} }}
              </p>
            </div>
            <input
              type="checkbox"
              class="form-check-input carrier-check"
              [checked]="opt.serviceId === activeServiceId"
              (click)="selectFromCheckbox($event, opt)"
            />
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .carrier-list { padding: 0 12px; max-height: 60vh; overflow-y: auto; }
    .carrier-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 4px; cursor: pointer; transition: background-color 120ms ease; }
    .carrier-item.active { background-color: #f8f9fa; border-radius: 8px; }
    .carrier-item.is-closing { pointer-events: none; }
    .carrier-info { flex: 1; padding-right: 10px; }
    .carrier-check:focus {
      border-color: #dee2e6;
      box-shadow: none;
    }
  `]
})
export class CarrierOffcanvasComponent {
  options: IResCalculateFee[] = [];
  activeServiceId = 0;
  isClosing = false;

  private readonly closeAnimationMs = 260;
  private readonly activeOffcanvas = inject(NgbActiveOffcanvas);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  selectCarrier(opt: IResCalculateFee) {
    if (this.isClosing) return;

    this.activeServiceId = opt.serviceId;
    this.isClosing = true;
    this.slidePanelDown();
    setTimeout(() => this.activeOffcanvas.close(opt), this.closeAnimationMs);
  }

  selectFromCheckbox(event: MouseEvent, opt: IResCalculateFee): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectCarrier(opt);
  }

  private slidePanelDown(): void {
    const panel = this.elementRef.nativeElement.closest('.offcanvas') as HTMLElement | null;
    if (!panel) return;

    panel.classList.add('carrier-sheet-closing');
  }
}
