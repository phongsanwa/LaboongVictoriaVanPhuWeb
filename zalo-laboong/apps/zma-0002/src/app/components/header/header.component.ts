import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  ViewChild,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {IHeaderConfig, IHeaderGreetingConfig, IHeaderTitleConfig} from '@shared/models/global';
import {IResUserInfo} from '@core/models/zmp.model';
import {uriFeConst} from '@shared/constants';
import {HeaderFooterFacadeService} from '@shared/services/global/layout-service/header-footer-facade.service';
import {AppConfigStateService} from '@core/services/app-config-state.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    @if (cfg && cfg.show !== false) {
      @if (isTitle(cfg)) {
        <div #headerRef class="app-fixed-header d-flex align-items-center back-header safe-pt-8">
          @if (cfg.back !== false) {
            <button type="button"
                    class="btn btn-link p-0 me-2 back-button"
                    (click)="back()">
              <i class="ph-light ph-arrow-left"></i>
            </button>
          }
          <div class="mb-0 text-truncate">
            {{ cfg.title }}
          </div>
        </div>
      } @else if (isGreeting(cfg)) {
        <div #headerRef class="app-fixed-header store-header safe-pt-8">
          <a class="brand-logo" [routerLink]="'/'" [attr.aria-label]="brandTitle">
            @if (brandLogoUrl) {
              <img class="brand-image" [src]="brandLogoUrl" [alt]="brandTitle">
            } @else {
              <span class="brand-mark">S</span>
            }
            <span class="brand-copy">{{ brandTitle }}</span>
          </a>
        </div>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
        flex: 0 0 0;
        height: 0;
      }
      :host(.header-visible) {
        flex-basis: var(--zma-header-height, 67px);
        height: var(--zma-header-height, 67px);
      }
      .app-fixed-header {
        left: 0;
        position: fixed;
        right: 0;
        top: 0;
        width: 100%;
        z-index: 10;
      }
      .back-button{
        font-size: 20px;
        color: #0d0d0d;
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .text-truncate{
        font-size: 16px;
        font-weight: 600;
        line-height: 22px;
      }
      .back-header .text-truncate{
        line-height: 40px;
      }
      .back-header{
        background: #fff;
        min-height: 67px;
        padding: 0 16px 13px;
      }
      .store-header {
        align-items: center;
        background: #fff;
        display: flex;
        gap: 8px;
        justify-content: flex-start;
        min-height: 67px;
        padding: 0 16px 13px;
      }
      .brand-logo {
        align-items: center;
        display: flex;
        gap: 5px;
        min-height: 40px;
      }
      .brand-mark {
        align-items: center;
        background: #3459a7;
        border-radius: 5px;
        color: #fff;
        display: flex;
        font-size: 20px;
        font-weight: 800;
        height: 28px;
        justify-content: center;
        width: 28px;
      }
      .brand-image {
        border-radius: 6px;
        display: block;
        height: 32px;
        object-fit: cover;
        width: 32px;
      }
      .brand-copy {
        color: #3459a7;
        display: block;
        font-family: Roboto, Arial, sans-serif;
        font-size: 16px;
        font-weight: 800;
        line-height: 18px;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
})
export class AppHeaderComponent {
  private readonly facade = inject(HeaderFooterFacadeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly configState = inject(AppConfigStateService);

  cfg?: IHeaderConfig;
  user?: IResUserInfo | null;
  private measuredHeaderHeight = 67;
  private headerResizeObserver?: ResizeObserver;

  @ViewChild('headerRef')
  set headerRef(ref: ElementRef<HTMLElement> | undefined) {
    this.headerResizeObserver?.disconnect();
    if (!ref) return;

    this.measureHeader(ref.nativeElement);
    this.headerResizeObserver = new ResizeObserver(() => this.measureHeader(ref.nativeElement));
    this.headerResizeObserver.observe(ref.nativeElement);
  }

  // Giữ khoảng trống trong layout khi header đang fixed trên cùng.
  @HostBinding('class.header-visible')
  get headerVisible(): boolean {
    return !!this.cfg && this.cfg.show !== false;
  }

  @HostBinding('style.--zma-header-height')
  get hostHeaderHeight(): string {
    return `${this.headerVisible ? this.measuredHeaderHeight : 0}px`;
  }

  constructor() {
    this.destroyRef.onDestroy(() => this.headerResizeObserver?.disconnect());

    this.facade.header$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(cfg => {
        this.cfg = cfg;
        if (!cfg || cfg.show === false) this.measuredHeaderHeight = 0;
        this.cdr.markForCheck();
      });

    this.facade.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(u => { this.user = u; this.cdr.markForCheck(); });
  }

  get brandLogoUrl(): string {
    return this.configState.appLogoUrl || '';
  }

  get brandTitle(): string {
    return this.configState.headerTitle || this.configState.appTitle || 'Clothing store';
  }

  private measureHeader(el: HTMLElement): void {
    const height = el.offsetHeight || 67;
    if (height !== this.measuredHeaderHeight) {
      this.measuredHeaderHeight = height;
      this.cdr.markForCheck();
    }
  }

  back() { this.facade.back(); }
  isTitle(c: IHeaderConfig): c is IHeaderTitleConfig { return c.variant === 'title'; }
  isGreeting(c: IHeaderConfig): c is IHeaderGreetingConfig { return c.variant === 'greeting'; }

  protected readonly uriFeConst = uriFeConst;
}
