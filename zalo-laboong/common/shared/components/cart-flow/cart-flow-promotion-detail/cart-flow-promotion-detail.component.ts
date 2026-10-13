import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IPromotionDetailDisplay } from '../cart-flow.models';

@Component({
  selector: 'app-cart-flow-promotion-detail',
  standalone: false,
  templateUrl: './cart-flow-promotion-detail.component.html',
  styleUrls: ['./cart-flow-promotion-detail.component.scss'],
})
export class CartFlowPromotionDetailComponent {
  @Input() detail!: IPromotionDetailDisplay;
  @Input() closing = false;

  @Output() close = new EventEmitter<void>();

  formatPrice(price: number): string {
    return (price ?? 0).toLocaleString('vi-VN') + ' VND';
  }
}
