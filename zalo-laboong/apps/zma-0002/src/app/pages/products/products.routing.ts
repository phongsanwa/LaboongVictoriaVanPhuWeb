import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {ProductCategoryComponent} from './features/category/product-category.component';
import {ProductDetailComponent} from './features/detail/product-detail.component';
import {ProductSearchComponent} from './features/search/product-search.component';
const routes: Routes = [
  {
    path: 'category',
    component: ProductCategoryComponent,
  },
  {
    path: 'detail',
    component: ProductDetailComponent,
  },
  {
    path: 'search',
    component: ProductSearchComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductsRouting {}
