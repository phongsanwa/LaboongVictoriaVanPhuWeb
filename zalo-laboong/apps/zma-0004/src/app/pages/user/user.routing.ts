import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {UserComponent} from "./features/user/user.component";
import {AddressIndexComponent} from './features/address/index/address-index.component';
import {AddressAddComponent} from './features/address/add/address-add.component';
import {UserEditComponent} from './features/user/edit/user-edit.component';
import {VoucherComponent} from './features/voucher/voucher-list/voucher.component';
import {MembershipComponent} from './features/membership/membership.component';
import {PointsComponent} from './features/points/points.component';
import {AboutUsComponent} from './features/about-us/about-us.component';



const routes: Routes = [
  {
    path: 'profile',
    component: UserComponent,
    data: {handle: {logo: true}}
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
    path: 'profileedit',
    component: UserEditComponent,
  },
  {
    path: 'voucher',
    component: VoucherComponent
  },
  {
    path: 'membership',
    component: MembershipComponent
  },
  {
    path: 'points',
    component: PointsComponent
  },
  {
    path: 'aboutus',
    component: AboutUsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRouting {
}
