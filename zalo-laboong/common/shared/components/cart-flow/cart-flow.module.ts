import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { CartFlowComponent } from './cart-flow.component';
import { CartFlowItemComponent } from './cart-flow-item/cart-flow-item.component';
import { CartFlowGiftPickerComponent } from './cart-flow-gift-picker/cart-flow-gift-picker.component';
import { CartFlowVoucherPickerComponent } from './cart-flow-voucher-picker/cart-flow-voucher-picker.component';
import { CartFlowPromotionDetailComponent } from './cart-flow-promotion-detail/cart-flow-promotion-detail.component';
import { CartFlowConfirmDialogComponent } from './cart-flow-confirm-dialog/cart-flow-confirm-dialog.component';

const COMPONENTS = [
  CartFlowComponent,
  CartFlowItemComponent,
  CartFlowGiftPickerComponent,
  CartFlowVoucherPickerComponent,
  CartFlowPromotionDetailComponent,
  CartFlowConfirmDialogComponent,
];

@NgModule({
  declarations: COMPONENTS,
  imports: [CommonModule, RouterModule, FormsModule],
  exports: [CartFlowComponent],
})
export class CartFlowModule {}
