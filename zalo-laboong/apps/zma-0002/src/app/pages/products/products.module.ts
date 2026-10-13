import { NgModule } from '@angular/core';
import {CommonModule} from '@angular/common';
import {ProductsRouting} from './products.routing';
import {ProductCategoryComponent} from './features/category/product-category.component';
import {I18nFormatCurrencyAmountPipe, ProductPriceHtmlPipe} from '../../../../../../common/shared/pipes/global';
import {ProductDetailComponent} from './features/detail/product-detail.component';
import {AppSpinnerComponent} from '@shared/components';
import {UniversalSlideComponent} from '@shared/components/actions';
import {AddToCartComponent} from "../../components/action/add-to-cart/add-to-cart.component";
import {ProductSearchComponent} from './features/search/product-search.component';
import {ZmaProductCardComponent} from '../../components/product/product-card.component';
import {ZmaProductQuickBuyComponent} from '../../components/product/product-quick-buy.component';

@NgModule({
  declarations: [
    ProductDetailComponent,
    ProductCategoryComponent,
    ProductSearchComponent
  ],
  imports: [
    CommonModule,
    ProductsRouting,
    I18nFormatCurrencyAmountPipe,
    AppSpinnerComponent,
    UniversalSlideComponent,
    AddToCartComponent,
    ProductPriceHtmlPipe,
    ZmaProductCardComponent,
    ZmaProductQuickBuyComponent,
  ]
})
export class ProductsModule {}
