import {ChangeDetectorRef, Component, EventEmitter, Inject, OnDestroy, OnInit, Output} from '@angular/core';
import {Router} from '@angular/router';
import {Subject} from 'rxjs';
import {finalize, takeUntil} from 'rxjs/operators';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {uriFeConst} from '@shared/constants';
import {CartManageService, CheckoutManageService} from '@shared/services/global';
import {AddressCacheService, LoyaltyApiService} from '@shared/services/api';
import {PromotionEvaluateService} from '@shared/services/feature-specific';
import {
  IOrderCarrier,
  IPaymentMethod,
  IPointSettings,
  IPromotionCoupon,
  IPromotionEvaluateData,
  ISaveOrderV2Params,
} from '@shared/models/api';
import {IGiftDisplayProduct} from '@shared/components/cart-flow/cart-flow.models';
import {IAddress} from '@shared/models/global';
import {fullAddress} from '@shared/utils';
import {IGroupLocation} from '@shared/components/location-group';
import {AppFormAddService} from '@shared/services/global/app-form-add.service';
import {OffcanvasCustomService} from '@shared/services/global';
import {NotifyService, ZmpService} from '@core/services';
import {ENVIRONMENT, IEnvironment} from '@core/tokens/environment.token';
import {openChat} from 'zmp-sdk/apis';
import {CheckoutFlowScreen, ScreenTransition} from './checkout-flow.models';
import {PaymentMethodModalComponent} from '../modals/checkout-action';

@Component({
  selector: 'app-checkout-flow',
  standalone: false,
  templateUrl: './checkout-flow.component.html',
  styleUrls: ['./checkout-flow.component.scss'],
})
export class CheckoutFlowComponent extends AppCommonComponent implements OnInit, OnDestroy {
  @Output() openAddress = new EventEmitter<void>();
  @Output() openCarrier = new EventEmitter<void>();
  @Output() openPaymentMethod = new EventEmitter<void>();

  screen: CheckoutFlowScreen = 'checkout';
  screenTransition: ScreenTransition = null;

  payload!: ISaveOrderV2Params;
  items: any[] = [];
  noteInput = '';

  checkedCarrier: IOrderCarrier | null = null;
  carrierLoading = false;
  paymentMethod: IPaymentMethod | null = null;
  paymentMethods: IPaymentMethod[] = [];
  showPaymentHint = false;

  promoResult: IPromotionEvaluateData | null = null;
  appliedCouponCode: string | null = null;
  couponLoading = false;
  giftSelections: Record<string, IGiftDisplayProduct[]> = {};

  usePoint = false;
  showPointHint = false;
  pointBalance = 0;
  usedPoints = 0;
  pointSettings: IPointSettings | null = null;

  readonly uriFeConst = uriFeConst;

  private destroy$ = new Subject<void>();
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private cd: ChangeDetectorRef,
    private router: Router,
    private svc: CheckoutManageService,
    private cart: CartManageService,
    private addressCacheSer: AddressCacheService,
    private promoService: PromotionEvaluateService,
    private loyaltyApi: LoyaltyApiService,
    public appFm: AppFormAddService,
    private offcanvasService: OffcanvasCustomService,
    override notifyService: NotifyService,
    @Inject(ENVIRONMENT) private env: IEnvironment,
  ) {
    super();
  }

  ngOnInit(): void {
    this.updateHeader();

    this.svc.initCheckoutData();
    this.applyDefaultAddress();

    const checked = this.cart.getCheckedProductData();
    this.items = Object.values(checked.items ?? {});

    if (!this.items.length) {
      this.router.navigate(['/cart/index']);
      return;
    }

    this.svc.payload$.pipe(takeUntil(this.destroy$)).subscribe(p => {
      this.payload = p;
      this.noteInput = p.info?.description || '';
      this.cd.markForCheck();
    });

    this.svc.selectedCarrierUi$.pipe(takeUntil(this.destroy$)).subscribe(carrier => {
      this.checkedCarrier = carrier;
      this.cd.markForCheck();
    });

    this.svc.carrierLoading$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      this.carrierLoading = loading;
      this.cd.markForCheck();
    });

    this.svc.loadPaymentMethods$().pipe(takeUntil(this.destroy$)).subscribe();

    this.svc.paymentMethods$.pipe(takeUntil(this.destroy$)).subscribe(methods => {
      this.paymentMethods = methods;
      this.cd.markForCheck();
    });

    this.svc.selectedMethod$.pipe(takeUntil(this.destroy$)).subscribe(method => {
      this.paymentMethod = method;
      this.cd.markForCheck();
    });

    this.giftSelections = this.cart.getGiftSelections() ?? {};

    const cartPromo = this.cart.getCheckoutPromoSnapshot();
    if (cartPromo) {
      this.promoResult = cartPromo;
    }

    const couponFromService = this.svc.snapshot?.payment?.couponCode;
    if (couponFromService) {
      this.appliedCouponCode = couponFromService;
    }

    this.promoService.result$.pipe(takeUntil(this.destroy$)).subscribe(result => {
      this.applyCouponOnly(result?.coupon ?? null);
      this.couponLoading = false;
      this.syncUsedPoints();
      this.cd.markForCheck();
    });

    this.loadPointContext();
    this.evaluatePromotion();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cart.clearCheckoutPromoSnapshot();
    this.cart.clearGiftSelections();
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  get headerTitle(): string {
    return this.screen === 'voucher-picker' ? 'Chọn voucher' : 'Thanh toán';
  }

  get subtotal(): number {
    return this.items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  }

  get totalQuantity(): number {
    return this.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }

  get shippingFee(): number {
    return Number(this.checkedCarrier?.customerShipFee) || 0;
  }

  get productDiscount(): number {
    return this.promoResult?.discount?.totalDiscountAmount ?? 0;
  }

  get voucherDiscount(): number {
    return this.promoResult?.coupon?.amount ?? 0;
  }

  // VND/điểm — rate hiệu lực POS trả về (usedPoints * pointValueRate)
  get pointRate(): number {
    return this.pointSettings?.pointValueRate ?? 0;
  }

  // Giá trị đơn sau coupon + CTKM (chưa gồm phí ship) — cơ sở tính điểm tối đa được tiêu
  get amountBeforePoint(): number {
    return Math.max(0, this.subtotal - this.productDiscount - this.voucherDiscount);
  }

  // Điểm tối đa được tiêu: min(điểm tích lũy, quy đổi từ giá trị đơn, max cấu hình)
  get maxUsablePoints(): number {
    const s = this.pointSettings;
    if (!s || this.pointRate <= 0) return 0;

    const byOrder = Math.floor(this.amountBeforePoint / this.pointRate);
    let max = Math.min(this.pointBalance, byOrder);
    if (s.settingMaxPoint > 0) max = Math.min(max, s.settingMaxPoint);
    max = Math.max(0, max);
    // Không đủ mức tối thiểu → không cho tiêu
    if (s.settingMinPoint > 0 && max < s.settingMinPoint) return 0;
    return max;
  }

  get canUsePoint(): boolean {
    return this.maxUsablePoints > 0;
  }

  get pointDiscount(): number {
    return this.usedPoints * this.pointRate;
  }

  get grandTotal(): number {
    return Math.max(0, this.subtotal + this.shippingFee - this.productDiscount - this.voucherDiscount - this.pointDiscount);
  }

  get appliedVoucherText(): string {
    if (this.appliedCouponCode && this.promoResult?.coupon?.status === 1 && this.promoResult.coupon.amount) {
      return 'Giảm ' + this.promoResult.coupon.amount.toLocaleString('vi-VN') + ' VND';
    }
    return 'Chọn mã giảm giá';
  }

  get carrierName(): string {
    return this.checkedCarrier?.serviceName || 'Giao hàng tiêu chuẩn';
  }

  get paymentDisplay(): string {
    return this.paymentMethod?.displayName || '';
  }

  get orderDisabled(): boolean {
    return !this.items.length || this.appFm.disabledSubmit || this.carrierLoading;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  back(): void {
    if (this.screen === 'voucher-picker') {
      this.goToScreen('checkout', 'back');
      return;
    }
    this.headerFooterFacade.back();
  }

  openVoucherPicker(): void {
    this.goToScreen('voucher-picker', 'forward');
  }

  // ── Address ───────────────────────────────────────────────────────────────

  onOpenAddress(): void {
    this.openAddress.emit();
  }

  // ── Carrier ───────────────────────────────────────────────────────────────

  onOpenCarrier(): void {
    this.openCarrier.emit();
  }

  // ── Payment method ────────────────────────────────────────────────────────

  onOpenPaymentMethod(): void {
    if (!this.paymentMethods.length) {
      this.notifyService.warning('Hiện chưa có phương thức thanh toán khả dụng');
      return;
    }
    const ref = this.offcanvasService.open(PaymentMethodModalComponent, {
      position: 'bottom',
      backdrop: true,
      keyboard: true,
      scroll: false,
      container: 'body',
      panelClass: 'offcanvas-bottom-sheet',
    });
    ref.componentInstance.methods = this.paymentMethods;
    ref.componentInstance.selectedMethod = this.paymentMethod;
    ref.result
      .then((method: IPaymentMethod) => {
        if (method) this.onSelectPaymentMethod(method);
      })
      .catch(() => undefined);
    this.showPaymentHint = false;
    this.cd.markForCheck();
  }

  onSelectPaymentMethod(method: IPaymentMethod): void {
    this.svc.selectMethod(method);
    this.showPaymentHint = false;
    this.cd.markForCheck();
  }

  // ── Voucher ───────────────────────────────────────────────────────────────

  onApplyCoupon(code: string): void {
    this.couponLoading = true;
    this.appliedCouponCode = code;
    this.evaluatePromotion();
  }

  onVoucherComplete(code: string | null): void {
    this.appliedCouponCode = code;
    this.evaluatePromotion();
    this.goToScreen('checkout', 'back');
  }

  // ── Note ──────────────────────────────────────────────────────────────────

  onNoteInput(v: string): void {
    this.svc.setNote(v);
  }

  // ── Points ────────────────────────────────────────────────────────────────

  togglePoint(): void {
    if (!this.canUsePoint) {
      this.usePoint = false;
      this.setUsedPoints(0);
      return;
    }
    this.usePoint = !this.usePoint;
    this.setUsedPoints(this.usePoint ? this.maxUsablePoints : 0);
  }

  private setUsedPoints(points: number): void {
    this.usedPoints = points;
    this.svc.setUsedPoints(points);
    this.cd.markForCheck();
  }

  // Đồng bộ lại điểm dùng khi giá trị đơn/coupon/điểm thay đổi
  private syncUsedPoints(): void {
    if (this.usePoint) {
      this.setUsedPoints(this.maxUsablePoints);
    }
  }

  private loadPointContext(): void {
    if (!this.userService.internalJwt) return; // chỉ khi đã định danh

    this.loyaltyApi.getPointSettings().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res?.code && res.data) {
          this.pointSettings = res.data;
          this.syncUsedPoints();
          this.cd.markForCheck();
        }
      },
    });

    this.loyaltyApi.getMyLoyalty().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res?.code && res.data) {
          this.pointBalance = Number(res.data.points ?? 0);
          this.syncUsedPoints();
          this.cd.markForCheck();
        }
      },
    });
  }

  togglePointHint(event: Event): void {
    event.stopPropagation();
    this.showPointHint = !this.showPointHint;
  }

  closePointHint(): void {
    this.showPointHint = false;
  }

  // ── Place order ───────────────────────────────────────────────────────────

  onPlaceOrder(): void {
    if (this.carrierLoading) {
      this.notifyService.warning('Đang tải phí vận chuyển, vui lòng đợi trong giây lát');
      return;
    }

    if (!this.paymentMethod && this.paymentMethods.length > 0) {
      this.showPaymentHint = true;
      this.cd.markForCheck();
      return;
    }

    if (this.appFm.disabledSubmit) return;
    this.appFm.disabledSubmit = true;
    this.spinner.show();

    this.svc.placeOrder$().pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.appFm.disabledSubmit = false;
        this.spinner.hide();
        this.cd.markForCheck();
      }),
    ).subscribe();
  }

  // ── Support chat ──────────────────────────────────────────────────────────

  async onOpenSupportChat(): Promise<void> {
    const oaId = this.env.OAId;
    if (!oaId) {
      this.notifyService.warning('Có lỗi xảy ra');
      return;
    }
    try {
      await openChat({type: 'oa', id: oaId});
    } catch {
      this.notifyService.error('Không thể mở chat hỗ trợ, vui lòng thử lại');
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getProductGifts(productId: number): IGiftDisplayProduct[] {
    return this.giftSelections[`product_${productId}`] ?? [];
  }

  get billGifts(): IGiftDisplayProduct[] {
    return this.giftSelections['bill'] ?? [];
  }

  formatPrice(price: number): string {
    return (price ?? 0).toLocaleString('vi-VN') + ' VND';
  }

  private applyCouponOnly(coupon: IPromotionCoupon | null): void {
    if (!this.promoResult) return;
    this.promoResult = {
      ...this.promoResult,
      coupon: coupon ?? {status: 0, code: null, message: null, amount: null},
    };
  }

  private evaluatePromotion(): void {
    const evalItems = this.items.map((it: any) => ({
      productId: it.productId,
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 0,
    }));
    this.promoService
      .evaluateImmediate$(evalItems, this.appliedCouponCode || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  private applyDefaultAddress(): void {
    this.addressCacheSer.getAddressList(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe(addresses => {
        if (!addresses.length) return;

        const selectedId = this.svc.getSelectedAddressId();
        const selected = selectedId != null
          ? addresses.find(addr => addr.id === selectedId)
          : null;
        const defaultAddress = addresses.find(addr => addr.isDefault === 1);
        const useAddr = selected ?? defaultAddress ?? addresses[0];

        if (!useAddr) return;

        const addressView = {
          address: useAddr.address ?? '',
          location: {
            cityId: useAddr.shipToCityLocationId ?? 0,
            districtId: useAddr.shipToDistrictLocationId ?? 0,
            wardId: useAddr.shipToWardLocationId ?? 0,
            cityName: useAddr.provinceName ?? '',
            districtName: useAddr.districtName ?? '',
            wardName: useAddr.wardName ?? '',
          },
        };
        const loc: IGroupLocation = {
          cityId: addressView.location.cityId,
          districtId: addressView.location.districtId,
          wardId: addressView.location.wardId,
          cityName: addressView.location.cityName,
          districtName: addressView.location.districtName,
          wardName: addressView.location.wardName,
        };

        this.svc.setCustomer({
          name: useAddr.recipientName,
          mobile: useAddr.recipientPhone,
          address: fullAddress(addressView as unknown as IAddress),
        });
        this.svc.setLocation(loc);
        this.svc.setLocationValue(loc);
        this.svc.setSelectedAddressId(useAddr.id);
        this.svc.loadCarrier();
      });
  }

  private goToScreen(screen: CheckoutFlowScreen, direction: ScreenTransition): void {
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    this.screenTransition = direction;
    this.screen = screen;
    this.updateHeader();
    if (direction) {
      this.transitionTimer = setTimeout(() => {
        this.screenTransition = null;
        this.transitionTimer = null;
        this.cd.markForCheck();
      }, 320);
    }
  }

  private updateHeader(): void {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: this.headerTitle,
      backHandler: this.screen === 'checkout' ? undefined : () => this.back(),
    });
  }
}
