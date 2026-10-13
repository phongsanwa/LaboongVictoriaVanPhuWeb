import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutComponent } from './features/checkout/checkout.component';
import { CheckoutRoutingModule } from './checkout.routing';
import { I18nFormatCurrencyAmountPipe } from '@shared/pipes/global';
import { SharedCommonModule } from '@shared/shared-common.module';
import { CheckoutFlowModule } from '@shared/components/checkout-flow';
import { CheckoutSuccessComponent } from './features/checkout-success/checkout-success.component';
import { ActionSharedModule } from '@shared/components/modals/checkout-action/action-shared.module';

@NgModule({
  declarations: [CheckoutComponent, CheckoutSuccessComponent],
  imports: [
    CommonModule,
    CheckoutRoutingModule,
    I18nFormatCurrencyAmountPipe,
    SharedCommonModule,
    CheckoutFlowModule,
    ActionSharedModule,
  ],
})
export class CheckoutModule {}
