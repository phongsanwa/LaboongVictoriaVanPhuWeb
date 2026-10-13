import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './features/home.component';
import {HomeRoutingModule} from "./home.routing";
import {I18nFormatCurrencyAmountPipe, ProductPriceHtmlPipe} from "@shared/pipes/global";
import {SearchBarComponent} from '../../components/action/search.component';
import {ProductListComponent} from '../../components/product/product-list.component';
import {UniversalSlideComponent} from '@shared/components/actions';
import {NewsListComponent} from '../../components/news/news-list.component';
import {ContactOffcanvasComponent} from '../../components/action/contact/contactModal.component';
import {ZmaProductCardComponent} from '../../components/product/product-card.component';
import {ZmaProductQuickBuyComponent} from '../../components/product/product-quick-buy.component';
import {FollowOAComponent} from '@shared/components';

@NgModule({
  declarations: [
    HomeComponent,
    SearchBarComponent,
    ProductListComponent,
    NewsListComponent,
    ContactOffcanvasComponent
  ],
    imports: [
        CommonModule,
        HomeRoutingModule,
        I18nFormatCurrencyAmountPipe,
        UniversalSlideComponent,
        ProductPriceHtmlPipe,
        ZmaProductCardComponent,
        ZmaProductQuickBuyComponent,
        FollowOAComponent,
    ],
})
export class HomeModule {}
