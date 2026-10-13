import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {ProductSearchComponent} from './features/search/product-search.component';
import {ProductDetailComponent} from './features/detail/product-detail.component';
import {ProductCategoryComponent} from './features/category/product-category.component';

const routes: Routes = [
  {
    path: 'search',
    component: ProductSearchComponent,
  },
  {
    path: 'category',
    component: ProductCategoryComponent,
  },
  {
    path: 'detail',
    component: ProductDetailComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductsRouting {}
