import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {LuckywheelComponent} from './features/lucky-wheel/luckywheel.component';
import {GameRouting} from './game.routing';
import {LuckyWheelComponent} from '@shared/components/game/lucky-wheel.component';
import {ReactiveFormsModule} from '@angular/forms';
import {LuckyWheelDemoComponent} from './features/lucky-wheel-demo/lucky-wheel-demo.component';

@NgModule({
  declarations: [
    LuckywheelComponent,
    LuckyWheelDemoComponent
  ],
  imports: [
    CommonModule,
    GameRouting,
    ReactiveFormsModule,
    LuckyWheelComponent
  ]
})
export class GameModule {}
