import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {IHeaderConfig, IHeaderGreetingConfig, IHeaderTitleConfig} from '@shared/models/global';
import {IResUserInfo} from '@core/models/zmp.model';
import {uriFeConst} from '@shared/constants';
import {HeaderFooterFacadeService} from '@shared/services/global/layout-service/header-footer-facade.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    @if (cfg && cfg.show !== false) {
      <div
        [class]="
          (cfg.className ?? 'header-color') +
          ' h-14 safe-pt-16 safe-pb-16 header-user-icon header w-100 d-flex align-items-center pr-2 pr-2' +
          ((cfg.variant === 'greeting') ? ' home' : '')
        "
      >
        @if (isGreeting(cfg)) {
          <div
            [routerLink]="uriFeConst.user.profile"
            class="user-header rounded d-flex align-items-center"
          >
            <img
              [src]="user?.avatar ?? 'assets/img/avatar-placeholder.jpg'"
              [attr.alt]="user?.name ?? ''"
              class="rounded-circle me-2"
              width="40"
              height="40"
            />
            <div class="text-black">
              @if (user?.name) {
                <div class="fw-bold">{{ user?.name }}</div>
                @if (user?.phoneNumber) {
                  <div class="small">{{ user?.phoneNumber }}</div>
                }
              } @else if (cfg.showGreetingText !== false) {
                <div class="small">Xin chào,</div>
                <div class="fw-bold">Guest</div>
              }
            </div>
          </div>
        } @else if (isTitle(cfg)) {
              <div class="header-search">
                  <div class="navigate-home">
                    @if (cfg.back !== false) {
                    <div class="navigate-home-icon">
                      <a (click)="back()" class="chevron-home"><i class="ph ph-caret-left"></i></a>
                      <a (click)="back()" class="home-icon"><i class="ph-light ph-house"></i></a>
                    </div>
                    }
                    <h1>{{ cfg.title }}</h1>
                  </div>
              </div>
        }
      </div>
    }
  `,
  styles: [`
    .header-color.home {
      position: fixed;
      left: 0;
      width: 100%;
      background: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      z-index: 999;
      display: none !important;
    }
    .header.header-user-icon:not(.home){
      position: relative;
      padding-top: calc(max(16px, var(--zaui-safe-area-inset-top)) + var(--zaui-safe-extra-top)) !important;
    }
    .header-color.scroll {
      display: flex !important;
    }
    .title-page {
      font-size: 16px;
      font-weight: 600;
    }
    .header-user-icon{
      padding: 0 10px;
    }
    .back-button{ padding:.5rem; background:transparent; border:0; color:#fff; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; border-radius:.25rem; }
    .back-button:focus{ outline:none; box-shadow:0 0 0 2px rgba(255,255,255,.3); }
    .header-color.header-user-icon .user-header {
      position: relative;
    }
    .navigate-home {
      display: flex;
      align-items: center;
      column-gap: 5px;
    }

    .navigate-home h1 {
      margin-bottom: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .navigate-home-icon {
      padding: 5px 10px;
      border: 1px solid #dcdcdc;
      border-radius: 20px;
    }

    .navigate-home-icon a {
      padding-right: 10px;
      border-right: 1px solid #dcdcdc;
      margin-right: 10px;
    }

    .navigate-home-icon a:last-child {
      padding-right: 0;
      margin-right: 0;
      border-right: none;
    }
    .header-color-blue {
      background: #e8f1ff;
    }
  `]
})
export class AppHeaderComponent {
  private readonly facade = inject(HeaderFooterFacadeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  cfg?: IHeaderConfig;
  user?: IResUserInfo | null;

  constructor() {
    this.facade.header$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(cfg => { this.cfg = cfg; this.cdr.markForCheck(); });

    this.facade.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(u => { this.user = u; this.cdr.markForCheck(); });
  }

  back() { this.facade.back(); }
  isGreeting(c: IHeaderConfig): c is IHeaderGreetingConfig { return c.variant === 'greeting'; }
  isTitle(c: IHeaderConfig): c is IHeaderTitleConfig { return c.variant === 'title'; }

  protected readonly uriFeConst = uriFeConst;
}
