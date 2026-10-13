import { NgModule } from '@angular/core';
import {CommonModule} from '@angular/common';
import {SharedCommonModule} from '@shared/shared-common.module';
import {ProductsRouting} from './products.routing';
import {ProductDetailComponent} from './detail/product-detail.component';
import {AddToCartComponent} from '../../components/action/add-to-cart/add-to-cart.component';
import {ProductCategoryComponent} from './category/product-category.component';
import {Select} from "primeng/select";
import {ProductItemComponent} from '../../components/product/item/product-item.component';

@NgModule({
  declarations: [
    ProductDetailComponent,
    AddToCartComponent,
    ProductCategoryComponent
  ],
  imports: [
    CommonModule,
    SharedCommonModule,
    ProductsRouting,
    Select,
    ProductItemComponent,
  ]
})
export class ProductsModule {}
