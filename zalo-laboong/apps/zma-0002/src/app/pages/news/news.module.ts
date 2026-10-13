import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {NewsRoutingModule} from "./news.routing";
import {NewsDetailComponent} from './features/detail/news-detail.component';
import {NewsComponent} from './features/index/news.component';
import {DateI18nPipe} from '@shared/pipes/global';
import {NewsSearchComponent} from './features/search/news-search.component';

@NgModule({
  declarations: [
    NewsComponent,
    NewsDetailComponent,
    NewsSearchComponent,
  ],
  imports: [
    CommonModule,
    NewsRoutingModule,
    DateI18nPipe,
  ],
  exports: [NewsComponent]
})
export class NewsModule {}
