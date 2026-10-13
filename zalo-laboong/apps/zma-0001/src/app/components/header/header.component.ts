import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
  IHeaderConfig,
  IHeaderGreetingConfig,
  IHeaderTitleConfig,
} from '@shared/models/global';
import {IResUserInfo} from '@core/models/zmp.model';
import {uriFeConst} from '@shared/constants';
import {HeaderFooterFacadeService} from '@shared/services/global/layout-service/header-footer-facade.service';
import {AppConfigStateService} from '@core/services/app-config-state.service';
import {UserService} from '@core/services/user.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    @if (cfg && cfg.show !== false) {
      <div
        [class]="
          (cfg.className ?? 'header-color') +
          ' h-14 safe-pt-16 header-user-icon w-100 d-flex align-items-center px-2 py-2'
        "
      >
        @if (isGreeting(cfg)) {
          <div
            [routerLink]="uriFeConst.user.profile"
            class="user-header rounded d-flex align-items-center"
          >
<!--            <img-->
<!--              [src]="user?.avatar ?? 'assets/img/avatar-placeholder.jpg'"-->
<!--              [attr.alt]="user?.name ?? ''"-->
<!--              class="rounded-circle me-2"-->
<!--              width="48"-->
<!--              height="48"-->
<!--            />-->

            <div class="avatar-brand">
              <img
                [src]="brandLogoUrl"
                class="rounded-circle avatar-brand_img"
                width="48"
                height="48"
              />
            </div>

            <div class="text-white ms-2">
<!--              @if (user?.name) {-->
<!--                <div class="fw-bold">{{ user?.name }}</div>-->
<!--                @if (user?.phoneNumber) {-->
<!--                  <div class="small">{{ user?.phoneNumber }}</div>-->
<!--                }-->
<!--              } @else if (cfg.showGreetingText !== false) {-->
<!--                <div class="small">Xin chào,</div>-->
<!--                <div class="fw-bold">Guest</div>-->
<!--              }-->

              <div>{{ headerBrand }}</div>
            </div>
          </div>
        } @else if (isTitle(cfg)) {
          <div class="d-flex align-items-center back-header px-1 py-2">
            @if (cfg.back !== false) {
              <button
                type="button"
                class="btn btn-link text-white p-0 me-3 back-button"
                (click)="back()"
              >
                <i class="ph ph-arrow-left ph-lg"></i>
              </button>
            }
            <div class="mb-0 text-white text-truncate">
              {{ cfg.title }}
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .header-color {
        background-color: var(--brand-color);
        padding-bottom: 0.7rem !important;
      }

      .back-button {
        padding: 0.5rem;
        background: transparent;
        border: 0;
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 0.25rem;
      }

      .back-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      .back-button:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
      }

      .header-color.header-user-icon .user-header {
        position: relative;
      }

      .avatar-brand {
        background-color: #ffffff;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;

        .avatar-brand_img {
          width: 32px;
          height: 32px;
        }
      }
    `,
  ],
})
export class AppHeaderComponent implements OnInit {
  private readonly facade = inject(HeaderFooterFacadeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);
  private readonly configState = inject(AppConfigStateService);

  cfg?: IHeaderConfig;
  user?: IResUserInfo | null;

  /** Brand name hiển thị trên greeting header, ưu tiên từ BE config */
  get headerBrand(): string {
    return this.configState.headerTitle || this.configState.appTitle || 'Nhanh Shop';
  }

  /** Logo URL từ BE config, fallback về static default */
  get brandLogoUrl(): string {
    return this.configState.appLogoUrl || '';
  }

  ngOnInit(): void {
    this.facade.header$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cfg) => {
        this.cfg = cfg;
        this.cdr.markForCheck();
      });

    this.userService.userInfo$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((u) => {
        this.user = u;
        this.cdr.markForCheck();
      });
  }

  back() {
    this.facade.back();
  }

  isGreeting(c: IHeaderConfig): c is IHeaderGreetingConfig {
    return c.variant === 'greeting';
  }

  isTitle(c: IHeaderConfig): c is IHeaderTitleConfig {
    return c.variant === 'title';
  }

  protected readonly uriFeConst = uriFeConst;
}
