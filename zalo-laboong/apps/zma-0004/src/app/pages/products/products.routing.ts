import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {ProductDetailComponent} from './detail/product-detail.component';
import {ProductCategoryComponent} from './category/product-category.component';


const routes: Routes = [
  {
    path: 'detail',
    component: ProductDetailComponent,
  },
  {
    path: 'category',
    component: ProductCategoryComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductsRouting {}
