import {Component, OnDestroy} from '@angular/core';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {CheckoutManageService, CustomerManageService, OffcanvasCustomService,} from '@shared/services/global';
import {IResCalculateFee} from '@shared/models/api';
import {NgbOffcanvasOptions} from '@ng-bootstrap/ng-bootstrap';
import {AddressModalComponent} from '@shared/components/modals/checkout-action/addressModal.component';
import {CarrierOffcanvasComponent} from '@shared/components/modals/checkout-action/carrierModal.component';
import {ZmpService} from '@core/services';

@Component({
  selector: 'app-checkout',
  standalone: false,
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
})
export class CheckoutComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

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
    private customerSer: CustomerManageService,
    private offcanvasSvc: OffcanvasCustomService,
    private zmpPay: ZmpService,
  ) {
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onOpenAddress(): void {
    const addresses = this.customerSer.getAll?.() || [];
    const defaultAddr = this.customerSer.getDefault?.();
    const ref = this.offcanvasSvc.open(AddressModalComponent, this.offcanvasOpts);

    (ref.componentInstance as any).type = 'address';
    (ref.componentInstance as any).addresses = addresses;

    (ref.componentInstance as any).activeId = defaultAddr?.id && !isNaN(Number(defaultAddr.id))
      ? Number(defaultAddr.id)
      : addresses.length > 0 && !isNaN(Number(addresses[0].id))
        ? Number(addresses[0].id)
        : -1;
  }

  onOpenCarrier(): void {
    const ref = this.offcanvasSvc.open(CarrierOffcanvasComponent, this.offcanvasOpts);
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
      .selectMethod$({channels: [], selectedMethod: undefined})
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }
}
