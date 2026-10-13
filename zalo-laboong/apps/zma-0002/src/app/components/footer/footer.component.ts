import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DoCheck,
  inject,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  DEFAULT_FOOTER,
  IFooterCartConfig,
  IFooterConfig,
  IFooterTabsConfig
} from '@shared/models/global';
import {HeaderFooterFacadeService} from '@shared/services/global/layout-service/header-footer-facade.service';
import {NgbOffcanvasOptions} from '@ng-bootstrap/ng-bootstrap';
import {CartManageService} from '@shared/services/global/cart/cart-manage.service';
import {OffcanvasCustomService, ProductManageService} from '@shared/services/global';
import {finalize, Subject, takeUntil} from 'rxjs';
import {uriFeConst} from '@shared/constants';
import {Router, NavigationEnd} from '@angular/router';
import {ICartData} from '@shared/models/feature-specific';
import {IResUserInfo} from '@core/models/zmp.model';
import {AllScope} from '@shared/models/feature-specific/zmp.model';
import {UserManageService} from '@shared/services/global/user/user-manage.service';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {QrcodeOffcanvasComponent} from '../action/QrcodeModal.component';

@Component({
  selector: 'app-footer',
  styleUrls: ['./footer.component.scss'],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AppFooterComponent extends AppCommonComponent implements OnInit, OnDestroy, DoCheck {
  public prdService = inject(ProductManageService);

  cfg: IFooterConfig = DEFAULT_FOOTER;

  @Input() cartData!: ICartData;
  userInfo!: IResUserInfo;

  // inject service
  readonly hf = inject(HeaderFooterFacadeService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly offcanvasSvc = inject(OffcanvasCustomService);

  private destroy$ = new Subject<void>();
  private prevTotalAmount = 0;
  private prevTotalQuantities = 0;

  // ✅ Biến dùng để xác định route hiện tại
  currentPath: string = '/';

  constructor(
    public cartService: CartManageService,
    private router: Router,
    private userMsService: UserManageService
    ) {
      super();
      this.userService.userInfo$
        .subscribe(info => {
        if (info) {
          this.userInfo = info;
        }
      });
  }

  ngOnInit(): void {
    this.cartService.handlerLoadData();
    this.prevTotalAmount = this.cartService.totalAmount;
    this.prevTotalQuantities = this.cartService.totalQuantities;
    this.currentPath = this.router.url.split('?')[0] || '/';
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.currentPath = event.urlAfterRedirects.split('?')[0] || '/';
          this.cd.markForCheck();
        }
      });


    this.hf.footer$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cfg => {
        this.cfg = cfg;
        this.cd.markForCheck();
      });
  }

  ngDoCheck(): void {
    const currentAmount = this.cartService.totalAmount;
    const currentQuantities = this.cartService.totalQuantities;
    if (currentAmount !== this.prevTotalAmount || currentQuantities !== this.prevTotalQuantities) {
      this.cd.markForCheck();
      this.prevTotalAmount = currentAmount;
      this.prevTotalQuantities = currentQuantities;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isTabs(c: IFooterConfig): c is IFooterTabsConfig {
    return c?.variant === 'tabs';
  }

  isCartFlow(c: IFooterConfig): c is IFooterCartConfig {
    return c?.variant === 'cart' && c.mode === 'cart-flow';
  }

  LinkToProfile(userInfo: IResUserInfo | null | undefined) {
    // Nếu đã có userInfo => vào luôn
    if (userInfo && userInfo.name) {
      this.navService.redirect([uriFeConst.user.profile]);
      return;
    }

    // Nếu chưa có → xin quyền
    const scopes: AllScope[] = ['scope.userInfo', 'scope.userPhonenumber'];
    const granted = this.userService.getGrantedScopes();
    const isGrantedAll = scopes.every(s => granted.includes(s));

    if (isGrantedAll) {
      // Đã có đủ quyền thì load lại user (phòng trường hợp dữ liệu local chưa sync)
      this.navService.redirect([uriFeConst.user.profile]);
      return;
    }

    // Chưa đủ quyền → gọi xin quyền
    this.grantPermission(scopes, true);
  }

  grantPermission(scopes: AllScope[], redirectAfter: boolean = false) {
    this.spinner.show();

    this.userMsService.grantPermissionAndLogin$(scopes)
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => this.spinner.hide())
      )
      .subscribe({
        next: (res) => {
          if (!res) {
            this.notifyService.error('Có lỗi xảy ra khi xin quyền.');
            return;
          }
          console.log('run grantPermissionAndLogin$')
          const { perms, userInfo, token, authContext } = res;

          if (userInfo) {
            this.userService.saveGrantAndUser(perms, userInfo);
            console.log('token', token);
            console.log('authContext', authContext);
            if (token && authContext) {
              this.userService.saveInternalAuth(token, 0, authContext);
            }

            this.notifyService.success('Đã cập nhật thông tin người dùng.');

            if (redirectAfter) {
              this.navService.redirect([uriFeConst.user.profile]);
            }
            return;
          }

          const missing = scopes.filter(s => !perms?.[s]);
          if (missing.length) {
            this.notifyService.warning('Bạn chưa cấp đủ quyền cần thiết (User info / Phone).');
          } else {
            this.notifyService.error('Không thể lấy thông tin người dùng.');
          }
        },

        error: () => {
          this.notifyService.error('Đã xảy ra lỗi khi cấp quyền.');
        }
      });
  }


  isCartPage(): boolean {
    return this.router.url.split('?')[0] === uriFeConst.cart.index;
  }

  isActive(path: string): boolean {
    const current = this.currentPath || this.router.url.split('?')[0] || '/';

    if (path === '/' && (current === '/' || current === '')) {
      return true;
    }

    return current === path;
  }


  onChangeQrcode() {
    const opts: NgbOffcanvasOptions = {
      position: 'bottom',
      backdrop: true,
      keyboard: true,
      scroll: false,
      container: 'body',
      panelClass: 'offcanvas-bottom-sheet',
    };
    const ref = this.offcanvasSvc.open(QrcodeOffcanvasComponent, opts);
  }



  protected readonly uriFeConst = uriFeConst;

  formatPrice(price: number): string {
    return (price ?? 0).toLocaleString('vi-VN') + ' VND';
  }
}
