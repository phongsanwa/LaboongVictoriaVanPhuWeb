import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {UserComponent} from "./features/user/user.component";
import {MembershipComponent} from './features/membership/membership.component';
import {CreateAddressComponent} from './features/address/create-address.component';
import {PointsComponent} from './features/points/points.component';
import {UserEditComponent} from './features/user/edit/user-edit.component';
import {VoucherComponent} from './features/voucher/voucher-list/voucher.component';
import {FavoriteProductsComponent} from './features/favorite-products/index/favorite-products.component';
import {AffiliateComponent} from './features/affiliate/affiliate.component';
import {FavoriteProductDetailComponent} from './features/favorite-products/details/favorite-product-detail.component';
import {FeedbackComponent} from './features/feedback/feedback.component';
import {VoucherDetailComponent} from './features/voucher/voucher-detail/voucher-detail.component';
import {TermPolicyListComponent} from './features/policies/term-policy.component';
import {PolicyDetailComponent} from './features/policies/detail/policy-detail.component';

const routes: Routes = [
  {
    path: 'profile',
    component: UserComponent,
    data: { handle: { logo: true } }
  },
  {
    path: 'membership',
    component: MembershipComponent,
    data: { handle: { logo: true } }
  },
  {
    path: 'address',
    component: CreateAddressComponent,
  },
  {
    path: 'points',
    component: PointsComponent,
  },
  {
    path: 'voucher',
    component: VoucherComponent,
  },
  {
    path: 'voucherdetail',
    component: VoucherDetailComponent,
  },
  {
    path: 'profileedit',
    component: UserEditComponent,
  },
  {
    path: 'favoriteproducts',
    component: FavoriteProductsComponent,
  },
  {
    path: 'favoriteproductsdetail',
    component: FavoriteProductDetailComponent,
  },
  {
    path: 'affiliate',
    component: AffiliateComponent,
  },
  {
    path: 'feedback',
    component: FeedbackComponent
  },
  {
    path: 'policy',
    children: [
      {
        path: '',
        component: TermPolicyListComponent
      },
      {
        path: ':slug',
        component: PolicyDetailComponent
      }
    ]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRouting {}
