import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {NewsCategoryComponent} from './features/category/news-category.component';
import {NewsDetailComponent} from './features/detail/news-detail.component';

const routes: Routes = [
  {
    path: 'category',
    component: NewsCategoryComponent
  },
  {
    path: 'detail',
    component: NewsDetailComponent
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NewsRoutingModule {}
