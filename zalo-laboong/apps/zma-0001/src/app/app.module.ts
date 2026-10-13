import {DEFAULT_CURRENCY_CODE, inject, LOCALE_ID, NgModule, provideAppInitializer} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {RouterModule} from '@angular/router';
import {APP_BASE_HREF} from '@angular/common';
import {AppComponent} from "./app.component";
import {HttpClientModule} from "@angular/common/http";
import {routes} from "./app.routes";
import {environment} from "../environments";
import {LayoutComponent} from "./layout/layout.component";
import {AppFooterComponent} from "./components/footer/footer.component";
import {CoreModule} from '@core/core.module';
import {SharedCommonModule} from '@shared/shared-common.module';
import {AddToCartComponent} from './components/actions/add-to-cart/add-to-cart.component';
import {AppHeaderComponent} from './components/header/header.component';
import {Select} from "primeng/select";
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {AppService} from '@core/services';
import {AppConfigService} from '@core/services/app-config.service';
import {FabActionsComponent} from '@shared/components/actions/fab-actions/fab-actions.component';
import {ENVIRONMENT} from '@core/tokens/environment.token';

@NgModule({
  declarations: [
    AppComponent,
    LayoutComponent,
    AppHeaderComponent,
    AppFooterComponent,
    AddToCartComponent,
  ],
	 imports: [
		  CoreModule,
		  BrowserModule,
		  BrowserAnimationsModule,
		  SharedCommonModule,
		  HttpClientModule,
		  RouterModule.forRoot(routes, {
				useHash: false,
		  }),
		  Select,
		  FabActionsComponent,

	 ],
  providers: [
    {provide: APP_BASE_HREF, useValue: environment.zaloBaseHref},
    {provide: LOCALE_ID, useValue: 'vi-VN'},
    {provide: DEFAULT_CURRENCY_CODE, useValue: 'VND'},
    {provide: ENVIRONMENT, useValue: environment},
    provideAppInitializer(() => inject(AppConfigService).load$()),
    AppService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
