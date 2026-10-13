import {Injectable} from '@angular/core';
import {BehaviorSubject, defer, EMPTY, from, Observable, of, take} from 'rxjs';
import {Router} from '@angular/router';
import {CartManageService} from '@shared/services/global';
import {castFloat} from '@shared/utils';
import {
  ICalculateFeeParams,
  IOrderCarrier,
  IOrderProduct,
  IPaymentHMACParams,
  IPaymentMethod,
  IResCalculateFee,
  ISaveOrderV2Params,
  ISaveOrderV2ProductGift,
} from '@shared/models/api';
import {AnalyticsService, NotifyService, ZmpService} from '@core/services';
import {IGroupLocation} from '@shared/components/location-group';
import {catchError, finalize, map, switchMap, timeout} from 'rxjs/operators';
import { Payment } from 'zmp-sdk/apis';
import {I18nFormatDecimalPipe} from '../../../pipes/global';
import {MockPromotionService} from '../../feature-specific/promotion/mock-promotion.service';
import {uriFeConst} from '../../../constants';
import {IVoucherItem} from '../../../components/actions/box-voucher-checkout/box-voucher-checkout.component';
import {OrderApiService, PaymentApiService} from '../../api';

interface IFormData {
  toCityLocationId: number,
  toDistrictLocationId: number,
  toWardLocationId: number,
  locationLevel: number,
  isCod: number,
  address: string
}

@Injectable({providedIn: 'root'})
export class CheckoutManageService {
  static readonly REDIRECT_HOME_AFTER_ORDER_FLAG = 'checkout:redirect-home-after-order';

  private payloadSub = new BehaviorSubject<ISaveOrderV2Params>(this.initOrderData());
  readonly payload$: Observable<ISaveOrderV2Params> = this.payloadSub.asObservable();
  /** Danh sách gói vận chuyển đã tính (API trả về) */
  private carrierOptions: IResCalculateFee[] = [];
  calculateFee: IResCalculateFee[] = []
  private carrierLoadingSub = new BehaviorSubject<boolean>(false);
  readonly carrierLoading$ = this.carrierLoadingSub.asObservable();
  private selectedCarrierUiSub = new BehaviorSubject<IOrderCarrier | null>(null);
  readonly selectedCarrierUi$ = this.selectedCarrierUiSub.asObservable();
  private selectedAddressIdSub = new BehaviorSubject<number | null>(null);
  readonly selectedAddressId$ = this.selectedAddressIdSub.asObservable();
  formData: IFormData = {
    toCityLocationId: 0,
    toDistrictLocationId: 0,
    toWardLocationId: 0,
    address: '',
    locationLevel: 1,
    isCod: 1
  };

  private paymentMethodsSub = new BehaviorSubject<IPaymentMethod[]>([]);
  readonly paymentMethods$ = this.paymentMethodsSub.asObservable();

  private selectedMethodSub = new BehaviorSubject<IPaymentMethod | null>(null);
  readonly selectedMethod$ = this.selectedMethodSub.asObservable();

  private couponValue = 0;
  messageToken?: string; // state lưu token trả về từ event showFunctionButtonWidget

  constructor(
    private cart: CartManageService,
    private router: Router,
    private orderApi: OrderApiService,
    private paymentApi: PaymentApiService,
    private notifyService: NotifyService,
    private formatNumberI18n: I18nFormatDecimalPipe,
    private mockPromotion: MockPromotionService,
    private zmpService: ZmpService,
    private analytics: AnalyticsService,
  ) {
  }

  setNote(note: string): void {
    const p = structuredClone(this.snapshot);
    p.info = {
      ...(p.info ?? {}),
      description: note,
    };
    this.payloadSub.next(p);
  }

  setUsedPoints(points: number): void {
    const p = structuredClone(this.snapshot);
    p.payment.usedPoints = Math.max(0, Math.floor(points || 0));
    this.payloadSub.next(p);
  }

  setCouponCode(code: IVoucherItem): void {
    const p = structuredClone(this.snapshot);
    p.payment.couponCode = (code.code).trim();
    this.couponValue = code.value ?? 0;

    this.payloadSub.next(p);
    this.recalcAndPush(p);
  }

  setCustomer(cus: { name: string; mobile: string; address: string; isDefault?: boolean }): void {
    const address = (cus.address || '').trim();
    const p = this.snapshot;
    const next = {
      ...p,
      customer: {
        ...p.customer,
        name: (cus.name || '').trim(),
        mobile: (cus.mobile || '').trim(),
        address
      }
    };
    this.formData.address = address;
    this.payloadSub.next(next);
  }

  clearCustomerAddress(): void {
    const p = structuredClone(this.snapshot);
    p.customer = {name: '', mobile: '', address: '', provinceId: 0, districtId: 0, wardId: 0};
    p.carrier = {
      carrierId: 0,
      carrierName: '',
      carrierShopId: '',
      carrierAccountId: '',
      isRequiredInsurance: 0,
      serviceId: 0,
      serviceName: '',
      serviceCode: '',
      declaredFee: 0,
      customerShipFee: 0
    };

    this.formData = {
      ...this.formData,
      toCityLocationId: 0,
      toDistrictLocationId: 0,
      toWardLocationId: 0,
      address: ''
    };
    this.carrierOptions = [];
    this.calculateFee = [];
    this.selectedCarrierUiSub.next(null);
    this.selectedAddressIdSub.next(null);
    this.recalcAndPush(p);
  }

  setSelectedAddressId(addressId: number | null): void {
    this.selectedAddressIdSub.next(addressId != null ? Number(addressId) : null);
  }

  getSelectedAddressId(): number | null {
    return this.selectedAddressIdSub.value;
  }

  setLocation(loc: IGroupLocation): void {
    const p = structuredClone(this.snapshot);
    const next = {
      ...p,
      customer: {
        ...p.customer,
        provinceId: loc.cityId ?? 0,
        districtId: loc.districtId ?? 0,
        wardId: loc.wardId ?? 0,
      }
    };
    this.payloadSub.next(next);
  }

  setCarrier(next: Partial<ISaveOrderV2Params['carrier']>): void {
    const p = structuredClone(this.snapshot);
    p.carrier = {...p.carrier, ...next};
    this.recalcAndPush(p);
  }

  /** Nạp/ghi options từ API ngoài vào service */
  setCarrierOptions(options: IResCalculateFee[]) {
    this.carrierOptions = Array.isArray(options) ? options : [];
  }

  /** Đọc lại options để hiển thị modal */
  getCarrierOptions(): IResCalculateFee[] {
    return this.carrierOptions;
  }

  get snapshot(): ISaveOrderV2Params {
    return this.payloadSub.value;
  }

  /** Khởi tạo dữ liệu đơn hàng */
  private initOrderData(): ISaveOrderV2Params {
    return {
      info: {
        description: '',
      },
      channel: {
        webAppType: 1,
      },
      customer: {
        name: '',
        mobile: '',
        address: '',
        provinceId: 0,
        districtId: 0,
        wardId: 0
      },
      products: [],
      carrier: {
        carrierId: 0,
        carrierName: '',
        carrierShopId: '',
        carrierAccountId: '',
        isRequiredInsurance: 0,
        serviceId: 0,
        serviceName: '',
        serviceCode: '',
        declaredFee: 0,
        customerShipFee: 0
      },
      payment: {
        paymentMethod: '',
        couponCode: '',
        totalOrderAmount: 0,
      },
    };
  }

  /** Build data checkout từ các item đã tick trong giỏ */
  initCheckoutData() {
    const checked = this.cart.getCheckedProductData(); // ICartData
    const items = Object.values(checked.items ?? {});

    const carrierUi: IOrderCarrier = {
      carrierId: checked.carrier?.id ?? 0,
      carrierName: checked.carrier?.carrierName ?? '',
      id: checked.carrier?.id ?? 0,
      carrierShopId: '',
      carrierAccountId: '',
      isRequiredInsurance: 0,
      logo: checked.carrier?.logo ?? '',
      serviceId: checked.carrier?.serviceId ?? 0,
      serviceName: checked.carrier?.serviceName ?? '',
      serviceCode: checked.carrier?.serviceCode ?? '',
      serviceDesc: checked.carrier?.serviceDesc ?? '',
      declaredFee: castFloat(checked.carrier?.declaredFee) || 0,
      customerShipFee: castFloat(checked.carrier?.customerShipFee)
    };
    this.selectedCarrierUiSub.next(carrierUi.carrierId || carrierUi.serviceId ? carrierUi : null);

    const products: IOrderProduct[] = items.map(it => ({
      id: it.productId,
      productId: it.productId,
      name: it.name ?? '',
      quantity: castFloat(it.quantity) || 0,
      price: castFloat(it.price) || 0,
      avatar: it.image,
      attribute: {
        color: it.colorChecked ?? '',
        size: it.sizeChecked ?? '',
      },
      gifts: it.gifts ?? [],
    }));

    const subtotal = products.reduce((s, p) => s + (p.price * p.quantity), 0);
    const totalOrderAmount = subtotal;

    const next: ISaveOrderV2Params = {
      info: {description: ''},
      channel: {webAppType: 1},
      customer: {name: '', mobile: '', address: '', provinceId: 0, districtId: 0, wardId: 0},
      products: products.map(product => this.mapOrderProduct(product)),
      carrier: this.mapOrderCarrier(carrierUi),
      payment: {
        paymentMethod: '',
        couponCode: '',
        totalOrderAmount,
      },
    };
    this.payloadSub.next(next);
  }

  private recalcAndPush(p: ISaveOrderV2Params) {
    const products = p.products ?? [];
    const subtotal = products.reduce((s, x) => s + (castFloat(x.price) * (castFloat(x.quantity) || 0)), 0);
    p.payment.totalOrderAmount = Math.max(0, subtotal);
    this.payloadSub.next(p);
  }

  onLoadCalculateFee() {
    const cartData = this.cart.getCheckedProductData();
    const items = Object.values(cartData.items ?? {});

    const products = items.map((item: any) => ({
      id: item.productId,
      quantity: Number(item.quantity) || 0,
      price: Number(item.price) || 0,
    }));

    this.calculateFeeApi({

      products: products,
      totalOrderAmount: cartData.totalAmount,
      // totalCod: cartData.totalAmount,
      toCityLocationId: this.formData.toCityLocationId,
      address: this.formData.address,
      toDistrictLocationId: this.formData.toDistrictLocationId,
      toWardLocationId: this.formData.toWardLocationId,
      locationLevel: this.formData.locationLevel,
      isCod: this.formData.isCod,
    });
  }

  private calculateFeeApi(params: ICalculateFeeParams) {
    this.carrierLoadingSub.next(true);
    this.orderApi.calculateFee(params).pipe(
      finalize(() => this.carrierLoadingSub.next(false))
    ).subscribe({
      next: res => {
        if (!res.code) {
          this.showCarrierPricingWarning();
          return;
        }

        const rsData: any = res.data;
        if (!res.data) {
          this.showCarrierPricingWarning();
          return;
        }
        const carriers: IResCalculateFee[] = rsData?.[0] || [];

        if (!carriers.length) {
          this.showCarrierPricingWarning();
          return;
        }

        this.calculateFee = carriers;

        this.setCarrierOptions(carriers);

        let defaultItem: IResCalculateFee = carriers[0];

        if (carriers.length > 1) {
          defaultItem = carriers.reduce(
            (min: IResCalculateFee, carrier: IResCalculateFee) =>
              carrier.customerShipFee < min.customerShipFee
                ? carrier
                : min
          );
        }

        const defaultCarrierId = Number(defaultItem.carrierId || 0);
        const defaultServiceId = Number(defaultItem.serviceId || 0);

        this.applyCarrier({
          carrierId: defaultCarrierId,
          id: defaultCarrierId,
          carrierName: defaultItem.carrierName,
          carrierShopId: (defaultItem as any).carrierShopId ?? '',
          carrierAccountId: (defaultItem as any).carrierAccountId ?? '',
          isRequiredInsurance: Number((defaultItem as any).isRequiredInsurance ?? 0),

          logo: defaultItem.logo ?? '',
          serviceId: defaultServiceId,
          serviceName: defaultItem.serviceName ?? '',
          serviceCode: (defaultItem as any).serviceCode ?? '',
          serviceDesc: defaultItem.serviceDescription ?? '',

          declaredFee: castFloat(defaultItem.declaredFee) || 0,
          customerShipFee: castFloat(defaultItem.customerShipFee) || 0
        });
      },
      error: () => {
        this.showCarrierPricingWarning();
      }
    })
  }

  private showCarrierPricingWarning(): void {
    this.notifyService.warning(
      'Vui lòng kiểm tra lại địa chỉ giao hàng hoặc liên hệ doanh nghiệp để được hỗ trợ.',
      'Chưa có bảng giá vận chuyển'
    );
  }

  setLocationValue(values: IGroupLocation): void {
    const { cityId, districtId, wardId } = values;

    this.formData.toCityLocationId = Number(cityId || 0);
    this.formData.toDistrictLocationId = Number(districtId || 0);
    this.formData.toWardLocationId = Number(wardId || 0);
  }

  loadCarrier(): void {
    this.onLoadCalculateFee();
  }

  loadPaymentMethods$(): Observable<void> {
    return this.paymentApi.getPaymentMethods$().pipe(
      map(res => {
        const raw = Array.isArray(res?.data) ? res.data : [];
        const methods: IPaymentMethod[] = raw.filter(
          (m: any) => m && typeof m === 'object' && !Array.isArray(m) && m.method
        );
        this.paymentMethodsSub.next(methods);

        if (!methods.length) return;

        const cod = methods.find(m => m.method === 'COD');
        const defaultMethod = cod ?? methods[0];
        this.selectMethod(defaultMethod);
      }),
      catchError(() => of(void 0))
    );
  }

  selectMethod(method: IPaymentMethod): void {
    this.selectedMethodSub.next(method);
    this.setPaymentMethod({method: method.method, isCustom: !!method.isCustom && method.isCustom !== 0});
  }

  /** Luồng đặt hàng: SAVE -> HMAC -> createOrder -> (optional) purchase -> notify+clear+goHome */
  placeOrder$() {
    return defer(() => {
      const payload = structuredClone(this.payloadSub.value) as ISaveOrderV2Params;
      const selectedMethod = this.selectedMethodSub.value;

      if (!payload) throw new Error('Thiếu payload');

      const errs = this.validatePayload(payload);
      if (errs.length) {
        this.notifyService.warning(errs[0]);
        return EMPTY;
      }

      return this.orderApi.saveOrder(payload).pipe(
        map((res) => {
          const ok = !!res && res.code === 1;
          if (!ok) throw new Error(this.getApiErrorMessage(res));
          const orderId = res.data.id;
          const paymentData = res.data.paymentZalo;
          const trackingUrl = res.data.trackingUrl;

          if (!orderId) throw new Error('Thiếu orderId từ server');

          // GA4 ecommerce: chỉ gửi purchase sau khi BE tạo đơn thành công để tránh ghi nhận doanh thu ảo.
          this.analytics.trackEvent('purchase', {
            transaction_id: String(orderId),
            currency: 'VND',
            value: Number(payload.payment?.totalOrderAmount || 0),
            shipping: Number(payload.carrier?.customerShipFee || 0),
            coupon: payload.payment?.couponCode || undefined,
            items: (payload.products || []).map(item => ({
              item_id: String(item.id),
              item_name: item.name || '',
              price: Number(item.price || 0),
              quantity: Number(item.quantity || 0),
            })),
          });

          this.cart.clearCart();

          if (payload?.payment?.couponCode) {
            this.mockPromotion.removeVoucher(payload.payment.couponCode);
          }

          sessionStorage.setItem(CheckoutManageService.REDIRECT_HOME_AFTER_ORDER_FLAG, '1');

          return { orderId, paymentData, trackingUrl };
        }),

        switchMap(({ orderId, paymentData, trackingUrl }) => {
          if (!paymentData) {
            this.notifyService.error('Thiếu dữ liệu thanh toán.');
            return from(
              this.router.navigate([uriFeConst.order.trackingDetail], {
                queryParams: { id: orderId, trackingUrl },
                replaceUrl: true,
                state: { fromCheckoutSuccess: true },
              })
            ).pipe(map(() => void 0));
          }

          const createOrderArgs: any = {
            amount: Number(paymentData.amount) || 0,
            item: paymentData.item,
            desc: paymentData.desc,
            extradata: paymentData.extradata,
            method: paymentData.method,
            mac: paymentData.mac,
          };

          if (!createOrderArgs.mac) {
            this.notifyService.error('Thiếu MAC để tạo đơn thanh toán.');
            return from(
              this.router.navigate([uriFeConst.order.trackingDetail], {
                queryParams: { id: orderId, trackingUrl },
                replaceUrl: true,
                state: { fromCheckoutSuccess: true },
              })
            ).pipe(map(() => void 0));
          }

          return this.createOrderAndWaitCheckoutResult$(createOrderArgs).pipe(
            switchMap((result) => {
              if (result?.resultCode === 1) {
                this.notifyService.success('Đặt hàng thành công');
              } else {
                this.notifyService.error(this.mapCheckoutErrorMessage(result));
              }

              return from(
                this.router.navigate([uriFeConst.order.trackingDetail], {
                  queryParams: { id: orderId, trackingUrl },
                  replaceUrl: true,
                  state: { fromCheckoutSuccess: true },
                })
              ).pipe(map(() => void 0));
            })
          );
        }),

        catchError((err) => {
          this.notifyService.error(err?.message || 'Không thể đặt hàng. Vui lòng thử lại.');
          return of(void 0);
        })
      );
    });
  }

  private waitCheckoutTransactionResult$(): Observable<{ resultCode: number; msg?: string }> {
    return this.zmpService.paymentDone$.pipe(
      take(1),
      timeout(30000),
      switchMap((data: any) => this.zmpService.checkTransaction$(data))
    );
  }

  private createOrderAndWaitCheckoutResult$(
    createOrderArgs: any
  ): Observable<{ resultCode: number; msg?: string }> {
    return new Observable<{ resultCode: number; msg?: string }>((subscriber) => {
      let fallbackTxnData: any = null;

      const runFallbackCheck = () => {
        if (!fallbackTxnData) {
          subscriber.error(new Error('Không nhận được dữ liệu giao dịch để kiểm tra trạng thái thanh toán.'));
          return;
        }

        const raw = String(fallbackTxnData || '').trim();
        const rawParts = raw.split('_').filter(Boolean);

        const candidates: any[] = [
          raw,
          { orderId: raw },
          { transId: raw },
        ];

        if (rawParts.length >= 2) {
          candidates.push({ orderId: rawParts[0] });
          candidates.push({ transId: rawParts[1] });
          candidates.push({ orderId: rawParts[0], transId: rawParts[1] });
        }

        const tryNext = (idx: number) => {
          if (idx >= candidates.length) {
            subscriber.error(new Error('Fallback checkTransaction thất bại với mọi định dạng dữ liệu.'));
            return;
          }

          const candidate = candidates[idx];
          this.zmpService.checkTransaction$(candidate).pipe(take(1)).subscribe({
            next: (result: any) => {
              if (result?.err === -2103) {
                tryNext(idx + 1);
                return;
              }
              subscriber.next(result);
              subscriber.complete();
            },
            error: (err) => {
              tryNext(idx + 1);
            }
          });
        };

        tryNext(0);
      };

      const paymentResultSub = this.waitCheckoutTransactionResult$().subscribe({
        next: (result) => {
          subscriber.next(result);
        },
        error: (err) => {
          if (err?.name === 'TimeoutError') {
            runFallbackCheck();
            return;
          }
          subscriber.error(err);
        },
        complete: () => subscriber.complete(),
      });

      Payment.createOrder(createOrderArgs)
        .then((co: any) => {
          fallbackTxnData = co?.orderId ?? co?.data ?? null;
          if (co?.messageToken) {
            this.messageToken = co.messageToken;
          }
        })
        .catch((err: any) => {
          paymentResultSub.unsubscribe();
          subscriber.error(err);
        });

      return () => paymentResultSub.unsubscribe();
    });
  }

  private mapCheckoutErrorMessage(result?: { resultCode?: number; msg?: string }): string {
    switch (result?.resultCode) {
      case 0:
        return 'Giao dịch đang chờ xử lý. Vui lòng kiểm tra lại trạng thái đơn hàng.';
      case -2:
        return 'Bạn chưa chọn phương thức thanh toán hoặc đã thoát màn hình thanh toán.';
      case -1:
        return result?.msg || 'Thanh toán thất bại. Vui lòng thử lại.';
      default:
        return result?.msg || 'Đã xảy ra lỗi khi xác nhận kết quả thanh toán.';
    }
  }

  private getApiErrorMessage(res: any): string {
    if (typeof res?.messages === 'string') return res.messages;
    if (Array.isArray(res?.messages) && res.messages.length) return res.messages[0];
    if (res?.messages && typeof res.messages === 'object') {
      const first = Object.values(res.messages)[0];
      if (first) return String(first);
    }
    return res?.data?.message || 'Không thể đặt hàng. Vui lòng thử lại.';
  }

  private mergeOrderIdIntoDraft(
    base: { amount: number; item: any[]; desc: string; extradata: any },
    orderId: string | number
  ) {
    const orderIdStr = String(orderId);

    return {
      ...base,
      desc: `${base.desc} #${orderIdStr}`,
      extradata: {
        // ...(base.extradata || {}),
        orderId: orderIdStr
      }
    };
  }

  private mapOrderProduct(product: IOrderProduct): ISaveOrderV2Params['products'][number] {
    const promoSnapshot = this.cart.getCheckoutPromoSnapshot();
    const productDiscount = promoSnapshot?.discount?.products?.[String(product.id)];
    const attribute = Object.fromEntries(
      Object.entries(product.attribute ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== '')
    );

    return {
      id: Number(product.id),
      name: product.name || '',
      avatar: product.avatar || undefined,
      quantity: castFloat(product.quantity) || 0,
      price: castFloat(product.price) || 0,
      promotionRuleDiscounts: product.promotionRuleDiscounts || productDiscount?.promotionRuleDiscounts,
      description: product.description || undefined,
      weight: castFloat(product.weight) || undefined,
      attribute: Object.keys(attribute).length ? attribute : undefined,
      gifts: this.mapProductGifts(product),
    };
  }

  private mapProductGifts(product: IOrderProduct): ISaveOrderV2ProductGift[] | undefined {
    const storedSelections = this.cart.getGiftSelections() ?? {};
    const selectedGifts = storedSelections[`product_${product.id}`] ?? [];
    const gifts = [
      ...(product.gifts ?? []),
      ...selectedGifts,
    ];

    const mapped = gifts
      .map((gift: any): ISaveOrderV2ProductGift | null => {
        const productId = Number(gift.productId ?? gift.id ?? 0);
        const quantity = castFloat(gift.quantity) || 0;
        if (!productId || !quantity) return null;

        return {
          productId,
          productName: gift.productName ?? gift.name,
          quantity,
          price: gift.price !== undefined ? castFloat(gift.price) : undefined,
          promotionId: gift.promotionId !== undefined ? Number(gift.promotionId) : undefined,
          ruleId: gift.ruleId !== undefined ? Number(gift.ruleId) : undefined,
          comboKey: gift.comboKey,
        };
      })
      .filter((gift): gift is ISaveOrderV2ProductGift => !!gift);

    return mapped.length ? mapped : undefined;
  }

  private mapOrderCarrier(carrier: IOrderCarrier): ISaveOrderV2Params['carrier'] {
    return {
      carrierId: Number(carrier.carrierId || 0),
      carrierShopId: carrier.carrierShopId || '',
      carrierAccountId: carrier.carrierAccountId || '',
      serviceCode: carrier.serviceCode || '',
      serviceName: carrier.serviceName || '',
      carrierName: carrier.carrierName || '',
      serviceType: carrier.serviceType !== undefined ? Number(carrier.serviceType) : undefined,
      serviceId: carrier.serviceId || '',
      shipFee: castFloat(carrier.shipFee) || castFloat(carrier.customerShipFee) || 0,
      customerShipFee: castFloat(carrier.customerShipFee) || 0,
      codFee: castFloat(carrier.codFee) || undefined,
      isRequiredInsurance: Number(carrier.isRequiredInsurance || 0),
      declaredFee: castFloat(carrier.declaredFee) || 0,
      declaredValue: castFloat(carrier.declaredValue) || 0,
    };
  }

  private validatePayload(p: ISaveOrderV2Params): string[] {
    const e: string[] = [];
    if (!p.customer?.name?.trim()) e.push('Vui lòng nhập tên người nhận.');
    if (!p.customer?.mobile?.trim()) e.push('Vui lòng nhập số điện thoại.');
    if (!p.customer?.address?.trim()) e.push('Vui lòng nhập địa chỉ.');
    if (!this.selectedMethodSub.value) e.push('Vui lòng chọn phương thức thanh toán.');

    if (!(p.customer?.provinceId > 0) || !(p.customer?.districtId > 0) || !(p.customer?.wardId > 0)) {
      e.push('Vui lòng chọn đủ Tỉnh/Quận/Phường.');
    }

    if (!Array.isArray(p.products) || p.products.length === 0) {
      e.push('Chưa có sản phẩm để đặt hàng.');
    }
    if (!(p.payment.totalOrderAmount > 0)) {
      e.push('Tổng tiền đơn hàng không hợp lệ.');
    }
    if (!(Number(p.carrier?.serviceId || 0) >= 0)) {
      // Nếu bắt buộc chọn hãng vận chuyển thì sửa điều kiện này thành > 0
    }

    return e;
  }

  /** Logic ZMP */
  setPaymentMethod(res: { method: string; isCustom?: boolean }) {
    const p = structuredClone(this.snapshot);
    p.payment.paymentMethod = res?.method ?? '';
    this.payloadSub.next(p);
  }

  /** Create order draft */
  private buildCreateOrderDraft() {
    const p = this.payloadSub.value as ISaveOrderV2Params;
    if (!p) throw new Error('Thiếu payload');

    // Tổng thanh toán cho createOrder
    const amount = Number(p.payment.totalOrderAmount);

    // item gửi lên SDK
    const item = (p.products || []).map(pr => ({
      id: String(pr.id),
      amount: Number(pr.price || 0) * Number(pr.quantity || 0),
    }));

    // const desc = (o.description || '').trim() || 'Thanh toán đơn hàng';

    const desc = `Thanh toán đơn hàng`;

    const extradata = {
      // subtotal: Number(o.totalOrderAmount || 0),
      // shippingFee: Number(o?.carrier?.customerShipFee || 0),
      // orderHint: 'internal fields if any',
      // loc: {
      //   cityId: p.location?.cityId ?? 0,
      //   districtId: p.location?.districtId ?? 0,
      //   wardId: p.location?.wardId ?? 0,
      // }
    };

    return {amount, item, desc, extradata};
  }

  private sendOrderMiniAppMessage(orderId: string, amount: number): void {
    if (!this.messageToken) return;

    this.zmpService.getUserId$().pipe(
      take(1),
      catchError(() => of('guest')),
      map(uid => String(uid || 'guest')),

      // switchMap((userId) =>
      //   this.userApi.sendMessageZma({
      //     messageToken: this.messageToken!,
      //     orderCode: orderId,
      //     amount: Number(amount),
      //     userId,
      //   })
      // ),
    )
      .subscribe({
        next: () => {
          console.log('[ZMA] sendMessageZma success');
        },
        error: (err) => {
          console.error('[ZMA] sendMessageZma error', err);
        },
      });
  }

  /** Gọi server ký HMAC cho draft */
  private signDraftOnServer$(
    draft: { totalAmount: number; item: any; desc: string; extradata: any; },
    method: string = 'BANK_SANDBOX'
  ) {
    const params: IPaymentHMACParams = {
      totalAmount: draft.totalAmount,
      item: draft.item,
      desc: draft.desc,
      extradata: draft.extradata,
      method
    };

    return this.orderApi.hmacOrder(params).pipe(
      map((res) => {
        const ok = !!res && res.code === 1;
        if (!ok) throw new Error(res?.data?.message || 'Không nhận được MAC từ server');

        const data = res.data || {};
        const mac = data[0];
        if (!mac) throw new Error('Thiếu mã MAC từ server');

        const item = (data.item !== undefined) ? data.item : draft.item;
        const extradata = (data.extradata !== undefined) ? data.extradata : draft.extradata;

        return {...draft, mac, item, extradata};
      })
    );
  }

  private fmtVND(n: number): string {
    const s = this.formatNumberI18n.transform(Number.isFinite(n) ? n : 0) ?? '0';
    return `${s} đ`;
  }

  applyCarrier(selected: Partial<IOrderCarrier> & Partial<IResCalculateFee>): void {
    if (!selected) return;

    const carrierUi: IOrderCarrier = {
      carrierId: Number(selected.carrierId ?? 0),
      carrierName: selected.carrierName ?? '',
      id: Number(selected.id ?? selected.carrierId ?? 0),
      carrierShopId: String(selected.carrierShopId ?? ''),
      carrierAccountId: String(selected.carrierAccountId ?? ''),
      isRequiredInsurance: Number(selected.isRequiredInsurance ?? 0),

      logo: selected.logo ?? '',
      serviceId: Number(selected.serviceId ?? 0),
      serviceName: selected.serviceName ?? '',
      serviceCode: selected.serviceCode ?? '',
      serviceDesc: selected.serviceDesc ?? selected.serviceDescription ?? '',

      declaredFee: castFloat(selected.declaredFee) || 0,
      customerShipFee: castFloat(selected.customerShipFee) || 0
    };

    this.selectedCarrierUiSub.next(carrierUi);
    this.setCarrier(this.mapOrderCarrier(carrierUi));
  }
}
