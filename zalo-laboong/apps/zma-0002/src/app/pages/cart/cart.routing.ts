import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {CartComponent} from './features/cart-component';
import {CartFlowComponent} from '@shared/components/cart-flow';

const routes: Routes = [
  {
    path: 'index',
    component: CartFlowComponent
  },
  {
    path: 'index2',
    component:  CartComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CartRoutingModule {}
