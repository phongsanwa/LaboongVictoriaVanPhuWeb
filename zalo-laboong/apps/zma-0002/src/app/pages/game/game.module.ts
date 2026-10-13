import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {GameRouting} from './game.routing';
import {LuckyWheelDemoComponent} from './features/lucky-wheel-demo/lucky-wheel-demo.component';

@NgModule({
  declarations: [LuckyWheelDemoComponent],
  imports: [CommonModule, GameRouting],
})
export class GameModule {}
