import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-cart-flow-confirm-dialog',
  standalone: false,
  templateUrl: './cart-flow-confirm-dialog.component.html',
  styleUrls: ['./cart-flow-confirm-dialog.component.scss'],
})
export class CartFlowConfirmDialogComponent {
  @Input() show = false;
  @Input() closing = false;
  @Input() text = '';

  @Output() confirmAction = new EventEmitter<void>();
  @Output() cancelAction = new EventEmitter<void>();
}
