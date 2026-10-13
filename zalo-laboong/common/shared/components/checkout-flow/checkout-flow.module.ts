import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckoutFlowVoucherPickerComponent } from '../modals/checkout-action/checkout-flow-voucher-picker/checkout-flow-voucher-picker.component';

import { CheckoutFlowComponent } from './checkout-flow.component';

const COMPONENTS = [
  CheckoutFlowComponent,
  CheckoutFlowVoucherPickerComponent,
];

@NgModule({
  declarations: COMPONENTS,
  imports: [CommonModule, FormsModule],
  exports: [CheckoutFlowComponent],
})
export class CheckoutFlowModule {}
