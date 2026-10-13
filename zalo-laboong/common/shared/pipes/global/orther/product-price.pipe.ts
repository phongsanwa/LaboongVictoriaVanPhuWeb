import { Pipe, PipeTransform } from '@angular/core';
import { IResProductInList} from '../../../models/api';
import {productDisplayPrice, productOriginalPrice} from '../../../utils';

@Pipe({
  name: 'productPriceHtml',
  standalone: true
})
export class ProductPriceHtmlPipe implements PipeTransform {

  transform(product: IResProductInList): string {
    if (!product) return '<span class="price fw-semibold">Liên hệ</span>';

    let html = '';
    const displayPrice = productDisplayPrice(product);
    const originalPrice = productOriginalPrice(product);

    if (!displayPrice) return '<span class="price fw-semibold">Liên hệ</span>';

    if (originalPrice && originalPrice > displayPrice) {
      html += `<div class="prices">
                <span class="text-muted text-decoration-line-through">${this.format(originalPrice)}</span>
                <span class="price fw-semibold">${this.format(displayPrice)}</span>
              </div>`;
      return html;
    }

    html += `<div class="prices">
              <span class="price fw-semibold">${this.format(displayPrice)}</span>
            </div>`;
    return html;
  }

  private format(value: number): string {
    if (value == null || isNaN(value)) return '';
    return value.toLocaleString('vi-VN') + '₫';
  }
}
