import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {ICartData, ICartItem} from '@shared/models/feature-specific';
import {CartManageService} from '@shared/services/global/cart/cart-manage.service';
import {Router} from '@angular/router';
import {KeyValuePipe} from '@angular/common';
import {SharedCommonModule} from '@shared/shared-common.module';
import {filter, map, take, takeUntil} from 'rxjs';
import {tap} from 'rxjs/operators';
import {NotifyService} from '@core/services';
import {AppFormAddService} from '@shared/services/global/app-form-add.service';
import {uriFeConst} from "@shared/constants";

@Component({
  selector: 'app-cart-modal',
  templateUrl: 'cart-modal.component.html',
  styleUrls: ['cart-modal.component.scss'],
  imports: [
    KeyValuePipe,
    SharedCommonModule
  ],
  standalone: true
})

export class CartModalComponent implements OnInit, OnDestroy {
  @Input() cartData!: ICartData;

  constructor(
    public active: NgbActiveOffcanvas,
    public cartService: CartManageService,
    private router: Router,
    private notifyService: NotifyService,
    private appFm: AppFormAddService
  ) {
  }
  ngOnInit() {

  }

  ngOnDestroy() {
    this.appFm.getDestroySubs()
  }

  get itemsCart() {
    return Object.values(this.cartData.items ?? {});
  }

  onQuantityChange(item: ICartItem, qty: number) {
    this.cartService.updateCartItemQuantity(item.productId, qty);

    this.cartData = this.cartService.getCartData();
  }

  /**
   * Xử lí xóa toàn bộ SP khỏi giỏ hàng
   * */
  removeAllCart() {
    this.notifyService
      .dialogConfirmDelete({
        size: 'sm',
        title: 'Xác Nhận',
        content: 'Bạn có chắc muốn xoá hết sản phẩm khỏi giỏ hàng?'
      })
      .pipe(
        take(1),
        map((res: { confirmDelete?: boolean } | undefined) => !!res?.confirmDelete),
        filter(Boolean),
        tap(() => {
          this.cartService.clearCart();
          this.cartData = this.cartService.getCartData();
          this.notifyService.success('Đã xoá sản phẩm thành công.');
        }),
        takeUntil(this.appFm.destroyed)
        ).subscribe();
  }
  /**
   * Xử lí xóa SP khỏi giỏ hàng
   * */
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

  toCheckout() {
    this.active.close();
    this.router.navigate(['/checkout']);
  }

	 protected readonly uriFeConst = uriFeConst;
}
