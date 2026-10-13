import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './features/home.component';
import {HomeRoutingModule} from "./home.routing";
import {I18nFormatCurrencyAmountPipe} from "@shared/pipes/global";
import {UniversalSlideComponent} from '@shared/components/actions';
import {NewsModule} from '../news/news.module';
import {FollowOAComponent} from "../../../../../../common/shared/components";
import {NewsListComponent} from '../../components/actions/news/news-list.component';

@NgModule({
  declarations: [
    HomeComponent,
    NewsListComponent,
     ],
    imports: [
        CommonModule,
        HomeRoutingModule,
        I18nFormatCurrencyAmountPipe,
        UniversalSlideComponent,
        NewsModule,
        FollowOAComponent,
    ]
})
export class HomeModule {}
