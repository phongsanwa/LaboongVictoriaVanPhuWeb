import {Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
import {finalize, takeUntil,Observable} from 'rxjs';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {
  CheckoutManageService,
} from '@shared/services/global';
import {Router} from '@angular/router';
import {CartManageService} from '@shared/services/global';
import {
  IOrderCarrier,
  IPromotionEvaluateData,
  IResCalculateFee,
  ISaveOrderParams
} from '@shared/models/api';
import {CustomerManageService, ModalCustomService, OffcanvasCustomService} from '@shared/services/global';
import {CarrierSelectModalComponent} from '@shared/components';
import {IGroupLocation} from '@shared/components';
import {fullAddress} from '@shared/utils';
import {ZmpService} from '@core/services';
import {AppFormAddService} from '@shared/services/global/app-form-add.service';
import {PromotionEvaluateService} from '@shared/services/feature-specific';
import {NgbOffcanvasOptions} from '@ng-bootstrap/ng-bootstrap';
import {
  BoxVoucherCheckoutComponent, IVoucherItem
} from '@shared/components/actions/box-voucher-checkout/box-voucher-checkout.component';
import {ZmaNativeStorageService} from '@core/services';

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
  styleUrls: ['./checkout.component.scss'],
  standalone: false
})
export class CheckoutComponent extends AppCommonComponent implements OnInit, OnDestroy{
  payload!: ISaveOrderParams;
  items: any[] = [];
  showPaymentHint = true;
  noteInput = '';
  paymentMethod: PaymentPicked | null = { ...DEFAULT_BANK_PM };
  selectedVoucher: string | null = null;
  promoResult: IPromotionEvaluateData | null = null;

  constructor(
    public appFm: AppFormAddService,
    private svc: CheckoutManageService,
    private cart: CartManageService,
    private customerSer: CustomerManageService,
    private cd: ChangeDetectorRef,
    private router: Router,
    private modal: ModalCustomService,
    private zmpPay: ZmpService,
    private offcanvasSvc: OffcanvasCustomService,
    private promoService: PromotionEvaluateService,
    private storage: ZmaNativeStorageService,

  ) {
    super();
  }

  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Trang thanh toán'});
    this.setFooter({variant: 'tabs', show: false});
    this.svc.initCheckoutData();
    this.applyDefaultAddressToPayload();

    const checked = this.cart.getCheckedProductData();
    this.items = Object.values(checked.items ?? {});
    if (!this.items.length) {
      this.router.navigate(['/']);
      return;
    }

    this.svc.payload$
      .pipe(takeUntil(this.destroyed))
      .subscribe(p => {
        this.payload = p;
        this.noteInput = p.orders.description || '';
        this.cd.markForCheck();
      });

    //Hiển thị voucher đã được chọn lấy từ storage ra
    const couponFromService = this.svc.snapshot.orders.couponCode;
    if (couponFromService) {
      this.selectedVoucher = couponFromService;
    } else {
      const voucher = localStorage.getItem('selectedVoucher');
      this.selectedVoucher = voucher || null;
    }

    this.promoService.result$.pipe(takeUntil(this.destroyed)).subscribe(result => {
      this.promoResult = result;
      this.cd.markForCheck();
    });

    this.evaluatePromotion();
  }



  ngOnDestroy() {
    this.getDestroySubs();
  }

  get carrier() {
    return this.payload.carrier;
  }

  get summary(): {
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
    totalQuantities: number;
  } {
    const p = this.payload;
    if (!p || !p.orders) {
      return { subtotal: 0, shippingFee: 0, discount: 0, total: 0, totalQuantities: 0 };
    }

    const products = Array.isArray(p.orders.products) ? p.orders.products : [];

    const toNum = (v: any) => {
      const n = Number(v);
      return isFinite(n) ? n : 0;
    };

    // Tổng tiền
    let subtotal = 0;
    for (let i = 0; i < products.length; i++) {
      const it = products[i];
      const price = toNum(it && it.price);
      const qty = toNum(it && it.quantity);
      subtotal += price * qty;
    }

    // Phí vận chuyển
    const carrier = p.carrier;
    const shippingFee = toNum(carrier && carrier.customerShipFee);

    // Giảm giá: ưu tiên kết quả evaluate API, fallback couponValue
    const promoDiscount = this.promoResult?.discount?.totalDiscountAmount ?? 0;
    const discount = promoDiscount > 0 ? promoDiscount : toNum(p.orders.couponValue);

    // Tổng cộng
    const total = Math.max(0, subtotal + shippingFee - discount);

    // Tổng số lượng sản phẩm
    let totalQuantities = 0;
    for (let i = 0; i < products.length; i++) {
      const it = products[i];
      totalQuantities += toNum(it && it.quantity);
    }

    return { subtotal, shippingFee, discount, total, totalQuantities };
  }
  variantText(it: any): string {
    const a = (it.colorChecked || '').trim();
    const b = (it.sizeChecked || '').trim();
    if (a && b) return `${a} / ${b}`;
    return a || b || '';
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

  openVoucherBox() {
    const opts: NgbOffcanvasOptions = {
      position: 'bottom',
      backdrop: true,
      keyboard: true,
      scroll: false,
      container: 'body',
      panelClass: 'offcanvas-bottom-sheet',
    };

    const ref = this.offcanvasSvc.open(BoxVoucherCheckoutComponent, opts);
    ref.closed.subscribe((voucherCode: IVoucherItem) => {
      if (voucherCode.code) {
        this.selectedVoucher = voucherCode.code;
        this.evaluatePromotion();
      }
    });
  }

  onChangeAddress() {
    this.router.navigate(['/user/address']);
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

  private evaluatePromotion(): void {
    const items = this.items.map((it: any) => ({
      productId: it.productId,
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 0,
    }));
    this.promoService
      .evaluateImmediate$(items, this.selectedVoucher || undefined)
      .pipe(takeUntil(this.destroyed))
      .subscribe();
  }
}
