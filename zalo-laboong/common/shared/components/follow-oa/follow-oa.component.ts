import {Component, OnInit, Input, ViewEncapsulation, OnDestroy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FollowOAService} from './follow-oa.service';
import {Subject, takeUntil} from 'rxjs';
import {AppService, NotifyService} from '@core/services';

@Component({
  selector: 'app-follow-oa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './follow-oa.component.html',
  styleUrls: ['./follow-oa.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [FollowOAService],
})
export class FollowOAComponent implements OnInit, OnDestroy {
  @Input() oaId = '';
  @Input() buttonText = 'Quan tâm';
  @Input() img = '';
  @Input() explanationTitle = 'Nhanh.vn Official';
  @Input() explanationContent = 'Quan tâm OA để nhận các chương trình đặc quyền ưu đãi';

  hasFollowed = false;
  private destroy$ = new Subject<void>();

  constructor(
    private followOAService: FollowOAService,
    private appService: AppService,
    private notifyService: NotifyService
  ) {
  }

  ngOnInit(): void {
    if (this.appService.getUserInfo && this.appService.getUserInfo.followedOA) {
      this.hasFollowed = true
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** event follow OA */
  onHandlerFollow(): void {
    if (this.hasFollowed) return;

    this.followOAService.onFollowOA()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: string) => {
          if (res === 'followed' || res === 'already') {
            this.hasFollowed = true;
            this.notifyService.success('Quan tâm thành công!')
          }
        }
      });
  }
}
