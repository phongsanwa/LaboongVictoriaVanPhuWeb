import {Component, OnDestroy, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {finalize, Subject, takeUntil} from 'rxjs';
import {MiniGameInfo, MiniGameReward, MiniGameSegment, MiniGameSpinResult} from './lucky-wheel-demo.models';
import {LuckyWheelDemoService} from './lucky-wheel-demo.service';

@Component({
  selector: 'app-lucky-wheel-demo',
  templateUrl: './lucky-wheel-demo.component.html',
  styleUrls: ['./lucky-wheel-demo.component.scss'],
  standalone: false,
})
export class LuckyWheelDemoComponent extends AppCommonComponent implements OnInit, OnDestroy {
  gameInfo: MiniGameInfo | null = null;
  result: MiniGameSpinResult | null = null;
  viewMode: 'game' | 'rules' = 'game';
  loading = true;
  spinning = false;
  showResult = false;
  wheelRotation = 0;

  private destroy$ = new Subject<void>();

  constructor(private miniGame: LuckyWheelDemoService) {
    super();
  }

  ngOnInit(): void {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Mini game'});
    this.setFooter({variant: 'tabs', show: false});
    this.loadGame();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get segments(): MiniGameSegment[] {
    return this.gameInfo?.segments ?? [];
  }

  get remainingSpins(): number {
    return this.gameInfo?.remainingSpins ?? 0;
  }

  get canSpin(): boolean {
    return !!this.gameInfo && this.gameInfo.status === 'active' && this.remainingSpins > 0 && !this.spinning;
  }

  get statusText(): string {
    if (!this.gameInfo) return 'Đang tải chương trình';
    if (this.gameInfo.status === 'active' && this.remainingSpins > 0) {
      return `Bạn còn ${String(this.remainingSpins).padStart(2, '0')} lượt`;
    }
    if (this.gameInfo.status === 'active') return 'Bạn đã hết lượt quay';
    if (this.gameInfo.status === 'not_started') return 'Chương trình chưa bắt đầu';
    if (this.gameInfo.status === 'ended') return 'Chương trình đã kết thúc';
    if (this.gameInfo.status === 'sold_out') return 'Chương trình đã hết quà';
    if (this.gameInfo.status === 'paused') return 'Chương trình đang tạm dừng';
    return 'Bạn chưa đủ điều kiện tham gia';
  }

  wheelBackground(): string {
    const count = Math.max(this.segments.length, 1);
    const angle = 360 / count;
    const stops = this.segments.map(segment => {
      const start = segment.segmentIndex * angle;
      const end = start + angle;

      return `${segment.color ?? '#ffffff'} ${start}deg ${end}deg`;
    });

    return `conic-gradient(from ${-90 - angle / 2}deg, ${stops.join(', ')})`;
  }

  labelStyle(segment: MiniGameSegment): Record<string, string> {
    const count = Math.max(this.segments.length, 1);
    const angle = 360 / count;
    const rotate = -90 + segment.segmentIndex * angle;

    return {
      transform: `translate(-50%, -50%) rotate(${rotate}deg) translateY(-78px) rotate(90deg)`,
      color: segment.textColor ?? '#ffffff',
    };
  }

  openRules(): void {
    this.viewMode = 'rules';
    this.setHeader({variant: 'title', show: true, back: true, title: 'Mini game'});
  }

  backToGame(): void {
    this.viewMode = 'game';
    this.setHeader({variant: 'title', show: true, back: true, title: 'Mini game'});
  }

  spin(): void {
    if (!this.canSpin || !this.gameInfo) return;

    this.spinning = true;
    this.showResult = false;
    this.result = null;

    this.miniGame
      .spin()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.spinning = false;
        }),
      )
      .subscribe(res => {
        this.gameInfo = {
          ...this.gameInfo!,
          remainingSpins: res.remainingSpins,
        };
        this.result = res;
        this.animateToSegment(res.segmentIndex);
      });
  }

  closeResult(): void {
    if (this.showResult && this.result && this.gameInfo && this.result.reward.status !== 'none') {
      this.gameInfo = {
        ...this.gameInfo,
        lastRewards: [this.result.reward, ...this.gameInfo.lastRewards].slice(0, 5),
      };
    }

    this.showResult = false;
  }

  rewardBadge(reward: MiniGameReward): string {
    if (reward.type === 'voucher' && reward.voucherCode) return reward.voucherCode;
    if (reward.type === 'physical_gift') return 'Chờ nhận quà';
    if (reward.type === 'points') return 'Đã cộng điểm';
    return 'Chúc may mắn';
  }

  private loadGame(): void {
    this.loading = true;
    this.miniGame
      .getGameInfo()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe(info => {
        this.gameInfo = info;
      });
  }

  private animateToSegment(segmentIndex: number): void {
    const count = Math.max(this.segments.length, 1);
    const slice = 360 / count;
    const targetAngle = this.normalizeAngle(90 - segmentIndex * slice);
    const currentAngle = this.normalizeAngle(this.wheelRotation);
    const deltaToTarget = this.normalizeAngle(targetAngle - currentAngle);

    this.wheelRotation = this.wheelRotation + 360 * 5 + deltaToTarget;

    window.setTimeout(() => {
      this.showResult = true;
    }, 3900);
  }

  private normalizeAngle(angle: number): number {
    return ((angle % 360) + 360) % 360;
  }
}
