import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {OrderComponent} from './features/index/order.component';
import {OrderRouting} from './order.routing';
import {SharedCommonModule} from '@shared/shared-common.module';
import {OrderStatusPillComponent} from "@shared/components/order-status-pill/order-status-pill.component";
import {OrderDetailComponent} from './features/detail/order-detail.component';

@NgModule({
  declarations: [
    OrderComponent,
    OrderDetailComponent
  ],
	 imports: [
		  CommonModule,
		  FormsModule,
		  OrderRouting,
		  SharedCommonModule,
		  OrderStatusPillComponent
	 ]
})
export class OrderModule {}
