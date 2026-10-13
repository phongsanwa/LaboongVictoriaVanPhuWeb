import {Component, OnInit} from "@angular/core";
import {IResAppInfo, IResUserInfo} from "@core/models/zmp.model";
import {AppCommonComponent} from "@shared/components/app-common.service";
import {uriFeConst} from "@shared/constants";
import {finalize, take, takeUntil} from 'rxjs';
import {ILoyaltyMe, IResStatusTrackingOrder} from '@shared/models/api';
import {OrderApiService} from '@shared/services/api/order/order-api.service';
import {ZmpService} from '@core/services/zmp-service/zmp.service';
import {NotifyService} from '@core/services';
import {UserManageService} from '@shared/services/global/user/user-manage.service';
import {AllScope} from '@shared/models/feature-specific/zmp.model';
import {AppConfigStateService} from '@core/services/app-config-state.service';
import {environment} from '../../../../../environments';
import {LoyaltyApiService} from '@shared/services/api';

interface MemberMenuItem {
  label: string;
  icon: string;
  route?: string;
  queryParams?: Record<string, unknown>;
  action?: 'logout';
  requiresTemplateFallback?: boolean;
}

interface OrderShortcut {
  label: string;
  icon: string;
  route?: string;
  queryParams?: Record<string, unknown>;
}

type MemberRankKey = 'member' | 'silver' | 'gold';

interface MemberRankView {
  key: MemberRankKey;
  label: string;
}

@Component({
  selector: "app-user",
  templateUrl: "./user.component.html",
  styleUrls: ["./user.component.scss"],
  standalone: false,
})
export class UserComponent extends AppCommonComponent implements OnInit {
  private readonly fallbackQrUrl = 'assets/img/miniapp_qr.png';
  private readonly memberRankViews: Record<MemberRankKey, MemberRankView> = {
    member: {key: 'member', label: 'Thành viên'},
    silver: {key: 'silver', label: 'Bạc'},
    gold: {key: 'gold', label: 'Vàng'},
  };
  appInfo?: IResAppInfo;
  userInfo!: IResUserInfo;
  orderStatusData: IResStatusTrackingOrder[] = [];
  loyaltyMe: ILoyaltyMe | null = null;
  private isGranting = false;
  private loyaltyLoaded = false;

  readonly menuItems: MemberMenuItem[] = [
    {label: 'Điểm của tôi', icon: 'ph-bold ph-clock', route: uriFeConst.user.points},
    {label: 'Ưu đãi', icon: 'ph-bold ph-ticket', route: uriFeConst.user.voucher, requiresTemplateFallback: true},
    {label: 'Mini game', icon: 'ph-bold ph-game-controller', route: uriFeConst.game, requiresTemplateFallback: true},
    {label: 'Sổ địa chỉ', icon: 'ph-bold ph-address-book', route: uriFeConst.user.address},
    {label: 'Điều khoản và chính sách', icon: 'ph-bold ph-shield-check', route: uriFeConst.user.termsAndPolicy},
  ];

  readonly guestMenuItems: MemberMenuItem[] = [
    {label: 'Thông tin tài khoản', icon: 'ph-bold ph-user', route: uriFeConst.user.profileEdit},
    {label: 'Đơn hàng', icon: 'ph-bold ph-package', route: uriFeConst.order.tracking},
    {label: 'Điểm của tôi', icon: 'ph-bold ph-clock', route: uriFeConst.user.points},
    {
      label: 'Voucher của tôi',
      icon: 'ph-bold ph-ticket',
      route: uriFeConst.user.voucher,
      requiresTemplateFallback: true
    },
    {label: 'Mini game', icon: 'ph-bold ph-game-controller', route: uriFeConst.game, requiresTemplateFallback: true},
    {label: 'Sổ địa chỉ', icon: 'ph-bold ph-address-book', route: uriFeConst.user.address},
    {label: 'Điều khoản và chính sách', icon: 'ph-bold ph-shield-check', route: uriFeConst.user.termsAndPolicy},
  ];

  readonly orderShortcuts: OrderShortcut[] = [
    {label: 'Chờ thanh toán', icon: 'assets/img/status_icon_1.png', queryParams: {status: 1}},
    {label: 'Đang xử lý', icon: 'assets/img/status_icon_2.png', queryParams: {status: 2}},
    {label: 'Đang giao', icon: 'assets/img/status_icon_3.png', queryParams: {status: 4}},
    {label: 'Đánh giá', icon: 'assets/img/status_icon_4.png', route: uriFeConst.user.reviews},
  ];

  constructor(
    private orderApi: OrderApiService,
    private zmpService: ZmpService,
    private notify: NotifyService,
    private userMsService: UserManageService,
    private configState: AppConfigStateService,
    private loyaltyApi: LoyaltyApiService,
  ) {
    super();
    this.userService.userInfo$
      .subscribe(info => {
        if (info) {
          this.userInfo = info;
          this.loadLoyalty();
        }
      });
  }

  ngOnInit(): void {

    this.setHeader({
      variant: 'greeting',
      show: true,
      showGreetingText: false,
    });

    this.setFooter({
      variant: "tabs",
      show: true,
    });

    this.zmpService.getAppInfo$()
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: res => {
          this.appInfo = res as IResAppInfo;
        }
      });

    const params = {
      mobile: this.appService.getUserInfo && this.appService.getUserInfo.phoneNumber ?
        this.appService.getUserInfo.phoneNumber : '',
      act: 'status'
    }
    this.orderApi.getStatusTracking(params)
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: res => {
          if (!res.code) return;
          this.orderStatusData = Array.isArray(res.data) ? res.data : [];
        }
      })
    this.loadLoyalty();
  }

  grantPermission(afterGranted?: () => void): void {
    if (this.isGranting) return;
    this.isGranting = true;

    const scopes: AllScope[] = ['scope.userInfo', 'scope.userPhonenumber'];
    this.spinner.show();

    this.userMsService.grantPermissionAndLogin$(scopes)
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => {
          this.isGranting = false;
          this.spinner.hide();
        })
      )
      .subscribe({
        next: (res) => {
          if (!res) {
            this.notify.error('Có lỗi xảy ra khi xin quyền.');
            return;
          }

          const {perms, userInfo, token, authContext} = res;
          if (!userInfo) {
            const missing = scopes.filter(scope => !perms?.[scope]);
            if (missing.length) {
              this.notify.warning('Bạn chưa cấp đủ quyền cần thiết.');
            } else {
              this.notify.error('Không thể lấy thông tin người dùng.');
            }
            return;
          }

          this.userInfo = userInfo;
          this.userService.saveGrantAndUser(perms, userInfo);

          if (!token || !authContext) {
            this.notify.error('Không tạo được phiên đăng nhập nội bộ.');
            return;
          }

          this.userService.saveInternalAuth(token, 0, authContext);
          this.userService.hydrateFromStorage$()
            .pipe(take(1), takeUntil(this.destroyed))
            .subscribe();

          this.loadOrderStatus(userInfo.phoneNumber || '');
          this.loadLoyalty(true);
          this.notify.success('Đăng ký thành viên thành công.');
          afterGranted?.();
        },
        error: () => {
          this.notify.error('Đã xảy ra lỗi khi cấp quyền.');
        }
      });
  }

  onGuestMenuClick(item: MemberMenuItem, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.grantPermission(() => {
      if (!item.route) return;
      this.navService.redirect([item.route], {
        queryParams: item.queryParams ?? {}
      });
    });
  }

  private loadOrderStatus(mobile: string): void {
    this.orderApi.getStatusTracking({mobile, act: 'status'})
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: res => {
          if (!res.code) return;
          this.orderStatusData = Array.isArray(res.data) ? res.data : [];
        }
      });
  }

  private loadLoyalty(force = false): void {
    if (!this.userService.internalJwt || (this.loyaltyLoaded && !force)) {
      return;
    }

    this.loyaltyLoaded = true;
    this.loyaltyApi.getMyLoyalty()
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: res => {
          this.loyaltyMe = res.code && res.data ? res.data : null;
        },
        error: () => {
          this.loyaltyMe = null;
          this.loyaltyLoaded = false;
        },
      });
  }

  downloadQRCode(): void {
    this.zmpService.downloadImageToGallery$(this.qrCodeUrl)
      .pipe(takeUntil(this.destroyed))
      .subscribe();
  }

  copyMiniAppLink(): void {
    const shareLink = this.appInfo?.appUrl;
    if (!shareLink) {
      this.notify.error('Không thể sao chép. Vui lòng thử lại.');
      return;
    }

    navigator.clipboard.writeText(shareLink)
      .then(() => this.notify.success('Đã sao chép đường dẫn'))
      .catch(() => this.notify.error('Không thể sao chép. Vui lòng thử lại.'));
  }

  onShareClick(): void {
    const {name, description, logoUrl} = this.appInfo || {};
    if (!name) return;

    this.zmpService.shareZaloMiniApp$({
      title: name,
      description,
      thumbnail: logoUrl,
    }).pipe(takeUntil(this.destroyed)).subscribe();
  }

  get displayName(): string {
    return this.userInfo?.name || 'Thành viên';
  }

  get appDisplayName(): string {
    return this.configState.headerTitle
      || this.configState.appTitle
      || this.appInfo?.name
      || (this.showTemplateFallbacks ? 'Clothing Store' : '');
  }

  get brandLogoUrl(): string {
    return this.configState.appLogoUrl || this.appInfo?.logoUrl || '';
  }

  get appLogoUrl(): string {
    return this.brandLogoUrl;
  }

  get qrCodeUrl(): string {
    return this.appInfo?.qrCodeUrl || (this.showTemplateFallbacks ? this.fallbackQrUrl : '');
  }

  get displayPhone(): string {
    return this.userInfo?.phoneNumber || this.appService.getUserInfo?.phoneNumber || '';
  }

  get displayMenuItems(): MemberMenuItem[] {
    return this.menuItems.filter(item => !item.requiresTemplateFallback || this.showTemplateFallbacks);
  }

  get displayGuestMenuItems(): MemberMenuItem[] {
    return this.guestMenuItems.filter(item => !item.requiresTemplateFallback || this.showTemplateFallbacks);
  }

  get memberRankView(): MemberRankView | null {
    if (!this.loyaltyMe?.hasLinkedCustomer || !this.loyaltyMe.levelName) {
      return null;
    }

    return {
      key: this.normalizeMemberRank(this.loyaltyMe.levelName) ?? 'member',
      label: this.loyaltyMe.levelName,
    };
  }

  get isLoggedIn(): boolean {
    return !!this.userInfo?.name;
  }

  get showTemplateFallbacks(): boolean {
    return !!environment.showTemplateFallbacks;
  }

  private resolveMemberRankValue(): string {
    const user = this.userInfo as Record<string, any> | null | undefined;
    if (!user) return '';

    const rankSources = [
      user['memberRank'],
      user['membershipRank'],
      user['rank'],
      user['rankName'],
      user['memberLevel'],
      user['membershipLevel'],
      user['level'],
      user['levelName'],
      user['customerRank'],
      user['customerRankName'],
      user['member'],
      user['membership'],
      user['customerLevel'],
    ];

    for (const source of rankSources) {
      const rank = this.rankValueToString(source);
      if (rank) return rank;
    }

    return '';
  }

  private rankValueToString(value: unknown): string {
    if (value === null || value === undefined) return '';

    if (typeof value === 'string' || typeof value === 'number') {
      return `${value}`.trim();
    }

    if (typeof value !== 'object') return '';

    const objectValue = value as Record<string, unknown>;
    const nestedSources = [
      objectValue['name'],
      objectValue['label'],
      objectValue['title'],
      objectValue['code'],
      objectValue['rank'],
      objectValue['rankName'],
      objectValue['level'],
      objectValue['levelName'],
    ];

    for (const source of nestedSources) {
      const rank = this.rankValueToString(source);
      if (rank) return rank;
    }

    return '';
  }

  private normalizeMemberRank(value: string): MemberRankKey | null {
    const normalized = value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[_-]+/g, ' ');

    if (!normalized) return null;

    if (['0', '1', 'member', 'normal', 'standard', 'basic', 'thanh vien'].includes(normalized)) {
      return 'member';
    }

    if (['2', 'bac', 'silver'].includes(normalized)) {
      return 'silver';
    }

    if (['3', 'vang', 'gold'].includes(normalized)) {
      return 'gold';
    }

    return null;
  }

  protected readonly uriFeConst = uriFeConst;
}
