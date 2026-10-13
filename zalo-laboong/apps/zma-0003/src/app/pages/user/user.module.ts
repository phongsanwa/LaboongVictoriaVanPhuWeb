import { NgModule } from '@angular/core';
import {UserRouting} from "./user.routing";
import {CommonModule} from "@angular/common";
import {UserComponent} from "./features/user/user.component";
import {MembershipComponent} from './features/membership/membership.component';
import {CreateAddressComponent} from './features/address/create-address.component';
import {FormsModule} from '@angular/forms';
import {QuickOrderStatusComponent} from "@shared/components/quick-order-status/quick-order-status.component";
import {UserEditComponent} from './features/user/edit/user-edit.component';
import {PointsComponent} from './features/points/points.component';
import {RenderCodesComponent} from '@shared/components/actions';
import {VoucherComponent} from './features/voucher/voucher-list/voucher.component';
import {FavoriteProductsComponent} from './features/favorite-products/index/favorite-products.component';
import {SpinnerWithLogoComponent} from '@shared/components/spinner/spinner-with-logo/spinner-with-logo.component';
import {SharedCommonModule} from '@shared/shared-common.module';
import {AssetUrlPipe} from '@shared/pipes/global';
import {FavoriteProductDetailComponent} from './features/favorite-products/details/favorite-product-detail.component';
import {FeedbackComponent} from './features/feedback/feedback.component';
import {VoucherDetailComponent} from './features/voucher/voucher-detail/voucher-detail.component';
import {
  VoucherCardComponent
} from '@shared/components/actions/box-voucher-checkout/voucher-card/voucher-card.component';
import {FavoriteActiveDirective, OpenFavoriteSheetDirective} from '@shared/directives';
import {FollowOAComponent} from "../../../../../../common/shared/components";
@NgModule({
  declarations: [
    UserComponent,
    MembershipComponent,
    CreateAddressComponent,
    VoucherComponent,
    UserEditComponent,
    FavoriteProductsComponent,
    FavoriteProductDetailComponent,
    FeedbackComponent,
    VoucherDetailComponent,
    PointsComponent
  ],
  imports: [
    CommonModule,
    UserRouting,
    FormsModule,
    SharedCommonModule,
    QuickOrderStatusComponent,
    RenderCodesComponent,
    SpinnerWithLogoComponent,
    AssetUrlPipe,
    VoucherCardComponent,
    FollowOAComponent,
    FavoriteActiveDirective,
    OpenFavoriteSheetDirective
  ]
})
export class UserModule {}
