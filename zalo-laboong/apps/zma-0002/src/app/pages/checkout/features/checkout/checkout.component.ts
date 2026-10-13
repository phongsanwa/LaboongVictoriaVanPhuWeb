import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  CheckoutManageService,
  OffcanvasCustomService,
} from '@shared/services/global';
import { IResCalculateFee } from '@shared/models/api';
import { NgbOffcanvasOptions } from '@ng-bootstrap/ng-bootstrap';
import { AddressModalComponent } from '@shared/components/modals/checkout-action/addressModal.component';
import { CarrierOffcanvasComponent } from '@shared/components/modals/checkout-action/carrierModal.component';
import { ZmpService } from '@core/services';

@Component({
  selector: 'app-checkout',
  standalone: false,
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
})
export class CheckoutComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  private checkoutAddressId: string | number | null = null;

  private readonly offcanvasOpts: NgbOffcanvasOptions = {
    position: 'bottom',
    backdrop: true,
    keyboard: true,
    scroll: false,
    container: 'body',
    panelClass: 'offcanvas-bottom-sheet',
  };

  constructor(
    private svc: CheckoutManageService,
    private offcanvasSvc: OffcanvasCustomService,
    private zmpPay: ZmpService,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onOpenAddress(): void {
    const ref = this.offcanvasSvc.open(AddressModalComponent, this.offcanvasOpts);

    (ref.componentInstance as any).type = 'address';
    (ref.componentInstance as any).checkoutSelectionOnly = true;

    const activeId = this.checkoutAddressId ?? this.svc.getSelectedAddressId() ?? -1;
    (ref.componentInstance as any).activeId = activeId;

    ref.closed.pipe(takeUntil(this.destroy$)).subscribe((picked: any) => {
      if (picked?.id) {
        this.checkoutAddressId = picked.id;
        this.svc.setSelectedAddressId(Number(picked.id));
      }
    });
  }

  onOpenCarrier(): void {
    const ref = this.offcanvasSvc.open(CarrierOffcanvasComponent, {
      ...this.offcanvasOpts,
      panelClass: 'offcanvas-bottom-sheet carrier-offcanvas-sheet',
    });
    (ref.componentInstance as any).options = this.svc.getCarrierOptions();
    (ref.componentInstance as any).activeServiceId = this.svc.snapshot?.carrier?.serviceId || 0;

    ref.closed.pipe(takeUntil(this.destroy$)).subscribe((picked: IResCalculateFee) => {
      if (picked) {
        this.svc.applyCarrier(picked as any);
      }
    });
  }

  onOpenPaymentMethod(): void {
    this.zmpPay
      .selectMethod$({ channels: [], selectedMethod: undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }
}
