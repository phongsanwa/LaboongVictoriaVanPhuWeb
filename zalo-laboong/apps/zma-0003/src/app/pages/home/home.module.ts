import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './features/home.component';
import {HomeRoutingModule} from "./home.routing";
import {I18nFormatCurrencyAmountPipe} from "@shared/pipes/global";
import {UniversalSlideComponent} from '@shared/components/actions';
import {FavoriteActiveDirective, OpenFavoriteSheetDirective} from '@shared/directives';
import {FollowOAComponent} from "@shared/components";
@NgModule({
  declarations: [
    HomeComponent,
     ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    I18nFormatCurrencyAmountPipe,
    UniversalSlideComponent,
    FavoriteActiveDirective,
    OpenFavoriteSheetDirective,
    FollowOAComponent
  ]
})
export class HomeModule {}
