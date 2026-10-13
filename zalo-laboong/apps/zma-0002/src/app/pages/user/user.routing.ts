import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {UserComponent} from "./features/user/user.component";
import {MembershipComponent} from './features/membership/membership.component';
import {AddressIndexComponent} from './features/address/index/address-index.component';
import {AddressAddComponent} from './features/address/add/address-add.component';
import {VoucherComponent} from './features/voucher/voucher.component';
import {TermPolicyListComponent} from './features/policies/term-policy.component';
import {PolicyDetailComponent} from './features/policies/detail/policy-detail.component';
import {PointsComponent} from './features/points/points.component';
import {UserEditComponent} from './features/user/edit/user-edit.component';
import {ReviewsComponent} from './features/reviews/reviews.component';
import {ReviewFormComponent} from './features/reviews/review-form.component';

const routes: Routes = [
  {
    path: 'profile',
    component: UserComponent,
    data: {handle: {logo: true}}
  },
  {
    path: 'membership',
    component: MembershipComponent,
    data: {handle: {logo: true}}
  },
  {
    path: 'profileedit',
    component: UserEditComponent,
  },
  {
    path: 'points',
    component: PointsComponent,
  },
  {
    path: 'reviews',
    children: [
      {
        path: 'form',
        component: ReviewFormComponent,
      },
      {
        path: '',
        component: ReviewsComponent,
      },
    ]
  },
  {
    path: 'address',
    children: [
      {
        path: 'add',
        component: AddressAddComponent
      },
      {
        path: '',
        component: AddressIndexComponent,
      },
    ]
  },
  {
    path: 'voucher',
    component: VoucherComponent,
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
export class UserRouting {
}
