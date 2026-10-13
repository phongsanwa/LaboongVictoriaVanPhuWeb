import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsComponent } from './features/news.component';
import {NewsRoutingModule} from "./news.routing";
import { NewsDetailComponent } from './features/detail/news-detail.component';
import { SharedCommonModule } from '@shared/shared-common.module';
@NgModule({
  declarations: [
    NewsComponent,
    NewsDetailComponent,
  ],
  imports: [
    CommonModule,
    NewsRoutingModule,
    SharedCommonModule
  ],
  exports: [NewsComponent]
})
export class NewsModule {}
