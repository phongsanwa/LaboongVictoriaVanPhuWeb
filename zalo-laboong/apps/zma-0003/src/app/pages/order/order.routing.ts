import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {TrackingOrderComponent} from './features/index/tracking-order.component';
import {TrackingOrderDetailComponent} from './features/detail/tracking-order-detail.component';

const routes: Routes = [
  {
    path: 'tracking',
    component: TrackingOrderComponent,
  },
  {
    path: 'trackingdetail',
    component: TrackingOrderDetailComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrderRouting {}
