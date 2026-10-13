import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {LuckywheelComponent} from './features/lucky-wheel/luckywheel.component';
import {LuckyWheelDemoComponent} from './features/lucky-wheel-demo/lucky-wheel-demo.component';

const routes: Routes = [
  {
    path: '',
    component: LuckywheelComponent
  },
  {
    path: 'demo',
    component: LuckyWheelDemoComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GameRouting {}
