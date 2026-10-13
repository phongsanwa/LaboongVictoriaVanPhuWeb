import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HomeComponent} from './features/home.component';
import {HomeRoutingModule} from "./home.routing";
import {I18nFormatCurrencyAmountPipe} from "@shared/pipes/global";
import {ProductListComponent} from '../../components/product/list/product-list.component';
import {UniversalSlideComponent} from "@shared/components/actions";
import {FlashSaleComponent} from '../../components/product/flashsale/flashsale.component';
import {ProductItemComponent} from '../../components/product/item/product-item.component';


@NgModule({
  declarations: [
    HomeComponent,
    ProductListComponent,
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    I18nFormatCurrencyAmountPipe,
    UniversalSlideComponent,
    FlashSaleComponent,
    ProductItemComponent
  ]
})
export class HomeModule {
}
