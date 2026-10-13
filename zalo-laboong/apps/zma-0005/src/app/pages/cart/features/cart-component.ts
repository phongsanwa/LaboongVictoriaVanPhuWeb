import {Component, OnInit} from '@angular/core';
import { ICartData} from '@shared/models/feature-specific';
import {CartManageService} from '@shared/services/global';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {AppFormAddService} from '@shared/services/global/app-form-add.service';
import {IPromotionEvaluateData} from '@shared/models/api';
import {PromotionEvaluateService} from '@shared/services/feature-specific';
import {filter, take, takeUntil} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {uriFeConst} from '../../../../../../../common/shared/constants';

@Component({
  selector: 'app-cart',
  templateUrl: './cart-component.html',
  styleUrls: [`/cart-component.scss`],
  standalone: false
})

export class CartComponent extends AppCommonComponent implements OnInit {
  cartData!: ICartData;
  promoResult: IPromotionEvaluateData | null = null;

  constructor(
    public cartService: CartManageService,
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
      title: 'Đơn hàng',
    });

    this.setFooter({
      variant: 'tabs',
      show: true,
      className: 'footer',
    });
    this.cartService.handlerLoadData();
    this.cartData = this.cartService.getCartData();

    this.promoService.result$.pipe(takeUntil(this.appFm.destroyed)).subscribe(result => {
      this.promoResult = result;
    });

    this.promoService.debouncedResult$.pipe(takeUntil(this.appFm.destroyed)).subscribe();

    this.evaluatePromotion();
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

  getCombinedProductNames(): string {
    return Object.values(this.cartData.items ?? {})
      .map(it => it.name)
      .join(', ');
  }

  onRemoveProduct() {
    this.notifyService
      .dialogConfirmDelete({
        size: 'sm',
        title: 'Xác Nhận',
        content: 'Bạn có chắc muốn xoá tất cả sản phẩm này khỏi giỏ hàng?'
      })
      .pipe(
        take(1),
        map((res: { confirmDelete?: boolean } | undefined) => !!res?.confirmDelete),
        filter(Boolean),
        tap(() => {
          this.cartService.clearCart();
          this.notifyService.success('Đã xoá sản phẩm thành công.');
        }),
        takeUntil(this.appFm.destroyed)
      ).subscribe();
  }

  private evaluatePromotion(): void {
    const items = this.itemsCart.map(i => ({
      productId: i.productId,
      price: i.price,
      quantity: i.quantity,
    }));
    this.promoService.evaluate(items);
  }

  protected readonly uriFeConst = uriFeConst;
}
