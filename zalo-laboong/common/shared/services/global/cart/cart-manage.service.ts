import {Injectable, Optional} from '@angular/core';
import {ICartData, ICartItem} from '@shared/models/feature-specific';
import {IPromotionEvaluateData} from '@shared/models/api';
import {AnalyticsService, ZmaNativeStorageService, NotifyService} from '@core/services';
import {castFloat} from '@shared/utils';
import {Router} from '@angular/router';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CartManageService {
  private static readonly CART_KEY = 'cart:data';
  private static readonly CART_STASH_KEY = 'cart:checkout:stash';
  private static readonly GIFT_SELECTIONS_KEY = 'cart:gift:selections';
  private static readonly PROMO_SNAPSHOT_KEY = 'cart:promo:snapshot';
  totalQuantities: number = 0; // SLSP trong giỏ hàng
  totalAmount: number = 0; // Tổng tiền trong giỏ hàng

  private _totalQty$ = new BehaviorSubject<number>(0); // SLSP trong giỏ hàng(Bổ sung thêm)
  readonly totalQuantities$ = this._totalQty$.asObservable().pipe(distinctUntilChanged());

  // SP trong giỏ hàng
  cartData: ICartData = {
    description: '',
    totalAmount: 0,
    totalQuantities: 0,
    carrier: {
      id: 0,
      carrierName: '',
      logo: '',
      serviceId: 0,
      serviceName: '',
      serviceCode: '',
      serviceDesc: '',
      declaredFee: 0,
      customerShipFee: 0,
    },
    items: {}
  };
  // SP được chọn để checkout
  productCheckoutData: ICartData = {
    description: '',
    totalAmount: 0,
    totalQuantities: 0,
    carrier: {
      id: 0,
      carrierName: '',
      logo: '',
      serviceId: 0,
      serviceName: '',
      serviceCode: '',
      serviceDesc: '',
      declaredFee: 0,
      customerShipFee: 0,
    },
    items: {}
  };

  constructor(
    private nativeStorage: ZmaNativeStorageService,
    private analytics: AnalyticsService,
    @Optional() public active?: NgbActiveOffcanvas
  ) {
  }

  handlerLoadData() {
    this.loadCartStorage();
    this.emitTotals();
  }

  getCartData(): ICartData {
    return this.cartData;
  }

  restoreStashedItemsToCart(): void {
    const stashed = this.nativeStorage.get<ICartData | null>(CartManageService.CART_STASH_KEY, null);
    if (!stashed || typeof stashed !== 'object' || !Object.keys(stashed.items ?? {}).length) {
      return;
    }

    const merged = this.normalizeCart(this.cartData || this.createCartData());
    for (const item of Object.values(stashed.items ?? {})) {
      if (!item?.productId) continue;
      const key = String(item.productId);
      const current = merged.items[key];
      if (current) {
        merged.items[key] = {
          ...current,
          quantity: (castFloat(current.quantity) || 0) + (castFloat(item.quantity) || 0),
        };
      } else {
        merged.items[key] = { ...item, isChecked: false };
      }
    }

    this.cartData = this.normalizeCart(merged);
    this.saveCartStorage();
    this.nativeStorage.remove(CartManageService.CART_STASH_KEY);
  }

  stashUncheckedForCheckout(selectedProductIds: number[]): boolean {
    const selectedSet = new Set((selectedProductIds || []).map(Number).filter(Boolean));
    if (!selectedSet.size) return false;

    const source = this.normalizeCart(this.cartData || this.createCartData());
    const selectedItems: Record<string, ICartItem> = {};
    const stashedItems: Record<string, ICartItem> = {};

    for (const [k, item] of Object.entries(source.items ?? {})) {
      if (!item?.productId) continue;
      if (selectedSet.has(item.productId)) {
        selectedItems[k] = { ...item, isChecked: true };
      } else {
        stashedItems[k] = { ...item, isChecked: false };
      }
    }

    if (!Object.keys(selectedItems).length) return false;

    const selectedCart: ICartData = this.normalizeCart({
      ...source,
      items: selectedItems,
    });
    const stashedCart: ICartData = this.normalizeCart({
      ...source,
      items: stashedItems,
    });

    this.cartData = selectedCart;
    this.saveCartStorage();

    if (Object.keys(stashedCart.items).length) {
      this.nativeStorage.set(CartManageService.CART_STASH_KEY, stashedCart);
    } else {
      this.nativeStorage.remove(CartManageService.CART_STASH_KEY);
    }
    return true;
  }

  private emitTotals() {
    this._totalQty$.next(this.totalQuantities);
  }

  /**
   * Tính tổng tiền các sản phẩm đã chọn
   */
  reduceTotalCart(): void {
    const itemsObj = this.cartData.items ?? {};
    const items = Object.values(itemsObj);

    this.totalQuantities = items.length;

    let checkedQty = 0;
    let checkedAmount = 0;

    for (const it of items) {
      if (!it?.isChecked) continue;

      const qty = castFloat(it.quantity) || 0;
      const price = castFloat(it.price) || 0;

      checkedQty += qty;
      checkedAmount += price * qty;
    }

    this.cartData.totalQuantities = checkedQty;
    this.cartData.totalAmount = checkedAmount;

    this.totalAmount = checkedAmount;
  }

  clearCart() {
    this.cartData = {
      description: '',
      totalAmount: 0,
      totalQuantities: 0,
      carrier: {
        id: 0,
        carrierName: '',
        logo: '',
        serviceId: 0,
        serviceName: '',
        serviceCode: '',
        serviceDesc: '',
        declaredFee: 0,
        customerShipFee: 0,
      },
      items: {}
    };
    this.totalQuantities = 0;
    this.totalAmount = 0;
    this.reduceTotalCart();
    this.clearCartStorage();
  }

  // Hàm khởi tạo ICartGroup
  private createCartData(): ICartData {
    return {
      description: '',
      totalAmount: 0,
      totalQuantities: 0,
      carrier: {
        id: 0,
        carrierName: '',
        serviceId: 0,
        serviceCode: '',
        declaredFee: 0,
        customerShipFee: 0,
        logo: '',
        serviceName: '',
        serviceDesc: ''
      },
      items: {}
    };
  }

  /**
   * ---------------------------------------------------------------------------------------------------------
   * Handler cart ------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   * */

  addCartItem(item: ICartItem) {
    this.handlerLoadData(); // cần check các sp đang có trong giỏ
    if (!this.cartData) {
      this.cartData = this.createCartData();
    }
    const data = this.cartData;
    const psId = item.productId;
    // Cập nhật hoặc thêm mới item
    if (data.items[psId]) {
      data.items[psId].quantity += castFloat(item.quantity);
    } else {
      data.items[psId] = {...item};
    }

    this.saveCartStorage();
    this.reduceTotalCart();
    this.emitTotals();
    // GA4 ecommerce: ghi nhận sản phẩm được thêm vào giỏ.
    this.analytics.trackEvent('add_to_cart', {
      currency: 'VND',
      value: (castFloat(item.price) || 0) * (castFloat(item.quantity) || 0),
      items: [{
        item_id: String(item.productId),
        item_name: item.name || '',
        price: castFloat(item.price) || 0,
        quantity: castFloat(item.quantity) || 0,
      }],
    });
  }

  updateCartItemQuantity(productId: number, qty: number): void {
    if (!this.cartData) return;

    const items = this.cartData.items || {};
    const it = items[productId];
    if (!it) return;

    const nextQty = Math.max(0, castFloat(qty) || 0);

    if (nextQty <= 0) {
      delete items[productId];
    } else {
      items[productId] = {...it, quantity: nextQty};
    }

    this.cartData = {
      ...this.cartData,
      items: {...items}
    };

    this.reduceTotalCart();

    if (Object.keys(this.cartData.items).length === 0) {
      this.clearCartStorage();
    } else {
      this.saveCartStorage();
    }
  }

  onRemoveCartItem(item: ICartItem): void {
    if (!item) return;
    const items = this.cartData.items || {};
    delete items[item.productId];
    this.cartData = {
      ...this.cartData,
      items: {...items}
    };

    if (Object.keys(this.cartData.items).length === 0) {
      this.cartData.totalAmount = 0;
      this.cartData.totalQuantities = 0;
    }

    this.reduceTotalCart();
    if (Object.keys(items).length === 0) {
      this.clearCartStorage();
    } else {
      this.saveCartStorage();
    }
  }

  /**
   * Kiểm tra xem có sản phẩm nào được chọn để đặt hàng chưa
   * */
  getCheckedProductData(): ICartData {
    const src = this.cartData; // giỏ hiện tại (không group)
    if (!src) return this.productCheckoutData;

    const checkedItems = Object.fromEntries(
      Object.entries(src.items ?? {}).filter(([, it]) => !!it?.isChecked)
    );

    let totalAmount = 0;
    let totalQuantities = 0;
    for (const it of Object.values(checkedItems)) {
      const qty = castFloat(it.quantity) || 0;
      const price = castFloat(it.price) || 0;
      totalQuantities += qty;
      totalAmount += price * qty;
    }

    this.productCheckoutData = {
      ...src,
      items: checkedItems,
      totalAmount,
      totalQuantities
    };

    return this.productCheckoutData;
  }

  /**
   * ---------------------------------------------------------------------------------------------------------
   * Handler native storage ------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   * */

  // Lấy dữ liệu giỏ hàng trong storage
  loadCartStorage() {
    try {
      const saved = this.nativeStorage.get<ICartData>(CartManageService.CART_KEY, null as any);
      if (saved && typeof saved === 'object') {
        this.cartData = this.normalizeCart(saved);
      } else {
        this.cartData = this.createCartData();
      }
    } catch {
      this.cartData = this.createCartData();
    } finally {
      this.reduceTotalCart();
    }
  }

  // Lưu dữ liệu giỏ hàng vào storage
  saveCartStorage() {
    const empty = !this.cartData || Object.keys(this.cartData.items ?? {}).length === 0;
    if (empty) {
      this.clearCartStorage();
      return;
    }

    // Đảm bảo cart nhất quán trước khi lưu
    const normalized = this.normalizeCart(this.cartData);
    this.nativeStorage.set(CartManageService.CART_KEY, normalized);
    this.reduceTotalCart();
    this.emitTotals();
  }

  // Xóa dữ liệu giỏ hàng trong storage
  clearCartStorage() {
    this.nativeStorage.remove(CartManageService.CART_KEY);
    this.cartData = this.createCartData();
    this.emitTotals();
  }

  setGiftSelections(selections: Record<string, any[]>): void {
    this.nativeStorage.set(CartManageService.GIFT_SELECTIONS_KEY, selections);
  }

  getGiftSelections(): Record<string, any[]> | null {
    return this.nativeStorage.get<Record<string, any[]> | null>(
      CartManageService.GIFT_SELECTIONS_KEY,
      null,
    );
  }

  clearGiftSelections(): void {
    this.nativeStorage.remove(CartManageService.GIFT_SELECTIONS_KEY);
  }

  setCheckoutPromoSnapshot(data: IPromotionEvaluateData | null): void {
    if (data) {
      this.nativeStorage.set(CartManageService.PROMO_SNAPSHOT_KEY, data);
    } else {
      this.nativeStorage.remove(CartManageService.PROMO_SNAPSHOT_KEY);
    }
  }

  getCheckoutPromoSnapshot(): IPromotionEvaluateData | null {
    return this.nativeStorage.get<IPromotionEvaluateData | null>(
      CartManageService.PROMO_SNAPSHOT_KEY,
      null,
    );
  }

  clearCheckoutPromoSnapshot(): void {
    this.nativeStorage.remove(CartManageService.PROMO_SNAPSHOT_KEY);
  }

  private normalizeCart(src: ICartData): ICartData {
    const itemsObj = src.items ?? {};
    const normItems: Record<string, ICartItem> = {};

    for (const [k, it] of Object.entries(itemsObj)) {
      if (!it) continue;
      const qty = Math.max(0, castFloat(it.quantity) || 0);
      const price = Math.max(0, castFloat(it.price) || 0);
      const priceOld = Math.max(0, castFloat(it.priceOld) || 0);

      normItems[String(it.productId ?? k)] = {
        ...it,
        productId: it.productId ?? Number(k),
        quantity: qty,
        price,
        priceOld,
        isChecked: !!it.isChecked,
        name: it.name ?? '',
        image: it.image ?? ''
      };
    }

    return {
      description: src.description ?? '',
      totalAmount: castFloat(src.totalAmount) || 0,
      totalQuantities: castFloat(src.totalQuantities) || 0,
      carrier: {
        id: src.carrier?.id ?? 0,
        carrierName: src.carrier?.carrierName ?? '',
        logo: src.carrier?.logo ?? '',
        serviceId: src.carrier?.serviceId ?? 0,
        serviceName: src.carrier?.serviceName ?? '',
        serviceCode: src.carrier?.serviceCode ?? '',
        serviceDesc: src.carrier?.serviceDesc ?? '',
        declaredFee: castFloat(src.carrier?.declaredFee) || 0,
        customerShipFee: castFloat(src.carrier?.customerShipFee) || 0,
      },
      items: normItems
    };
  }
}
