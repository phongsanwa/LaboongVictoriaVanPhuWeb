import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {OrderRouting} from './order.routing';
import {TrackingOrderComponent} from './features/index/tracking-order.component';
import {SharedCommonModule} from '@shared/shared-common.module';
import {OrderStatusPillComponent} from '@shared/components/order-status-pill/order-status-pill.component';
import {TrackingOrderDetailComponent} from './features/detail/tracking-order-detail.component';

@NgModule({
  declarations: [
    TrackingOrderComponent,
    TrackingOrderDetailComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    OrderRouting,
    SharedCommonModule,
    OrderStatusPillComponent
  ]
})
export class OrderModule {
}
