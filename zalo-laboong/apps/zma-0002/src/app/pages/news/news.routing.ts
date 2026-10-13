import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {NewsDetailComponent} from './features/detail/news-detail.component';
import {NewsComponent} from './features/index/news.component';
import {NewsSearchComponent} from './features/search/news-search.component';

const routes: Routes = [
  {
    path: 'index',
    component: NewsComponent
  },
  {
    path: 'detail',
    component: NewsDetailComponent
  },
  {
    path: 'search',
    component: NewsSearchComponent
  },
  {
    path: 'category',
    component: NewsComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NewsRoutingModule {}
