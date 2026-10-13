import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {OrderComponent} from './features/index/order.component';
import {OrderDetailComponent} from './features/detail/order-detail.component';

const routes: Routes = [
  {
    path: 'list',
    component: OrderComponent,
  },
  {
    path: 'detail',
    component: OrderDetailComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrderRouting {}
