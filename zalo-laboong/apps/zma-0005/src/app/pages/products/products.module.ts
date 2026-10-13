import { NgModule } from '@angular/core';
import {CommonModule} from '@angular/common';
import {SharedCommonModule} from '@shared/shared-common.module';
import {ProductsRouting} from './products.routing';
import {ShareButtonComponent} from '../../components/actions/share-button.component';
import {ProductCategoryComponent} from './features/category/product-category.component';
import {ProductDetailComponent} from './features/detail/product-detail.component';
import {AddToCartComponent} from '../../components/actions/add-to-cart/add-to-cart.component';
import {ProductSearchComponent} from './features/search/product-search.component';

@NgModule({
  declarations: [
    ProductCategoryComponent,
    ProductDetailComponent,
    AddToCartComponent,
    ProductSearchComponent,
  ],
  imports: [
    CommonModule,
    SharedCommonModule,
    ProductsRouting,
    ShareButtonComponent
  ]
})
export class ProductsModule {}
