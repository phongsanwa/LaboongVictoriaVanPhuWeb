import { NgModule } from '@angular/core';
import {UserRouting} from "./user.routing";
import {CommonModule} from "@angular/common";
import {UserComponent} from './features/user/user.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MembershipComponent} from './features/membership/membership.component';
import {AddressIndexComponent} from './features/address/index/address-index.component';
import {AddressAddComponent} from './features/address/add/address-add.component';
import {LocationDynamicComponent} from '@shared/components';
import {SharedCommonModule} from '@shared/shared-common.module';
import {QuickOrderStatusComponent} from "@shared/components/quick-order-status/quick-order-status.component";
import {VoucherComponent} from './features/voucher/voucher.component';
import { TermPolicyListComponent} from './features/policies/term-policy.component';
import {PolicyDetailComponent} from './features/policies/detail/policy-detail.component';
import {PointsComponent} from './features/points/points.component';
import {UserEditComponent} from './features/user/edit/user-edit.component';
import {ReviewsComponent} from './features/reviews/reviews.component';
import {ReviewFormComponent} from './features/reviews/review-form.component';
import {FollowOAComponent} from '@shared/components';
import {ZmaVoucherCardComponent} from './features/voucher/voucher-card/voucher-card.component';
import {VoucherConditionComponent} from './features/voucher/condition/voucher-condition.component';
import {ZmaVoucherDetailSheetComponent} from './features/voucher/voucher-detail-sheet/voucher-detail-sheet.component';
import {RenderCodesComponent} from '@shared/components/actions';



@NgModule({
  declarations: [
    UserComponent,
    MembershipComponent,
    AddressIndexComponent,
    AddressAddComponent,
    VoucherComponent,
    TermPolicyListComponent,
    PolicyDetailComponent,
    PointsComponent,
    UserEditComponent,
    ReviewsComponent,
    ReviewFormComponent,
    ZmaVoucherCardComponent,
    VoucherConditionComponent,
    ZmaVoucherDetailSheetComponent
  ],
    imports: [
        CommonModule,
        UserRouting,
        FormsModule,
        ReactiveFormsModule,
        LocationDynamicComponent,
        SharedCommonModule,
        QuickOrderStatusComponent,
        FollowOAComponent,
        RenderCodesComponent
    ]
})
export class UserModule {}
