import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import {DEFAULT_FOOTER, IFooterCartConfig, IFooterConfig, IFooterItem, IFooterTabsConfig} from '@shared/models/global';
import {HeaderFooterFacadeService} from '@shared/services/global/layout-service/header-footer-facade.service';
import {Subject, takeUntil} from 'rxjs';
import {openChat} from 'zmp-sdk/apis'
import { Router } from '@angular/router';
import {AddToCartComponent} from '../actions/add-to-cart/add-to-cart.component';
import {uriFeConst} from '@shared/constants';
import {NgbOffcanvasOptions} from '@ng-bootstrap/ng-bootstrap';
import {CartModalComponent} from '../actions/cart-modal/cart-modal.component';
import {CartManageService, OffcanvasCustomService, ProductManageService} from '@shared/services/global';
import {IResProductDetail} from '@shared/models/api';

@Component({
  selector: 'app-footer',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  template: `
      <nav class="bottom-navigation">
        @if (isTabs(cfg)) {
          @for (item of itemsToRender; track (item?.path ?? $index)) {
            @if (!!item.path && !item.badge) {
              <a
                [routerLink]="item.path"
                [queryParams]="item.queryParams"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{exact: true}"
                class="nav-item">

                <div class="nav-icon-wrapper">
                  <i [class]="item.iconClass + ' nav-icon'"></i>
                  @if (item.badge) {
                    <span class="badge-dot"></span>
                  }
                </div>
                @if (isActive(item.path)) {
                  <span class="nav-label">{{ item.label }}</span>
                }
              </a>
            } @else {
              <a
                (click)="onNavClick(item, $event)"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{exact: true}"
                class="nav-item">

                <div class="nav-icon-wrapper">
                  <i [class]="item.iconClass + ' nav-icon'"></i>
                  @if (item.badge) {
                    <span class="badge-dot">{{ (cartManageService.totalQuantities$ | async) ?? 0 }}</span>
                  }
                </div>
                @if (isActive(item.path)) {
                  <span class="nav-label">{{ item.label }}</span>
                }
              </a>
            }

          } @empty {
            <div class="text-center text-muted py-2 small">Không có mục nào</div>
          }
        } @else {
          <div class="row nav-item_nav align-items-between">
            <div class="col-2" [routerLink]="uriFeConst.user.favoriteProducts">
              <div class="wish-list">
                <i class="ph-light ph-heart"></i>
              </div>
            </div>
            <div class="col-2">
              <button type="button"
                      class="btn add-to-cart w-100 py-2"
                      [disabled]="!hasProduct"
                      (click)="openAddToCart()">
                <i class="ph-light ph-shopping-cart"></i>
              </button>
            </div>
            <div class="col-4">
              <div class="support-me" (click)="openChat()">
                <i class="ph-light ph-chat-circle-dots"></i>
                <span>Hỗ trợ</span>
              </div>
            </div>

            <div class="col-4">
              <button type="button"
                      class="btn buy-now w-100 py-2"
                      [disabled]="!hasProduct"
                      (click)="openAddToCart('buyNow')">
                {{ toDetail(cfg)?.buyLabel || 'Mua ngay' }}
              </button>
            </div>
          </div>
        }

      </nav>
  `
})
export class AppFooterComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() items: IFooterItem[] = [
    {path: '/', iconClass: 'ph-bold ph-house', label: 'Trang chủ'},
    {path: uriFeConst.product.category, iconClass: 'ph-bold ph-squares-four', label: 'Tour'},
    {path: '', iconClass: 'ph-bold ph-shopping-cart', label: 'Giỏ hàng', badge: 'dot'},
    {path: '/news', iconClass: 'ph-bold ph-newspaper', label: 'Tin tức'},
    {path: uriFeConst.user.profile, iconClass: 'ph-bold ph-user', label: 'Cá nhân'},
  ];

  // state
  cfg: IFooterConfig = DEFAULT_FOOTER;
  itemsToRender: IFooterItem[] = this.items;
  hasProduct = false;
  // services
  readonly hf = inject(HeaderFooterFacadeService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private destroy$ = new Subject<void>();
  public cartManageService = inject(CartManageService);
  private readonly prdManageService = inject(ProductManageService);
  private readonly offcanvasSvc = inject(OffcanvasCustomService);
  private scrollContainer?: HTMLElement;
  private onScroll = () => {
    if (!this.scrollContainer) return;
    const st = this.scrollContainer.scrollTop;
    const footerEl = document.querySelector('.bottom-navigation') as HTMLElement;
    const headerEl = document.querySelector('.header-color, .header-color-blue, .header-color-white') as HTMLElement;

    if (!footerEl || !headerEl) return;

    const scrollHeight = this.scrollContainer.scrollHeight;
    const clientHeight = this.scrollContainer.clientHeight;
    const isNearBottom = st + clientHeight >= scrollHeight - 50; // threshold 50px

    if (st <= 10) {
      footerEl.classList.remove('hidden');
      headerEl.classList.remove('scroll');
      return;
    }

    if (isNearBottom) {
      footerEl.classList.add('hidden');
      headerEl.classList.add('scroll');
      this.lastScrollTop = st;
      return;
    }

    const scrollDiff = Math.abs(st - this.lastScrollTop);
    if (scrollDiff < 5) {
      return;
    }

    if (st > this.lastScrollTop) {
      // Scroll down
      footerEl.classList.add('hidden');
      headerEl.classList.add('scroll');
    } else {
      // Scroll up
      footerEl.classList.remove('hidden');
      headerEl.classList.remove('scroll');
    }

    this.lastScrollTop = st <= 0 ? 0 : st;
  };
  private lastScrollTop = 0;

  ngOnInit(): void {
    this.hf.footer$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cfg => {
        this.cfg = cfg;
        this.recomputeItemsToRender();
        this.cd.markForCheck();
      });

    this.prdManageService.product$
      .pipe(takeUntil(this.destroy$))
      .subscribe((p: IResProductDetail | null) => {
        this.hasProduct = !!p;
        this.cd.markForCheck();
      });

    this.cartManageService.handlerLoadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.recomputeItemsToRender();
      this.cd.markForCheck();
    }
  }
  ngAfterViewInit() {
    this.scrollContainer = document.querySelector('.flex-1_custom') as HTMLElement;
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', this.onScroll);
    } else {
      window.addEventListener('scroll', this.onScroll);
    }
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.onScroll);
    } else {
      window.removeEventListener('scroll', this.onScroll);
    }
  }

  isTabs(c: IFooterConfig): c is IFooterTabsConfig {
    return c?.variant === 'tabs';
  }
  isActive(path: string): boolean {
    const currentUrl = this.router.url.split('?')[0];
    return currentUrl === path;
  }
  openChat() {
    openChat({type: 'user', id: '900441440596624596', message: 'Xin chào'});
  }

  toDetail(c: IFooterConfig | null | undefined): IFooterCartConfig | null {
    return c && c.variant === 'cart' ? (c as IFooterCartConfig) : null;
  }

  onNavClick(item: IFooterItem, ev: MouseEvent) {
    if (!item.path) {
      ev.preventDefault();
      this.openCart({event: ev});
    }
  }
  openAddToCart(type?: string) {
    const opts: NgbOffcanvasOptions = {
      position: 'bottom',
      backdrop: true,
      keyboard: true,
      scroll: false,
      container: 'body',
      panelClass: 'offcanvas-bottom-sheet',
    };

    const ref = this.offcanvasSvc.open(AddToCartComponent, opts);
    ref.componentInstance.prdService = this.prdManageService;
    ref.componentInstance.type = type;
    ref.closed.subscribe(() => this.cd.markForCheck());
  }

  openCart(_ctx?: { event: MouseEvent }) {
    this.cartManageService.handlerLoadData();

    const opts: NgbOffcanvasOptions = {
      position: 'bottom',
      backdrop: true,
      keyboard: true,
      scroll: false,
      container: 'body',
      panelClass: 'offcanvas-bottom-sheet',
    };

    const ref = this.offcanvasSvc.open(CartModalComponent, opts);
    ref.componentInstance.cartData = this.cartManageService.cartData;
    ref.closed.subscribe(() => this.cd.markForCheck());
  }

  private recomputeItemsToRender() {
    if (this.isTabs(this.cfg) && Array.isArray(this.cfg.items) && this.cfg.items.length) {
      this.itemsToRender = this.cfg.items;
    } else {
      this.itemsToRender = this.items;
    }
  }

  protected readonly uriFeConst = uriFeConst;
}
