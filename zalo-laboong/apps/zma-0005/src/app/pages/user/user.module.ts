import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import {UserRouting} from "./user.routing";
import {CommonModule} from "@angular/common";
import {UserComponent} from "./features/user/user.component";
import {MembershipComponent} from './features/membership/membership.component';
import {PointsComponent} from './features/points/points.component';
import {FormsModule} from '@angular/forms';
import {QuickOrderStatusComponent} from "@shared/components/quick-order-status/quick-order-status.component";
import {UserEditComponent} from './features/user/edit/user-edit.component';
import {RenderCodesComponent} from '@shared/components/actions';
import {VoucherComponent} from './features/voucher/voucher.component';
import {SpinnerWithLogoComponent} from '@shared/components/spinner/spinner-with-logo/spinner-with-logo.component';
import {SharedCommonModule} from '@shared/shared-common.module';
import {AssetUrlPipe} from '@shared/pipes/global';
import {FollowOAComponent} from "../../../../../../common/shared/components";
import {ComponentShareModal} from "./features/user/user.component";
import {CreateAddressComponent} from './features/address/create-address.component';

@NgModule({
  declarations: [
    UserComponent,
    MembershipComponent,
    PointsComponent,
    VoucherComponent,
    UserEditComponent,
    CreateAddressComponent
  ],
    imports: [
        CommonModule,
        UserRouting,
        RouterModule,
        FormsModule,
        SharedCommonModule,
        QuickOrderStatusComponent,
        RenderCodesComponent,
        SpinnerWithLogoComponent,
        AssetUrlPipe,
        FollowOAComponent,
        ComponentShareModal
    ]
})
export class UserModule {}
