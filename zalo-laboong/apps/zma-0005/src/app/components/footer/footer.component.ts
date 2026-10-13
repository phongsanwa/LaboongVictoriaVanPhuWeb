import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit, SimpleChanges
} from '@angular/core';
import {DEFAULT_FOOTER, IFooterCartConfig, IFooterConfig, IFooterItem, IFooterTabsConfig} from '@shared/models/global';
import {HeaderFooterFacadeService} from '@shared/services/global/layout-service/header-footer-facade.service';
import {NgbOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {openChat} from 'zmp-sdk/apis'
import {ProductManageService} from '@shared/services/global';
import {Subject, takeUntil} from 'rxjs';
import {uriFeConst} from '@shared/constants';


@Component({
  selector: 'app-footer',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
    @if (cfg.show !== false) {
      <div [class]="(cfg.className || 'footer') + ' w-100'">
        @if (isTabs(cfg)) {
          <nav class="w-100 p-2 grid footer-nav shadow-lg"
               style="padding-bottom: max(16px, env(safe-area-inset-bottom));">
            @for (item of itemsToRender; track (item?.path ?? $index)) {
              <div
                [routerLink]="item.path"
                [queryParams]="item.queryParams"
                routerLinkActive=""
                [routerLinkActiveOptions]="{ exact: (item.exact ?? (item.path === '/')) }"
                [ngClass]="{ 'no-active': !!item.badge }"
                class="footer-tab d-flex flex-col align-items-center space-y-0.5 p-1 pb-0.5 position-relative cursor-pointer">
                <i [class]="(item.iconClass || '') + ' f-6'"></i>
                <span class="text-2xs mt-1">{{ item.label }}</span>
              </div>
            } @empty {
              <div class="text-center text-muted py-2 text-2xs">Không có mục nào</div>
            }
          </nav>
        }
      </div>
    }
  `
})
export class AppFooterComponent implements OnInit, OnChanges, OnDestroy {
  @Input() items: IFooterItem[] = [
    {path: '/', iconClass: 'ph-bold ph-house', label: 'Trang chủ'},
    {path: uriFeConst.cart.index, iconClass: 'ph-bold ph-shopping-cart', label: 'Đơn hàng'},
    {path: uriFeConst.product.category, iconClass: 'ph-bold ph-squares-four', label: 'Danh mục'},
    {path: '/notification', iconClass: 'ph-bold ph-bell', label: 'Thông báo'},
    {path: uriFeConst.user.profile, iconClass: 'ph-bold ph-user', label: 'Tài khoản'},
  ];

  // state
  cfg: IFooterConfig = DEFAULT_FOOTER;
  itemsToRender: IFooterItem[] = this.items;
  hasProduct = false;

  // services
  readonly hf = inject(HeaderFooterFacadeService);
  private readonly offcanvas = inject(NgbOffcanvas);
  private readonly prdManageService = inject(ProductManageService);
  private readonly cd = inject(ChangeDetectorRef);

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.hf.footer$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cfg => {
        this.cfg = cfg;
        this.recomputeItemsToRender();
        this.cd.markForCheck();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.recomputeItemsToRender();
      this.cd.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isTabs(c: IFooterConfig): c is IFooterTabsConfig {
    return c?.variant === 'tabs';
  }

  toDetail(c: IFooterConfig | null | undefined): IFooterCartConfig | null {
    return c && c.variant === 'cart' ? (c as IFooterCartConfig) : null;
  }

  openChat() {
    openChat({type: 'user', id: '900441440596624596', message: 'Xin chào'});
  }
  private recomputeItemsToRender() {
    if (this.isTabs(this.cfg) && Array.isArray(this.cfg.items) && this.cfg.items.length) {
      this.itemsToRender = this.cfg.items;
    } else {
      this.itemsToRender = this.items;
    }
  }
}
