import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {ProductCategoryComponent} from './features/category/product-category.component';
import {ProductSearchComponent} from './features/search/product-search.component';
import {ProductDetailComponent} from './features/detail/product-detail.component';

const routes: Routes = [
  {
    path: 'category',
    component: ProductCategoryComponent,
  },
  {
    path: 'search',
    component: ProductSearchComponent,
  },
  {
    path: 'detail',
    component: ProductDetailComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductsRouting {}
