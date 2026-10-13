import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {DemoHostComponent} from './components/demo-host/demo-host.component';
import {HeroBannerComponent} from './components/blocks/hero-banner/hero-banner.component';
import {CategoryGridComponent} from './components/blocks/category-grid/category-grid.component';
import {ProductGridComponent} from './components/blocks/product-grid/product-grid.component';
import {FeatureIconsComponent} from './components/blocks/feature-icons/feature-icons.component';
import {HeaderComponent} from './components/blocks/layout-section/header/header.component';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {SpinnerWithLogoComponent} from '../components/spinner/spinner-with-logo/spinner-with-logo.component';
import {FabActionsComponent} from '../components/actions/fab-actions/fab-actions.component';
import {FooterComponent} from './components/blocks/layout-section/footer/footer.component';
import {I18nFormatCurrencyAmountPipe} from '../pipes/global';
import {UniversalSlideComponent} from '../components/actions';
import {AboutStoreComponent} from './components/blocks/about-store/about-store.component';

@NgModule({
  declarations: [
    DemoHostComponent,
    HeroBannerComponent,
    CategoryGridComponent,
    ProductGridComponent,
    FeatureIconsComponent,
    HeaderComponent,
    FooterComponent,
    AboutStoreComponent
  ],
  imports: [
    CommonModule,
    RouterLink,
    SpinnerWithLogoComponent,
    FabActionsComponent,
    RouterLinkActive,
    I18nFormatCurrencyAmountPipe,
    UniversalSlideComponent,
  ],
  exports: [
    DemoHostComponent,
    HeroBannerComponent,
    CategoryGridComponent,
    ProductGridComponent,
    FeatureIconsComponent,
    HeaderComponent,
    FooterComponent,
    AboutStoreComponent
  ],
})
export class TemplatesModule {}
