import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppCommonComponent } from '@shared/components/app-common.service';
import { uriFeConst } from '@shared/constants';
import { ICartData, ICartItem } from '@shared/models/feature-specific';
import { IPromotionEvaluateData } from '@shared/models/api';
import { CartManageService } from '@shared/services/global/cart/cart-manage.service';
import { CheckoutManageService } from '@shared/services/global';
import { PromotionEvaluateService } from '@shared/services/feature-specific';
import { NotifyService } from '@core/services';
import { openChat } from 'zmp-sdk/apis';
import { environment } from '../../../../environments';

// export interface IGift {
//   productId: number;
//   name: string;
//   image: string;
//   quantity: number;
// }
//
// export interface IGiftProgram {
//   programId: number;
//   label: string;
//   type: 'single' | 'combo';
//   relatedProductIds: number[];
//   gifts: IGift[];
//   selectedGiftId: number | null;
//   maxSelect: number;
// }

@Component({
  selector: 'app-cart',
  templateUrl: './cart-component.html',
  styleUrls: ['./cart-component.scss'],
  standalone: false,
})
export class CartComponent extends AppCommonComponent implements OnInit, OnDestroy {

  cartData!: ICartData;

  // ── State ─────────────────────────────────────────────────────────────────
  selectedIds = new Set<number>();

  // Swipe
  swipedItemId: number | null = null;
  private touchStartX = 0;
  private touchCurrentX = 0;

  // Confirm modal
  showDeleteConfirm = false;
  // deleteMode: 'one' | 'all' = 'one';
  deleteMode: 'one' | 'selected' | 'all' = 'one';
  private itemToDelete: ICartItem | null = null;

  // Promotion
  showPromotionDetail = false;
  promoResult: IPromotionEvaluateData | null = null;

  private destroy$ = new Subject<void>();

  protected readonly uriFeConst = uriFeConst;

  constructor(
    private cd: ChangeDetectorRef,
    private router: Router,
    private cartService: CartManageService,
    private promoService: PromotionEvaluateService,
    override notifyService: NotifyService,
  ) {
    super();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cartService.handlerLoadData();
    this.cartService.restoreStashedItemsToCart();
    this.cartData = this.cartService.getCartData();

    if (this.shouldRedirectHomeAfterOrder()) {
      sessionStorage.removeItem(CheckoutManageService.REDIRECT_HOME_AFTER_ORDER_FLAG);
      this.router.navigate([uriFeConst.home], {replaceUrl: true});
      return;
    }

    this.setHeader({ variant: 'title', show: true, back: true, title: 'Giỏ hàng' });
    this.setFooter({ variant: 'tabs', show: false, className: 'footer' });

    this.promoService.result$.pipe(takeUntil(this.destroy$)).subscribe(result => {
      this.promoResult = result;
      this.cd.markForCheck();
    });

    this.promoService.debouncedResult$.pipe(takeUntil(this.destroy$)).subscribe();

    this.evaluatePromotion();
  }

  private shouldRedirectHomeAfterOrder(): boolean {
    const shouldRedirect = sessionStorage.getItem(CheckoutManageService.REDIRECT_HOME_AFTER_ORDER_FLAG) === '1';
    return shouldRedirect && Object.keys(this.cartData?.items ?? {}).length === 0;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  get itemsCart(): ICartItem[] {
    return Object.values(this.cartData?.items ?? {});
  }

  get isAllSelected(): boolean {
    const items = this.itemsCart;
    return items.length > 0 && items.every(i => this.selectedIds.has(i.productId));
  }

  get isIndeterminate(): boolean {
    return this.selectedIds.size > 0 && !this.isAllSelected;
  }

  get totalSelected(): number {
    return this.selectedIds.size;
  }

  get subtotal(): number {
    return this.itemsCart
      .filter(item => this.selectedIds.has(item.productId))
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get totalDiscount(): number {
    return this.promoResult?.discount?.totalDiscountAmount ?? 0;
  }

  get totalPrice(): number {
    return Math.max(0, this.subtotal - this.totalDiscount);
  }

  // ── Select ─────────────────────────────────────────────────────────────────
  toggleSelect(productId: number): void {
    const next = new Set(this.selectedIds);
    next.has(productId) ? next.delete(productId) : next.add(productId);
    this.selectedIds = next;
    this.evaluatePromotion();
    this.cd.markForCheck();
  }

  toggleSelectAll(): void {
    if (this.isAllSelected) {
      this.selectedIds = new Set();
    } else {
      this.selectedIds = new Set(this.itemsCart.map(item => item.productId));
    }
    this.evaluatePromotion();
    this.cd.markForCheck();
  }

  // ── Swipe ─────────────────────────────────────────────────────────────────
  onTouchStart(e: TouchEvent, productId: number): void {
    this.touchStartX = e.touches[0].clientX;
    this.touchCurrentX = this.touchStartX;
    if (this.swipedItemId !== productId) {
      this.swipedItemId = null;
    }
  }

  onTouchMove(e: TouchEvent, productId: number): void {
    this.touchCurrentX = e.touches[0].clientX;
    const diff = this.touchStartX - this.touchCurrentX;
    if (diff > 10) {
      this.swipedItemId = productId;
    } else if (diff < -10) {
      this.swipedItemId = null;
    }
  }

  onTouchEnd(): void {
    // reset nếu chưa kéo đủ đã xử lý trong onTouchMove
  }

  closeSwipe(): void {
    this.swipedItemId = null;
  }

  // ── Quantity ──────────────────────────────────────────────────────────────
  onQuantityChange(item: ICartItem, delta: number): void {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    this.cartService.updateCartItemQuantity(item.productId, newQty);
    this.cartData = this.cartService.getCartData();
    this.evaluatePromotion();
    this.cd.markForCheck();
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  onDeleteSelected(): void {
    if (!this.selectedIds.size) return;
    // this.deleteMode = 'all';
    this.deleteMode = this.isAllSelected ? 'all' : 'selected';
    this.showDeleteConfirm = true;
  }

  onRemoveProduct(item: ICartItem): void {
    if (!item?.productId) return;
    this.itemToDelete = item;
    this.deleteMode = 'one';
    this.showDeleteConfirm = true;
    this.swipedItemId = null;
  }

  confirmDelete(): void {
    if (this.deleteMode === 'one' && this.itemToDelete) {
      this.cartService.onRemoveCartItem(this.itemToDelete);
      const next = new Set(this.selectedIds);
      next.delete(this.itemToDelete.productId);
      this.selectedIds = next;
    } else {
      this.itemsCart
        .filter(i => this.selectedIds.has(i.productId))
        .forEach(i => this.cartService.onRemoveCartItem(i));
      this.selectedIds = new Set();
    }
    this.cartData = this.cartService.getCartData();
    this.itemToDelete = null;
    this.showDeleteConfirm = false;
    this.notifyService.success('Đã xoá sản phẩm thành công.');
    this.cd.markForCheck();
  }

  // // ── Gift ──────────────────────────────────────────────────────────────────
  // getSelectedGifts(program: IGiftProgram): IGift[] {
  //   return program.gifts.filter(g => g.productId === program.selectedGiftId);
  // }
  //
  // shouldShowComboGift(_item: ICartItem): IGiftProgram | null {
  //   return null;
  // }
  //
  // goToGiftList(program: IGiftProgram, productId: number | null): void {
  //   console.log('Navigate to gift list', program, productId);
  // }

  // ── Promotion ──────────────────────────────────────────────────────────────
  private evaluatePromotion(): void {
    const selected = this.itemsCart.filter(i => this.selectedIds.has(i.productId));
    const items = selected.map(i => ({
      productId: i.productId,
      price: i.price,
      quantity: i.quantity,
    }));
    this.promoService.evaluate(items);
  }

  // ── Format ────────────────────────────────────────────────────────────────
  formatPrice(price: number): string {
    return (price ?? 0).toLocaleString('vi-VN') + ' VND';
  }

  onBuyNow(): void {
    if (!this.selectedIds.size) return;

    const ok = this.cartService.stashUncheckedForCheckout([...this.selectedIds]);
    if (!ok) return;

    this.router.navigate([this.uriFeConst.checkout.index]);
  }

  // ── Promotion modal ───────────────────────────────────────────────────────
  goToProductDetail(productId: number): void {
    if (!productId) return;
    this.router.navigate([this.uriFeConst.product.detail], { queryParams: { id: productId } });
  }

  openPromotionDetail(): void {
    this.showPromotionDetail = true;
  }

  async onOpenSupportChat(): Promise<void> {
    const oaId = environment.OAId;
    if (!oaId) {
      this.notifyService.warning('Có lỗi xảy ra');
      return;
    }

    try {
      await openChat({
        type: 'oa',
        id: oaId,
      });
    } catch (error) {
      this.notifyService.error('Không thể mở chat hỗ trợ, vui lòng thử lại');
    }
  }
}
