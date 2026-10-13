import {NgModule} from '@angular/core';
import {CartComponent} from './features/cart-component';
import {CartRoutingModule} from './cart.routing';
import {CommonModule} from '@angular/common';
import {SharedCommonModule} from '@shared/shared-common.module';
import {I18nFormatCurrencyAmountPipe} from '@shared/pipes/global';
import {CartFlowModule} from '@shared/components/cart-flow';

@NgModule({
  declarations: [
    CartComponent,
  ],
  imports: [
    CommonModule,
    CartRoutingModule,
    I18nFormatCurrencyAmountPipe,
    SharedCommonModule,
    CartFlowModule,
  ]
})


export class CartModule {
}
