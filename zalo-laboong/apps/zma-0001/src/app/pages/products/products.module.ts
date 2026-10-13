import { NgModule } from '@angular/core';
import {CommonModule} from '@angular/common';
import {ProductSearchComponent} from './features/search/product-search.component';
import {SharedCommonModule} from '@shared/shared-common.module';
import {ProductsRouting} from './products.routing';
import {ProductDetailComponent} from './features/detail/product-detail.component';
import {ShareButtonComponent} from '../../components/actions/share-button.component';
import {ProductCategoryComponent} from './features/category/product-category.component';
import {ProductItemComponent} from "../../components/product/item/product-item.component";
import {ProductPriceHtmlPipe} from '@shared/pipes/global';
@NgModule({
  declarations: [
    ProductSearchComponent,
    ProductDetailComponent,
    ProductCategoryComponent,
  ],
  imports: [
    CommonModule,
    SharedCommonModule,
    ProductsRouting,
    ShareButtonComponent,
    ProductItemComponent,
    ProductPriceHtmlPipe,
  ]
})
export class ProductsModule {}
