import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {UserComponent} from "./features/user/user.component";
import {MembershipComponent} from './features/membership/membership.component';
import {PointsComponent} from './features/points/points.component';
import {UserEditComponent} from './features/user/edit/user-edit.component';
import {VoucherComponent} from './features/voucher/voucher.component';
import {CreateAddressComponent} from './features/address/create-address.component';

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
    path: 'points',
    component: PointsComponent,
  },
  {
    path: 'voucher',
    component: VoucherComponent,
  },
  {
    path: 'profileedit',
    component: UserEditComponent,
  },
  {
    path: 'address',
    component: CreateAddressComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRouting {}
