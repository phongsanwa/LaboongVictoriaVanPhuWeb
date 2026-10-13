import {Component, inject, Input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule, Params} from '@angular/router';
import {IResAppInfo} from '@core/models/zmp.model';
import {ZmpService} from '@core/services/zmp-service/zmp.service';

@Component({
  selector: 'app-play-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="play-card">
      @if(status) {
        <div class="corner-ribbon"><span>{{ status }}</span></div>
      }
      <div class="top-accent"></div>

      <div class="content">
        <div class="section text-center">
          <div class="subtitle">LƯỢT CHƠI</div>
          <h3 class="title">{{ title }}</h3>

          <div class="brand">
            <img class="brand-logo" [src]="appInfo.logoUrl" alt="logo">
          </div>

          <div class="meta">
            Lượt chơi phát hành lúc {{ publishedAtLabel }} bởi {{ publisher }}
          </div>
          <div class="meta dim">Đã mở link chơi game {{ openedAgo }}</div>
        </div>

        <!-- nút CTA -->
        <a class="btn-cta"
           [routerLink]="link"
           [queryParams]="linkQuery">
          Chơi game
        </a>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .play-card {
      position: relative;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 6px 18px rgba(0, 0, 0, .08);
    }

    .top-accent {
      height: 56px;
      background: var(--brand-color, #f4a33a);
    }

    .content {
      padding: 16px;
      padding-top: 10px;
    }

    .subtitle {
      font-size: .78rem;
      letter-spacing: .08em;
      color: #9aa0a6;
      font-weight: 600;
    }

    .title {
      margin: .25rem 0 1rem;
      font-size: 1.05rem;
      line-height: 1.35;
      font-weight: 700;
      color: #263238;
    }

    .brand {
      display: flex;
      justify-content: center;
      margin: 8px 0 6px;
    }

    .brand-logo {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      object-fit: cover;
      box-shadow: 0 3px 12px rgba(0, 0, 0, .12);
    }

    .meta {
      font-size: .9rem;
      color: #455a64;
      text-align: center;
      line-height: 1.35;
      margin-top: 6px;
    }

    .meta.dim {
      color: #7b8a97;
    }

    .dashed-sep {
      border-top: 1px dashed #d9dee3;
      margin: 14px 0;
      height: 1px;
    }

    .mini-row {
      display: flex;
      gap: 12px;
      align-items: center;
      text-decoration: none;
      background: #fff;
      border: 1px solid #d0d7de;
      border-radius: 12px;
      padding: 10px 12px;
      color: inherit;
    }

    .mini-row:hover {
      background: #fafbfc;
    }

    .mini-logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      object-fit: cover;
    }

    .mini-text {
      flex: 1;
      min-width: 0;
    }

    .mini-title {
      font-weight: 600;
      color: #243447;
    }

    .mini-id {
      color: #7b8a97;
      font-size: .86rem;
    }

    .ellipsis-1 {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-cta {
      display: block;
      text-align: center;
      margin-top: 14px;
      width: 100%;
      text-decoration: none;
      background: var(--brand-color, #f4a33a);
      color: #fff;
      font-weight: 700;
      padding: 12px 16px;
      border-radius: 999px;
      font-size: 1rem;
      box-shadow: 0 6px 14px rgba(244, 163, 58, .35);
    }

    .btn-cta:active {
      transform: translateY(1px);
    }

    .corner-ribbon {
      position: absolute;
      left: -36px;
      top: 10px;
      width: 140px;
      height: 36px;
      transform: rotate(-45deg);
      background: var(--brand-color, #f4a33a);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0, 0, 0, .15);
    }

    .corner-ribbon span {
      color: #fff;
      font-weight: 800;
      font-size: .8rem;
      letter-spacing: .08em;
    }
  `]
})
export class PlayCardComponent implements OnInit {
  @Input() status = 'OPENED';
  @Input() title = 'Vòng Quay May Mắn – Follow Zalo OA YODY, Trúng Quà Liền Tay';

  @Input() brandLogo = '';

  appInfo: IResAppInfo = {
    appUrl: '',
    description: '',
    name: '',
    qrCodeUrl: '',
    version: '',
    logoUrl: '',
  }

  @Input() publisher = 'Vòng Quay May Mắn – Follow Zalo OA Nhanh Official, Trúng Quà Liền Tay';
  @Input() publishedAtLabel = '09:34 04-10-2025';
  @Input() openedAgo = '19 ngày trước';

  @Input() gameName = 'Vòng Quay May Mắn – Follow Zalo…';
  @Input() gameId = 'fbff9e70192c2745a300835370...';

  /** Route đích – mặc định tới trang vòng quay */
  @Input() link: string = '/luckywheel';
  @Input() linkQuery?: Params;

  private zmpService = inject(ZmpService);

  ngOnInit() {
    this.zmpService.getAppInfo$().subscribe({
      next: res => {
        this.appInfo = res as IResAppInfo;
      }
    })
  }
}
