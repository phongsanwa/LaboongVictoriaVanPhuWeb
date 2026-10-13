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
import {NgbOffcanvasOptions} from '@ng-bootstrap/ng-bootstrap';
import {openChat} from 'zmp-sdk/apis'
import {CartManageService} from '@shared/services/global/cart/cart-manage.service';
import {ProductManageService} from '@shared/services/global';
import {Subject, takeUntil} from 'rxjs';
import {IResProductDetail} from '@shared/models/api';
import {AddToCartComponent} from '../actions/add-to-cart/add-to-cart.component';
import {CartModalComponent} from '../actions/cart-modal/cart-modal.component';
import {uriFeConst} from '@shared/constants';
import {OffcanvasCustomService} from '@shared/services/global/modal-canvas-custom.service';
import {environment} from '../../../environments';


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

              @if (!!item.path && !item.badge) {
                <a
                  [routerLink]="item.path"
                  [queryParams]="item.queryParams"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: (item.exact ?? (item.path === '/')) }"
                  class="footer-tab no-hover d-flex flex-col align-items-center space-y-0.5 p-1 pb-0.5 position-relative cursor-pointer"
                  [class.disabled]="item.path === uriFeConst.user.voucher"
                >

                  @if (item.iconTypeImg) {
                    <img
                      class="footer-icon-img"
                      [src]="item.iconTypeImg"
                      [attr.alt]="item.label" />
                  } @else {
                    <i [class]="(item.iconClass || '') + ' f-6'"></i>
                  }
                  <span class="text-2xs mt-1">{{ item.label }}</span>
                </a>
              } @else {
                <button
                  type="button"
                  (click)="onNavClick(item, $event)"
                  class="footer-tab no-active as-button d-flex flex-col align-items-center space-y-0.5 p-1 pb-0.5 position-relative cursor-pointer">
                  <i [class]="(item.iconClass || '') + ' f-6'"></i>
                  <span class="text-2xs mt-1">{{ item.label }}</span>

                  @if (item.badge) {
                    <span class="position-absolute translate-middle badge rounded-pill"
                          [style]="'background-color: var(--brand-color);'">
                        {{ (cartManageService.totalQuantities$ | async) ?? 0 }}
                    </span>
                  }
                </button>
              }
            } @empty {
              <div class="text-center text-muted py-2 text-2xs">Không có mục nào</div>
            }
          </nav>
        } @else {
          <div class="row nav-item_nav pt-2 pb-3 align-items-center">
            <div class="col-2">
              <div class="chat_zalo" (click)="openChat()">
                <img [src]="'assets/img/logo_zalo.svg'" alt="Zalo" class="logo-zalo-size"/>
                <div class="zalo-chat_text mt-1">Chat ngay</div>
              </div>
            </div>

            <div class="col-5">
              <button type="button"
                      class="btn add-to-cart w-100 py-2"
                      [disabled]="!hasProduct"
                      (click)="openAddToCart()">
                {{ toDetail(cfg)?.addLabel || 'Thêm vào giỏ' }}
              </button>
            </div>

            <div class="col-5">
              <button type="button"
                      class="btn buy-now w-100 py-2"
                      [disabled]="!hasProduct"
                      (click)="openAddToCart('buyNow')">
                {{ toDetail(cfg)?.buyLabel || 'Mua ngay' }}
              </button>
            </div>
          </div>
          <nav class="w-100 p-2 grid footer-nav shadow-lg"
               style="padding-bottom: max(16px, env(safe-area-inset-bottom));">
            @for (item of itemsToRender; track (item?.path ?? $index)) {

              @if (!!item.path && !item.badge) {
                <a
                  [routerLink]="item.path"
                  [queryParams]="item.queryParams"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: (item.exact ?? (item.path === '/')) }"
                  class="footer-tab no-hover d-flex flex-col align-items-center space-y-0.5 p-1 pb-0.5 position-relative cursor-pointer">

                  @if (item.iconTypeImg) {
                    <img
                      class="footer-icon-img"
                      [src]="item.iconTypeImg"
                      [attr.alt]="item.label" />
                  } @else {
                    <i [class]="(item.iconClass || '') + ' f-6'"></i>
                  }
                  <span class="text-2xs mt-1">{{ item.label }}</span>
                </a>
              } @else {
                <button
                  type="button"
                  (click)="onNavClick(item, $event)"
                  class="footer-tab no-active as-button d-flex flex-col align-items-center space-y-0.5 p-1 pb-0.5 position-relative cursor-pointer">
                  <i [class]="(item.iconClass || '') + ' f-6'"></i>
                  <span class="text-2xs mt-1">{{ item.label }}</span>

                  @if (item.badge) {
                    <span class="position-absolute translate-middle badge rounded-pill"
                          [style]="'background-color: var(--brand-color);'">
                        {{ (cartManageService.totalQuantities$ | async) ?? 0 }}
                    </span>
                  }
                </button>
              }
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
    {path: '/', iconClass: 'ph-light ph-house', label: 'Trang chủ'},
    {
      path: uriFeConst.product.category,
      iconClass: 'ph-light ph-squares-four',
      label: 'Danh mục',
      iconTypeImg: 'assets/img/menu_icon.png'
    },
    {path: uriFeConst.user.voucher, iconClass: 'ph-light ph-ticket', label: 'Ưu đãi'},
    {path: '', iconClass: 'ph-light ph-shopping-cart', label: 'Giỏ hàng', badge: 'dot'},
    {path: uriFeConst.user.profile, iconClass: 'ph-light ph-user', label: 'Thành viên'},
  ];

  // state
  cfg: IFooterConfig = DEFAULT_FOOTER;
  itemsToRender: IFooterItem[] = this.items;
  hasProduct = false;

  // services
  readonly hf = inject(HeaderFooterFacadeService);
  public cartManageService = inject(CartManageService);
  private readonly prdManageService = inject(ProductManageService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly offcanvasSvc = inject(OffcanvasCustomService);

  private destroy$ = new Subject<void>();

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

  onNavClick(item: IFooterItem, ev: MouseEvent) {
    if (!item.path) {
      ev.preventDefault();
      this.openCart({event: ev});
    }
  }

  openChat() {
    openChat({type: 'user', id: environment.OAId, message: 'Xin chào'});
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
