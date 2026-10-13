import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CheckoutComponent, VoucherModalComponent} from './features/checkout/checkout.component';
import {CheckoutRoutingModule} from './checkout.routing';
import {I18nFormatCurrencyAmountPipe} from '@shared/pipes/global';
import {SharedCommonModule} from '@shared/shared-common.module';
import {CheckoutSuccessComponent} from './features/checkout-success/checkout-success.component';

@NgModule({
  declarations: [
    CheckoutComponent,
    CheckoutSuccessComponent
  ],
  imports: [
    CommonModule,
    CheckoutRoutingModule,
    I18nFormatCurrencyAmountPipe,
    SharedCommonModule,
    VoucherModalComponent
  ]
})
export class CheckoutModule {
}
