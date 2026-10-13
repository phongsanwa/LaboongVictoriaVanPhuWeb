import {NgModule} from '@angular/core';
import {CartComponent} from './features/cart-component';
import {CartRoutingModule} from './cart.routing';
import {CommonModule} from '@angular/common';
import {I18nFormatCurrencyAmountPipe} from '@shared/pipes/global';
import {SharedCommonModule} from '@shared/shared-common.module';




@NgModule({
  declarations: [
    CartComponent
  ],
  imports: [
    CommonModule,
    CartRoutingModule,
    I18nFormatCurrencyAmountPipe,
    SharedCommonModule
  ]
})


export class CartModule {
}
