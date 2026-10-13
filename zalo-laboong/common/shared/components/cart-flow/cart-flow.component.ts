import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppCommonComponent } from '@shared/components/app-common.service';
import { uriFeConst } from '@shared/constants';
import { ICartItem } from '@shared/models/feature-specific';
import { IPromotionEvaluateData, IGiftItem, IGiftRule } from '@shared/models/api';
import { productImageThumbPath } from '@shared/utils';
import { IFooterCartConfig } from '@shared/models/global';
import { CartManageService } from '@shared/services/global/cart/cart-manage.service';
import { PromotionEvaluateService } from '@shared/services/feature-specific';
import { AnalyticsService, NotifyService } from '@core/services';
import { ENVIRONMENT, IEnvironment } from '@core/tokens/environment.token';
import { openChat } from 'zmp-sdk/apis';
import {
  FlowScreen,
  GiftPickerMode,
  ICartFlowItem,
  IGiftDisplayChoice,
  IGiftDisplayProduct,
  IGiftSelectionContext,
  IPromotionDetailDisplay,
  ScreenTransition,
} from './cart-flow.models';

@Component({
  selector: 'app-cart-flow',
  standalone: false,
  templateUrl: './cart-flow.component.html',
  styleUrls: ['./cart-flow.component.scss'],
})
export class CartFlowComponent extends AppCommonComponent implements OnInit, OnDestroy {
  screen: FlowScreen = 'cart';
  screenTransition: ScreenTransition = null;
  giftMode: GiftPickerMode = 'single';

  cartFlowItems: ICartFlowItem[] = [];
  orderGifts: IGiftDisplayProduct[] = [];
  currentGiftChoices: IGiftDisplayChoice[] = [];
  giftMaxSelections = 1;
  promotionDetail: IPromotionDetailDisplay | null = null;

  private giftContext: IGiftSelectionContext = { target: 'bill' };
  private productGiftChoicesMap: Record<number, IGiftDisplayChoice[]> = {};
  private billGiftChoices: IGiftDisplayChoice[] = [];

  swipedProductId: number | null = null;
  showDeleteConfirm = false;
  deleteConfirmClosing = false;
  deleteConfirmText = '';
  showPromotionDetail = false;
  promotionDetailClosing = false;
  appliedCouponCode: string | null = null;
  couponLoading = false;

  promoResult: IPromotionEvaluateData | null = null;

  readonly uriFeConst = uriFeConst;

  private destroy$ = new Subject<void>();
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;
  private deleteConfirmTimer: ReturnType<typeof setTimeout> | null = null;
  private promotionDetailTimer: ReturnType<typeof setTimeout> | null = null;
  private deleteMode: 'one' | 'selected' = 'one';
  private itemPendingDelete: ICartFlowItem | null = null;

  constructor(
    private cd: ChangeDetectorRef,
    private router: Router,
    private cartManageService: CartManageService,
    private promoService: PromotionEvaluateService,
    private analytics: AnalyticsService,
    override notifyService: NotifyService,
    @Inject(ENVIRONMENT) private env: IEnvironment,
  ) {
    super();
  }

  ngOnInit(): void {
    this.updateHeader();

    this.cartManageService.handlerLoadData();
    this.cartManageService.restoreStashedItemsToCart();
    this.loadCartItems();
    this.updateFooter();

    this.promoService.result$.pipe(takeUntil(this.destroy$)).subscribe(result => {
      this.promoResult = result;
      this.couponLoading = false;
      this.buildPromotionDetail(result);
      this.buildGiftChoices(result);
      this.updateFooter();
      this.cd.markForCheck();
    });

    this.promoService.debouncedResult$.pipe(takeUntil(this.destroy$)).subscribe();

    this.triggerEvaluate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.setFooter({ variant: 'tabs', show: false, className: 'footer' });
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    if (this.deleteConfirmTimer) clearTimeout(this.deleteConfirmTimer);
    if (this.promotionDetailTimer) clearTimeout(this.promotionDetailTimer);
  }

  // ── Computed ────────────────────────────────────────────���─────────────────

  headerTitle(): string {
    if (this.screen === 'gift-picker') return 'Danh sách quà tặng';
    if (this.screen === 'voucher-picker') return 'Chọn voucher';
    return 'Giỏ hàng';
  }

  get isAllSelected(): boolean {
    return this.cartFlowItems.length > 0 && this.cartFlowItems.every(i => i.checked);
  }

  get hasSelectedItems(): boolean {
    return this.cartFlowItems.some(i => i.checked);
  }

  get selectedCount(): number {
    return this.cartFlowItems.filter(i => i.checked).length;
  }

  get subtotal(): number {
    return this.cartFlowItems
      .filter(i => i.checked)
      .reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  get totalDiscount(): number {
    return this.promoResult?.discount?.totalDiscountAmount ?? 0;
  }

  get couponDiscount(): number {
    return this.promoResult?.coupon?.amount ?? 0;
  }

  get totalPrice(): number {
    return Math.max(0, this.subtotal - this.totalDiscount - this.couponDiscount);
  }

  get hasBillGifts(): boolean {
    return this.billGiftChoices.length > 0;
  }

  get appliedVoucherText(): string {
    if (this.appliedCouponCode && this.promoResult?.coupon?.status === 1 && this.promoResult.coupon.amount) {
      return 'Giảm ' + this.promoResult.coupon.amount.toLocaleString('vi-VN') + ' VND';
    }
    return 'Chọn';
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  back(): void {
    if (this.screen === 'gift-picker' || this.screen === 'voucher-picker') {
      this.goToScreen('cart', 'back');
      return;
    }
    this.headerFooterFacade.back();
  }

  openProductGiftPicker(productId: number): void {
    this.closeSwipe();
    this.giftContext = { target: 'product', productId };
    const choices = this.productGiftChoicesMap[productId] ?? [];
    this.currentGiftChoices = choices.map(c => ({ ...c }));
    this.giftMode = 'single';
    this.giftMaxSelections = 1;
    this.goToScreen('gift-picker', 'forward');
  }

  openBillGiftPicker(): void {
    this.closeSwipe();
    this.giftContext = { target: 'bill' };
    this.currentGiftChoices = this.billGiftChoices.map(c => ({ ...c }));
    this.giftMode = 'single';
    this.giftMaxSelections = 1;
    this.goToScreen('gift-picker', 'forward');
  }

  openBillGiftPickerFromEvent(event: Event): void {
    this.consumeInteraction(event);
    this.openBillGiftPicker();
  }

  stopClickPropagation(event: Event): void {
    event.stopPropagation();
  }

  openVoucherPicker(): void {
    this.closeSwipe();
    this.goToScreen('voucher-picker', 'forward');
  }

  // ── Cart item actions ─────────────────────────────────────────────────────

  toggleCartItem(item: ICartFlowItem): void {
    this.closeSwipe();
    item.checked = !item.checked;
    this.triggerEvaluate();
    this.updateFooter();
    this.cd.markForCheck();
  }

  toggleAllCartItems(): void {
    const next = !this.isAllSelected;
    this.cartFlowItems = this.cartFlowItems.map(i => ({ ...i, checked: next }));
    this.triggerEvaluate();
    this.updateFooter();
    this.cd.markForCheck();
  }

  onQuantityChange(item: ICartFlowItem, delta: number): void {
    this.closeSwipe();
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    this.cartManageService.updateCartItemQuantity(item.productId, newQty);
    this.loadCartItems();
    this.triggerEvaluate();
    this.updateFooter();
    this.cd.markForCheck();
  }

  // ── Swipe ───────────────────────────────────────────────────────���─────────

  onSwipeOpen(productId: number): void {
    this.swipedProductId = productId;
  }

  closeSwipe(): void {
    this.swipedProductId = null;
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  requestDeleteItem(item: ICartFlowItem): void {
    this.deleteMode = 'one';
    this.itemPendingDelete = item;
    this.deleteConfirmText = 'Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?';
    this.openDeleteConfirm();
    this.closeSwipe();
  }

  requestDeleteSelected(): void {
    if (!this.hasSelectedItems) return;
    this.deleteMode = 'selected';
    this.itemPendingDelete = null;
    this.deleteConfirmText = this.isAllSelected
      ? 'Bạn có chắc chắn muốn xóa tất cả sản phẩm khỏi giỏ hàng?'
      : 'Bạn có chắc chắn muốn xóa các sản phẩm đã chọn khỏi giỏ hàng?';
    this.openDeleteConfirm();
    this.closeSwipe();
  }

  onConfirmDelete(): void {
    if (this.deleteConfirmClosing) return;

    if (this.deleteMode === 'one' && this.itemPendingDelete) {
      this.cartManageService.onRemoveCartItem(this.itemPendingDelete as ICartItem);
    } else {
      this.cartFlowItems
        .filter(i => i.checked)
        .forEach(i => this.cartManageService.onRemoveCartItem(i as ICartItem));
    }

    this.loadCartItems();
    this.triggerEvaluate();
    this.closeDeleteConfirm();
    this.updateFooter();
    this.notifyService.success('Đã xoá sản phẩm thành công.');
    this.cd.markForCheck();
  }

  onCancelDelete(): void {
    this.closeDeleteConfirm();
  }

  // ── Promotion detail ──────────────────────────────────────────────────────

  openPromotionDetail(): void {
    if (this.showPromotionDetail && !this.promotionDetailClosing) {
      this.closePromotionDetail();
      return;
    }
    this.closeSwipe();
    if (this.promotionDetailTimer) {
      clearTimeout(this.promotionDetailTimer);
      this.promotionDetailTimer = null;
    }
    this.promotionDetailClosing = false;
    this.showPromotionDetail = true;
    this.updateFooter();
  }

  closePromotionDetail(): void {
    if (!this.showPromotionDetail || this.promotionDetailClosing) return;
    this.promotionDetailClosing = true;
    this.updateFooter();
    if (this.promotionDetailTimer) clearTimeout(this.promotionDetailTimer);
    this.promotionDetailTimer = setTimeout(() => {
      this.showPromotionDetail = false;
      this.promotionDetailClosing = false;
      this.promotionDetailTimer = null;
      this.updateFooter();
      this.cd.markForCheck();
    }, 220);
  }

  // ── Voucher ───────────────────────────────────────────────────────────────

  onApplyCoupon(code: string): void {
    this.couponLoading = true;
    this.appliedCouponCode = code;
    this.triggerEvaluate();
    this.updateFooter();
  }

  onVoucherComplete(code: string | null): void {
    this.appliedCouponCode = code;
    this.triggerEvaluate();
    this.goToScreen('cart', 'back');
  }

  // ── Gift picker ───────────────────────────────────────────────────────────

  onGiftComplete(selected: IGiftDisplayChoice[]): void {
    const selectedProducts = selected.flatMap(c => c.products);

    if (this.giftContext.target === 'product' && this.giftContext.productId) {
      const item = this.cartFlowItems.find(i => i.productId === this.giftContext.productId);
      if (item) {
        item.selectedGifts = selectedProducts;
      }
      this.updateProductGiftSelections(this.giftContext.productId, selected);
    } else {
      this.orderGifts = selectedProducts;
      this.updateBillGiftSelections(selected);
    }

    this.persistGiftSelections();
    this.goToScreen('cart', 'back');
  }

  // ── Checkout ─────────────────────────��────────────────────────────────────

  onBuyNow(): void {
    const selected = this.cartFlowItems.filter(i => i.checked);
    if (!selected.length) return;

    const missingProductGifts = selected.filter(
      i => i.hasGiftEntry && !i.selectedGifts.length,
    );
    if (missingProductGifts.length) {
      this.notifyService.warning('Vui lòng chọn quà tặng cho sản phẩm trước khi đặt hàng');
      return;
    }

    if (this.hasBillGifts && !this.orderGifts.length) {
      this.notifyService.warning('Vui lòng chọn quà tặng trước khi đặt hàng');
      return;
    }

    this.persistGiftSelections();

    const selectedIds = selected.map(i => i.productId);
    const ok = this.cartManageService.stashUncheckedForCheckout(selectedIds);
    if (!ok) return;

    this.cartManageService.setCheckoutPromoSnapshot(this.promoResult);
    // GA4 ecommerce: user đã chọn sản phẩm và bắt đầu đi tới màn thanh toán.
    this.analytics.trackEvent('begin_checkout', {
      currency: 'VND',
      value: selected.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
      items: selected.map(item => ({
        item_id: String(item.productId),
        item_name: item.name || '',
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 0),
      })),
    });
    this.router.navigate([this.uriFeConst.checkout.index]);
  }

  async onOpenSupportChat(): Promise<void> {
    const oaId = this.env.OAId;
    if (!oaId) {
      this.notifyService.warning('Có lỗi xảy ra');
      return;
    }
    try {
      await openChat({ type: 'oa', id: oaId });
    } catch {
      this.notifyService.error('Không thể mở chat hỗ trợ, vui lòng thử lại');
    }
  }

  // ── Helpers ─────────────────────────────────��─────────────────────────────

  formatPrice(price: number): string {
    return (price ?? 0).toLocaleString('vi-VN') + ' VND';
  }

  private loadCartItems(): void {
    const cartData = this.cartManageService.getCartData();
    const prevChecked = new Set(this.cartFlowItems.filter(i => i.checked).map(i => i.productId));
    const prevGifts = new Map(this.cartFlowItems.map(i => [i.productId, i.selectedGifts]));
    const hadItems = this.cartFlowItems.length > 0;

    this.cartFlowItems = Object.values(cartData?.items ?? {}).map(item => ({
      ...item,
      checked: hadItems ? prevChecked.has(item.productId) : true,
      hasGiftEntry: false,
      selectedGifts: prevGifts.get(item.productId) ?? [],
    }));
  }

  private triggerEvaluate(): void {
    const checkedItems = this.cartFlowItems.filter(i => i.checked);
    const evalItems = checkedItems.map(i => ({
      productId: i.productId,
      price: i.price,
      quantity: i.quantity,
    }));
    this.promoService.evaluate(evalItems, this.appliedCouponCode ?? undefined);
  }

  private buildPromotionDetail(result: IPromotionEvaluateData | null): void {
    if (!result) {
      this.promotionDetail = null;
      return;
    }
    const subtotal = this.subtotal;
    const productDiscount = result.discount?.totalDiscountAmount ?? 0;
    const voucherDiscount = result.coupon?.amount ?? 0;
    const saving = productDiscount + voucherDiscount;
    this.promotionDetail = {
      subtotal,
      productDiscount,
      voucherDiscount,
      saving,
      grandTotal: Math.max(0, subtotal - saving),
      promotionNames: (result.discount?.promotions ?? []).map(p => p.name),
    };
  }

  private buildGiftChoices(result: IPromotionEvaluateData | null): void {
    if (!result?.gifts) {
      this.cartFlowItems.forEach(i => (i.hasGiftEntry = false));
      this.productGiftChoicesMap = {};
      this.billGiftChoices = [];
      this.currentGiftChoices = [];
      return;
    }

    const gifts = result.gifts;

    // Build bill-level choices
    this.billGiftChoices = [];
    if (gifts.bill?.applied) {
      for (const applied of gifts.bill.applied) {
        for (const rule of applied.rules) {
          this.billGiftChoices.push(...this.mapRuleToChoices(rule));
        }
      }
    }

    // Build per-product choices
    this.productGiftChoicesMap = {};
    for (const item of this.cartFlowItems) {
      const productGift = gifts.products?.[item.productId];
      item.hasGiftEntry = !!(productGift?.applied?.length);

      if (item.hasGiftEntry && productGift) {
        const choices: IGiftDisplayChoice[] = [];
        for (const applied of productGift.applied) {
          for (const rule of applied.rules) {
            choices.push(...this.mapRuleToChoices(rule));
          }
        }
        this.productGiftChoicesMap[item.productId] = choices;
      }
    }

  }

  private mapRuleToChoices(rule: IGiftRule): IGiftDisplayChoice[] {
    const choices: IGiftDisplayChoice[] = [];

    for (const gi of rule.giftItems ?? []) {
      choices.push({
        id: `${rule.ruleId}-item-${gi.productId}`,
        ruleId: rule.ruleId,
        type: 'single',
        products: [{
          productId: gi.productId,
          name: gi.name,
          image: this.giftImage(gi),
          quantity: gi.quantity,
          price: gi.price,
          priceOld: 0,
        }],
        selected: false,
        disabled: false,
      });
    }

    for (const gc of rule.giftCombos ?? []) {
      choices.push({
        id: `${rule.ruleId}-combo-${gc.comboKey}`,
        ruleId: rule.ruleId,
        type: 'combo',
        title: gc.label ?? 'Quà tặng combo',
        products: gc.items.map(i => ({
          productId: i.productId,
          name: i.name,
          image: this.giftImage(i),
          quantity: i.quantity,
          price: i.price,
          priceOld: 0,
        })),
        selected: false,
        disabled: false,
      });
    }

    return choices;
  }

  private giftImage(gift: IGiftItem): string {
    const raw = gift as IGiftItem & {
      image?: string;
      imageUrl?: string;
      imageThumb?: string | { id?: number; path?: string | null } | null;
      thumbnail?: string;
      thumbnailUrl?: string;
    };

    return raw.image
      || raw.imageUrl
      || productImageThumbPath(raw.imageThumb as any)
      || raw.thumbnail
      || raw.thumbnailUrl
      || 'assets/img/no-image.png';
  }

  private updateProductGiftSelections(productId: number, selected: IGiftDisplayChoice[]): void {
    const choices = this.productGiftChoicesMap[productId];
    if (!choices) return;
    const selectedIds = new Set(selected.map(s => s.id));
    for (const choice of choices) {
      choice.selected = selectedIds.has(choice.id);
    }
  }

  private updateBillGiftSelections(selected: IGiftDisplayChoice[]): void {
    const selectedIds = new Set(selected.map(s => s.id));
    for (const choice of this.billGiftChoices) {
      choice.selected = selectedIds.has(choice.id);
    }
  }

  private persistGiftSelections(): void {
    const selections: Record<string, IGiftDisplayProduct[]> = {};

    // Product-level selections
    for (const item of this.cartFlowItems) {
      if (item.selectedGifts.length) {
        selections[`product_${item.productId}`] = item.selectedGifts;
      }
    }

    // Bill-level selections
    if (this.orderGifts.length) {
      selections['bill'] = this.orderGifts;
    }

    this.cartManageService.setGiftSelections(selections);
  }

  private goToScreen(screen: FlowScreen, direction: ScreenTransition): void {
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    this.screenTransition = direction;
    this.screen = screen;
    this.updateHeader();
    this.updateFooter();
    this.cd.detectChanges();
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
      title: this.headerTitle(),
      backHandler: this.screen === 'cart' ? undefined : () => this.back(),
    });
  }

  private updateFooter(): void {
    if (this.screen !== 'cart') {
      this.setFooter({ variant: 'tabs', show: false, className: 'footer' });
      return;
    }

    if (!this.cartFlowItems.length) {
      this.setFooter({ variant: 'tabs', show: true, className: 'footer' });
      return;
    }

    const footer: IFooterCartConfig = {
      variant: 'cart',
      mode: 'cart-flow',
      show: true,
      className: 'footer',
      selectedCount: this.selectedCount,
      totalPrice: this.totalPrice,
      voucherText: this.appliedVoucherText,
      promotionDetailOpen: this.showPromotionDetail,
      promotionDetailClosing: this.promotionDetailClosing,
      promotionDetail: this.promotionDetail,
      onOpenVoucher: () => this.openVoucherPicker(),
      onTogglePromotionDetail: () => this.openPromotionDetail(),
      onClosePromotionDetail: () => this.closePromotionDetail(),
      onBuyNow: () => this.onBuyNow(),
      onOpenSupportChat: () => this.onOpenSupportChat(),
    };

    this.setFooter(footer);
  }

  private openDeleteConfirm(): void {
    if (this.deleteConfirmTimer) {
      clearTimeout(this.deleteConfirmTimer);
      this.deleteConfirmTimer = null;
    }
    this.deleteConfirmClosing = false;
    this.showDeleteConfirm = true;
  }

  private closeDeleteConfirm(): void {
    if (!this.showDeleteConfirm || this.deleteConfirmClosing) return;
    this.deleteConfirmClosing = true;
    if (this.deleteConfirmTimer) clearTimeout(this.deleteConfirmTimer);
    this.deleteConfirmTimer = setTimeout(() => {
      this.showDeleteConfirm = false;
      this.deleteConfirmClosing = false;
      this.deleteConfirmText = '';
      this.itemPendingDelete = null;
      this.deleteConfirmTimer = null;
      this.cd.markForCheck();
    }, 180);
  }

  private consumeInteraction(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }
}
