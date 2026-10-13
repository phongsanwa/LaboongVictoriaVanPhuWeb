import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {LuckyWheelDemoComponent} from './features/lucky-wheel-demo/lucky-wheel-demo.component';

const routes: Routes = [
  {
    path: 'demo',
    component: LuckyWheelDemoComponent,
  },
  {
    path: '',
    component: LuckyWheelDemoComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GameRouting {}
