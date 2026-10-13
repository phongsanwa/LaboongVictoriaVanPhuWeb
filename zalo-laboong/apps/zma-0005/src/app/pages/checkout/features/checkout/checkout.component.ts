import {
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {IOrderCarrier, IResCalculateFee, ISaveOrderParams, IPromotionEvaluateData} from '@shared/models/api';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {
  CartManageService,
  CheckoutManageService,
  CustomerManageService,
  ModalCustomService
} from '@shared/services/global';
import {Router} from '@angular/router';
import {AppFormAddService} from '@shared/services/global/app-form-add.service';
import {ZmpService} from '@core/services';
import {PromotionEvaluateService} from '@shared/services/feature-specific';
import {filter, map, take, takeUntil} from 'rxjs';
import {fullAddress} from '@shared/utils';
import {CarrierSelectModalComponent, IGroupLocation} from '@shared/components';
import {NgbActiveModal, NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {uriFeConst} from '@shared/constants';
import {ICartItem} from '@shared/models/feature-specific';
import {tap} from 'rxjs/operators';


type PaymentPicked = {
  method: string;
  subMethod?: string;
  displayName?: string;
  isCustom?: boolean;
  logo?: string;
};

const DEFAULT_BANK_PM: PaymentPicked = {
  method: '',
  subMethod: '',
  displayName: 'Vui lòng chọn phương thức thanh toán',
  logo: 'https://stc-zmp.zadn.vn/payment/cod.png'
};

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: [`/checkout.component.scss`],
  standalone: false,
})

export class CheckoutComponent extends AppCommonComponent implements OnInit, OnDestroy {
  payload!: ISaveOrderParams;
  items: any[] = [];
  showPaymentHint = true;
  noteInput = '';
  paymentMethod: PaymentPicked | null = { ...DEFAULT_BANK_PM };
  promoResult: IPromotionEvaluateData | null = null;

  constructor(
    private svc: CheckoutManageService,
    private cd: ChangeDetectorRef,
    private customerSer: CustomerManageService,
    private cart: CartManageService,
    private router: Router,
    private modal: ModalCustomService,
    public appFm: AppFormAddService,
    private zmpPay: ZmpService,
    private promoService: PromotionEvaluateService,
  ) {
    super();
  }
  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Thanh toán đơn hàng'});
    this.setFooter({variant: 'tabs', show: false});
    this.svc.initCheckoutData();
    this.applyDefaultAddressToPayload();
    this.cart.handlerLoadData();
    const checked = this.cart.getCheckedProductData();
    this.items = Object.values(checked.items ?? {});
    if (!this.items.length) {
      this.router.navigate([uriFeConst.cart.index]);
      return;
    }

    this.svc.payload$
      .pipe(takeUntil(this.destroyed))
      .subscribe(p => {
        this.payload = p;
        this.noteInput = p.orders.description || '';
        this.cd.markForCheck();
      });

    this.promoService.result$.pipe(takeUntil(this.destroyed)).subscribe(result => {
      this.promoResult = result;
      this.cd.markForCheck();
    });

    this.evaluatePromotion();
  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  onQuantityChange(item: ICartItem, qty: number) {
    this.cart.updateCartItemQuantity(item.productId, qty);
    const checked = this.cart.getCheckedProductData();
    this.items = Object.values(checked.items ?? {});
    this.evaluatePromotion();
    this.cd.markForCheck();
  }

  private applyDefaultAddressToPayload(): void {
    const def = this.customerSer.getDefault();
    if (!def) return;

    const addressView = {
      address: def.address,
      location: def.location
    }

    this.svc.setCustomer({
      name: def.name,
      mobile: def.mobile,
      address: fullAddress(addressView)
    });

    const loc: IGroupLocation = {
      cityId: def.location.cityId,
      districtId: def.location.districtId,
      wardId: def.location.wardId,
      cityName: def.location.cityName ?? '',
      districtName: def.location.districtName ?? '',
      wardName: def.location.wardName ?? ''
    };

    this.svc.setLocation(loc); // set location default
    if (!this.hasCustomerInPayload()) {
      this.svc.setLocationValue(loc);
    }
  }

  private hasCustomerInPayload(): boolean {
    const c = this.payload?.customer;
    return !!(c?.name?.trim() && (c?.mobile?.trim() || c?.address?.trim()));
  }

  onNoteInput(v: string) {
    this.svc.setNote(v);
  }

  get carrier() {
    return this.payload.carrier;
  }

  onChangeCarrier(carrier: IOrderCarrier) {
    const ref = this.modal.openIntro(CarrierSelectModalComponent, {size: 'sm', centered: true});
    ref.componentInstance.options = this.svc.getCarrierOptions();
    ref.componentInstance.activeServiceId = this.carrier?.serviceId || 0;

    ref.closed.pipe(takeUntil(this.destroyed)).subscribe((picked: IResCalculateFee) => {
      if (picked) {
        // this.svc.applyCarrier(picked);
        this.cd.markForCheck();
      }
    });
  }

  get summary() {
    const subtotal = this.items.reduce((s, i: any) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
    const shippingFee = Number(this.carrier?.customerShipFee) || 0;
    const promoDiscount = this.promoResult?.discount?.totalDiscountAmount ?? 0;
    const discount = promoDiscount > 0 ? promoDiscount : 0;
    const total = Math.max(0, subtotal + shippingFee - discount);
    const totalQuantities = this.items.reduce((s, i: any) => s + (Number(i.quantity) || 0), 0);
    return {subtotal, shippingFee, discount, total, totalQuantities};
  }

  onPlaceOrder() {
    this.appFm.disabledSubmit = true;
    this.svc.placeOrder$().pipe(takeUntil(this.destroyed)).subscribe({
      next: res => {
        if (!res) return;
        this.appFm.disabledSubmit = false;
      },
      error: () => this.appFm.disabledSubmit = false,
      complete: () => this.appFm.disabledSubmit = false
    })
  }

  private modalVoucher = inject(NgbModal);
  openVoucherModal() {
    const ref = this.modalVoucher.open(VoucherModalComponent, {
      centered: true,
      modalDialogClass: 'custom-modal-share modal-dialog-bottom modal-voucher'
    });
    ref.closed.subscribe(() => {
      this.evaluatePromotion();
    });
  }

  onRemoveProduct(item: ICartItem) {
    if (!item.productId) return;
    this.notifyService
      .dialogConfirmDelete({
        size: 'sm',
        title: 'Xác Nhận',
        content: 'Bạn có chắc muốn xoá sản phẩm này khỏi giỏ hàng?',
        variant: 'modern'
      })
      .pipe(
        take(1),
        map((res: { confirmDelete?: boolean } | undefined) => !!res?.confirmDelete),
        filter(Boolean),
        tap(() => {
          this.cart.onRemoveCartItem(item);
          const checked = this.cart.getCheckedProductData();
          this.items = Object.values(checked.items ?? {});
          this.notifyService.success('Đã xoá sản phẩm thành công.');
        }),
        takeUntil(this.appFm.destroyed)
      ).subscribe();
  }

  goToAddressList() {
    sessionStorage.setItem('addressFrom', '/checkout');
    this.router.navigate(['/user/address']);
  }

  openSelectMethod() {
    const cfg = {
      channels: [
        { method: 'COD_SANDBOX', subMethod: 'Thanh toán khi nhận hàng' },
        { method: 'COD', subMethod: 'Thanh toán khi nhận hàng' }
      ],

      selectedMethod: this.paymentMethod
        ? { method: this.paymentMethod.method, subMethod: this.paymentMethod.subMethod }
        : { method: DEFAULT_BANK_PM.method, subMethod: DEFAULT_BANK_PM.subMethod }
    };

    this.zmpPay.selectMethod$(cfg).subscribe({
      next: (res) => {
        if(!res.method) return;
        this.paymentMethod = res;
        this.svc.setPaymentMethod(res)
        this.showPaymentHint = false;
        this.cd.markForCheck();
      },
      error: () => {}
    });
  }


  private evaluatePromotion(): void {
    const items = this.items.map((it: any) => ({
      productId: it.productId,
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 0,
    }));
    this.promoService
      .evaluateImmediate$(items)
      .pipe(takeUntil(this.destroyed))
      .subscribe();
  }

  protected readonly uriFeConst = uriFeConst;
}






@Component({
  selector: 'app-voucher-modal',
  standalone: true,
  template: `
    <div class="modal-body text-center p-2">
      <h5 class="mb-3">Nhập mã ưu đãi</h5>

      <div class="d-flex justify-content-center align-items-center gap-2">
        <input
          type="text"
          class="form-control w-75 shadow-none outline-none"
          placeholder="Nhập mã ưu đãi..."
        />
        <button class="btn btn-primary" (click)="apply()">Áp dụng</button>
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep .modal-body {
      padding: 1.5rem;
    }
    input {
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `]
})
export class VoucherModalComponent {
  code = '';
  private activeModal = inject(NgbActiveModal);

  apply() {
    this.activeModal.close(this.code.trim());
  }
}

