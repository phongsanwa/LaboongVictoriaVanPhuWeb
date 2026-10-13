import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './features/home.component';
import {HomeRoutingModule} from "./home.routing";
import {SearchBarComponent} from "../../components/actions/search.component";
import {ProductListComponent} from "../../components/product/list/product-list.component";
import {I18nFormatCurrencyAmountPipe, ProductPriceHtmlPipe} from "@shared/pipes/global";
// import { NewsModule } from '../news/news.module';
import {UniversalSlideComponent} from '@shared/components/actions';
import { FollowOAComponent } from '@shared/components/follow-oa';
import {PlayCardComponent} from "../../components/actions/app-play-card.component";
import {SharedCommonModule} from '@shared/shared-common.module';
import {NewsListComponent} from '../../components/news/news-list.component';
import {ProductItemComponent} from '../../components/product/item/product-item.component';
import {ProductFlashSaleComponent} from '../../components/product/flashsale/flashsale.component';
@NgModule({
  declarations: [
    HomeComponent,
    SearchBarComponent,
    ProductListComponent,
    NewsListComponent,
    ProductFlashSaleComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    I18nFormatCurrencyAmountPipe,
    SharedCommonModule,
    UniversalSlideComponent,
    FollowOAComponent,
    PlayCardComponent,
    ProductItemComponent,
    ProductPriceHtmlPipe,
  ]
})
export class HomeModule {}
