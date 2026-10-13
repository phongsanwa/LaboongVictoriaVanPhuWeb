import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {IResProductInList} from '@shared/models/api';
import {uriFeConst} from '@shared/constants';
import {productDisplayPrice, productImageThumbPath, productOriginalPrice} from '@shared/utils';

@Component({
  selector: 'app-zma-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <a class="zma-product-card d-flex flex-column w-100"
       [routerLink]="uriFeConst.product.detail"
       [queryParams]="{ id: product.id }">
      <div class="zma-product-card__image w-100">
        <img [src]="productImage" [alt]="product.name">
        @if (discountLabel) {
          <span
            class="zma-product-card__discount align-items-center d-flex justify-content-center">{{ discountLabel }}</span>
        }
      </div>

      <div class="zma-product-card__content align-items-center d-flex flex-column w-100">
        <p class="zma-product-card__category m-0 w-100">{{ categoryText }}</p>
        <h3>{{ product.name }}</h3>
        <div class="zma-product-card__bottom align-items-center d-flex w-100">
          <div class="zma-product-card__price d-flex flex-column">
            <strong>{{ formatPrice(price) }}</strong>
            @if (oldPrice && oldPrice > price) {
              <del>{{ formatPrice(oldPrice) }}</del>
            }
          </div>
          <button type="button"
                  class="zma-product-card__quick align-items-center d-flex justify-content-center p-0"
                  aria-label="Mua nhanh"
                  (click)="onQuickBuy($event)">
            <i class="ph-bold ph-plus"></i>
          </button>
        </div>
      </div>
    </a>
  `,
  styleUrls: ['./product-card.component.scss']
})
export class ZmaProductCardComponent {
  @Input({required: true}) product!: IResProductInList;
  @Input() categoryName = '';
  @Output() quickBuy = new EventEmitter<IResProductInList>();

  protected readonly uriFeConst = uriFeConst;

  get productImage(): string {
    return productImageThumbPath(this.product?.imageThumb) || this.product?.image || 'assets/img/no-image.png';
  }

  get categoryText(): string {
    return this.categoryName || this.product?.category?.name || '';
  }

  get price(): number {
    return productDisplayPrice(this.product);
  }

  get oldPrice(): number {
    return productOriginalPrice(this.product);
  }

  get discountLabel(): string {
    const percent = Number(this.product?.discountPercent || 0);
    if (percent > 0) return `-${percent}%`;

    const oldPrice = this.oldPrice;
    const price = this.price;
    if (oldPrice > price && oldPrice > 0) {
      return `-${Math.round((1 - price / oldPrice) * 100)}%`;
    }
    return '';
  }

  formatPrice(value: number): string {
    return `${Number(value || 0).toLocaleString('vi-VN')} VND`;
  }

  onQuickBuy(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.quickBuy.emit(this.product);
  }
}
