import { NgModule } from '@angular/core';
import {UserRouting} from "./user.routing";
import {CommonModule} from "@angular/common";
import {UserComponent} from './features/user/user.component';
import { AddressIndexComponent} from './features/address/index/address-index.component';
import {AddressAddComponent} from './features/address/add/address-add.component';
import {CreateAddressModalComponent, LocationDynamicComponent} from '@shared/components';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {QuickOrderStatusComponent} from "@shared/components/quick-order-status/quick-order-status.component";
import {UserEditComponent} from './features/user/edit/user-edit.component';
import {VoucherComponent} from './features/voucher/voucher-list/voucher.component';
import {NavTabsComponent} from '@shared/components/app-nav-tabs/app-nav-tab.component';
import {I18nFormatCurrencyAmountPipe} from '@shared/pipes/global';
import {MembershipComponent} from './features/membership/membership.component';
import {PointsComponent} from './features/points/points.component';
import {RenderCodesComponent} from '@shared/components/actions';
import {FlashSaleComponent} from "../../components/product/flashsale/flashsale.component";
import {AboutUsComponent} from './features/about-us/about-us.component';




@NgModule({
  declarations: [
    UserComponent,
    AddressIndexComponent,
    AddressAddComponent,
    UserEditComponent,
    VoucherComponent,
    MembershipComponent,
    PointsComponent,
    AboutUsComponent
  ],
  imports: [
    CommonModule,
    UserRouting,
    CreateAddressModalComponent,
    FormsModule,
    ReactiveFormsModule,
    LocationDynamicComponent,
    QuickOrderStatusComponent,
    NavTabsComponent,
    I18nFormatCurrencyAmountPipe,
    RenderCodesComponent,
    FlashSaleComponent
  ]
})
export class UserModule {}
