import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {ICartData, ICartItem} from '@shared/models/feature-specific';
import {CartManageService} from '@shared/services/global';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {AppFormAddService} from '@shared/services/global/app-form-add.service';
import {IPromotionEvaluateData} from '@shared/models/api';
import {PromotionEvaluateService} from '@shared/services/feature-specific';
import {Subject} from 'rxjs';
import {filter, take, takeUntil} from 'rxjs';
import {map, tap} from 'rxjs/operators';

@Component({
  selector: 'app-cart',
  templateUrl: './cart-component.html',
  styleUrls: [`/cart-component.scss`],
  standalone: false
})

export class CartComponent extends AppCommonComponent implements OnInit, OnDestroy {
  cartData!: ICartData;
  promoResult: IPromotionEvaluateData | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    public cartService: CartManageService,
    private cd: ChangeDetectorRef,
    private appFm: AppFormAddService,
    private promoService: PromotionEvaluateService,
  ) {
    super();

  }

  ngOnInit() {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Giỏ hàng',
    });

    this.setFooter({
      variant: 'cart',
      show: true,
      className: 'cart-main',
      addLabel: 'Thêm vào giỏ',
      buyLabel: 'Mua ngay'
    });
    this.cartData = this.cartService.getCartData();

    this.promoService.result$.pipe(takeUntil(this.destroy$)).subscribe(result => {
      this.promoResult = result;
      this.cd.markForCheck();
    });

    this.promoService.debouncedResult$.pipe(takeUntil(this.destroy$)).subscribe();

    this.evaluatePromotion();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get itemsCart() {
    return Object.values(this.cartData.items ?? {});
  }

  get subtotal(): number {
    return this.itemsCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get totalDiscount(): number {
    return this.promoResult?.discount?.totalDiscountAmount ?? 0;
  }

  get totalPrice(): number {
    return Math.max(0, this.subtotal - this.totalDiscount);
  }

  onQuantityChange(item: ICartItem, qty: number) {
    this.cartService.updateCartItemQuantity(item.productId, qty);
    this.cartData = this.cartService.getCartData();
    this.evaluatePromotion();
    this.cd.markForCheck();
  }


  startX = 0;
  currentX = 0;
  threshold = 50;
  swipedItem: HTMLElement | null = null;

  onTouchStart(event: TouchEvent, item: HTMLElement) {
    this.startX = event.touches[0].clientX;
    this.swipedItem = item;
  }

  onTouchMove(event: TouchEvent) {
    if (!this.swipedItem) return;
    this.currentX = event.touches[0].clientX;

    const diff = this.startX - this.currentX;

    if (diff > this.threshold) {
      this.swipedItem.classList.add('open');
    }
    else if (diff < -this.threshold) {
      this.swipedItem.classList.remove('open');
    }
  }

  onTouchEnd() {
    this.swipedItem = null;
  }

  private evaluatePromotion(): void {
    const items = this.itemsCart.map(i => ({
      productId: i.productId,
      price: i.price,
      quantity: i.quantity,
    }));
    this.promoService.evaluate(items);
  }

  onRemoveProduct(item: ICartItem) {
    if (!item.productId) return;

    this.notifyService
      .dialogConfirmDelete({
        size: 'sm',
        title: 'Xác Nhận',
        content: 'Bạn có chắc muốn xoá sản phẩm này khỏi giỏ hàng?'
      })
      .pipe(
        take(1),
        map((res: { confirmDelete?: boolean } | undefined) => !!res?.confirmDelete),
        filter(Boolean),
        tap(() => {
          this.cartService.onRemoveCartItem(item);
          this.cartData = this.cartService.getCartData();
          this.notifyService.success('Đã xoá sản phẩm thành công.');
        }),
        takeUntil(this.appFm.destroyed)
      ).subscribe();
  }
}
