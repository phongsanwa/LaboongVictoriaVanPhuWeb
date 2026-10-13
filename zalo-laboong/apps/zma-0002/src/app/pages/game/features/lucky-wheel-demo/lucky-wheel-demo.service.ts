import {Injectable} from '@angular/core';
import {delay, Observable, of} from 'rxjs';
import {MOCK_GAME_INFO, MOCK_REWARDS} from './lucky-wheel-demo.mock';
import {MiniGameInfo, MiniGameSpinResult} from './lucky-wheel-demo.models';

@Injectable({providedIn: 'root'})
export class LuckyWheelDemoService {
  private gameInfo: MiniGameInfo = this.clone(MOCK_GAME_INFO);
  private cursor = 0;

  getGameInfo(): Observable<MiniGameInfo> {
    return of(this.clone(this.gameInfo)).pipe(delay(250));
  }

  spin(): Observable<MiniGameSpinResult> {
    const segments = this.gameInfo.segments;
    const winnerSegment = segments[this.cursor % segments.length];
    const reward = MOCK_REWARDS.find(item => item.rewardId === winnerSegment.rewardId) ?? MOCK_REWARDS[0];

    this.cursor += 1;
    this.gameInfo.remainingSpins = Math.max(0, this.gameInfo.remainingSpins - 1);

    if (reward.status !== 'none') {
      this.gameInfo.lastRewards = [reward, ...this.gameInfo.lastRewards].slice(0, 5);
    }

    return of({
      spinId: `spin_${Date.now()}`,
      campaignId: this.gameInfo.campaignId,
      rewardId: reward.rewardId,
      segmentId: winnerSegment.segmentId,
      segmentIndex: winnerSegment.segmentIndex,
      remainingSpins: this.gameInfo.remainingSpins,
      reward: this.clone(reward),
    }).pipe(delay(450));
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
