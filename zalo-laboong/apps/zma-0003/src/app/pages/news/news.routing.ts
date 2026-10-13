import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NewsComponent } from './features/news.component';
import {NewsDetailComponent} from './features/detail/news-detail.component';
const routes: Routes = [
  {
    path: '',
    component: NewsComponent
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
