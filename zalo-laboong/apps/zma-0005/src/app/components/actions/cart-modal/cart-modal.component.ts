import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {ICartData, ICartItem} from '@shared/models/feature-specific';
import {CartManageService} from '@shared/services/global/cart/cart-manage.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-cart-modal',
  templateUrl: 'cart-modal.component.html',
  styleUrls: ['cart-modal.component.scss'],
  standalone: false
})

export class CartModalComponent implements OnInit {
  @Input() cartData!: ICartData;

  constructor(
    public active: NgbActiveOffcanvas,
    public cartService: CartManageService,
    private cd: ChangeDetectorRef,
    private router: Router
  ) {
  }
  ngOnInit() {

  }

  get itemsCart() {
    return Object.values(this.cartData.items ?? {});
  }

  onQuantityChange(item: ICartItem, qty: number) {
    this.cartService.updateCartItemQuantity(item.productId, qty);

    this.cartData = this.cartService.getCartData();
    this.cd.markForCheck();
  }

  /**
   * Xử lí xóa toàn bộ SP khỏi giỏ hàng
   * */
  removeAllCart() {
    this.cartService.clearCart();
    this.cartData = this.cartService.getCartData();
    this.cd.markForCheck();
  }
  /**
   * Xử lí xóa SP khỏi giỏ hàng
   * */
  onRemoveProduct(item: ICartItem) {
    if (!item.productId) return;
    this.cartService.onRemoveCartItem(item);

    this.cartData = this.cartService.getCartData();
    this.cd.markForCheck();
  }

  toCheckout() {
    this.active.close();
    this.router.navigate(['/checkout']);
  }
}
