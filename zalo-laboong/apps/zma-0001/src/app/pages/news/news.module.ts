import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsRoutingModule } from './news.routing';
import { NewsCategoryComponent } from './features/category/news-category.component';
import { NewsDetailComponent } from './features/detail/news-detail.component';
import { SharedCommonModule } from '@shared/shared-common.module';

@NgModule({
  declarations: [
    NewsCategoryComponent,
    NewsDetailComponent
  ],
  imports: [
    CommonModule,
    NewsRoutingModule,
    SharedCommonModule
  ],
})
export class NewsModule {}
