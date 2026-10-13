import {Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {uriFeConst} from '@shared/constants';
import {ILoyaltyMe, IPointHistoryItem} from '@shared/models/api';
import {AllScope} from '@shared/models/feature-specific/zmp.model';
import {LoyaltyApiService} from '@shared/services/api';
import {UserManageService} from '@shared/services/global/user/user-manage.service';
import {finalize, takeUntil} from 'rxjs';

type PointHistoryTab = 'all' | 'earned' | 'used';

interface PointHistoryItem {
  title: string;
  time: string;
  point: number;
  icon: string;
}

interface PointShortcut {
  label: string;
  icon: string;
  route: string;
  queryParams?: Record<string, number | string>;
}

@Component({
  selector: 'app-points',
  templateUrl: './points.component.html',
  styleUrls: ['./points.component.scss'],
  standalone: false,
})
export class PointsComponent extends AppCommonComponent implements OnInit {
  histories: PointHistoryItem[] = [];
  selectedTab: PointHistoryTab = 'all';
  totalPointsLabel = '0';
  pointValueLabel = '0 VND';
  hasLinkedCustomer: boolean | null = null;
  loading = false;
  showPointHistory = true;
  readonly pointShortcuts: PointShortcut[] = [
    {label: 'Thông tin tài khoản', icon: 'ph-bold ph-user', route: uriFeConst.user.profileEdit},
    {label: 'Đổi voucher', icon: 'ph-bold ph-ticket', route: uriFeConst.user.voucher},
    {label: 'Theo dõi đơn hàng', icon: 'ph-bold ph-package', route: uriFeConst.order.tracking, queryParams: {status: 2}},
    {label: 'Lịch sử mua hàng', icon: 'ph-bold ph-shopping-cart', route: uriFeConst.order.tracking},
  ];
  readonly tabs: Array<{key: PointHistoryTab; label: string}> = [
    {key: 'all', label: 'Tất cả'},
    {key: 'earned', label: 'Cộng điểm'},
    {key: 'used', label: 'Đã dùng'},
  ];
  constructor(
    private loyaltyApi: LoyaltyApiService,
    private userMsService: UserManageService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Điểm của tôi'});
    this.setFooter({variant: 'tabs', show: false});
    if (this.isLoggedIn) {
      this.loadMyLoyalty();
      this.loadPointHistory();
    }
  }

  private loadPointHistory(): void {
    this.loyaltyApi.getPointHistory(1, 20)
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: (res) => {
          if (!res?.code || !res.data) return;
          this.histories = (res.data.items ?? []).map(item => this.toHistoryItem(item));
        },
        error: () => undefined,
      });
  }

  private toHistoryItem(item: IPointHistoryItem): PointHistoryItem {
    return {
      title: item.title,
      time: item.createdAt ? new Date(item.createdAt * 1000).toLocaleString('vi-VN') : '',
      point: Number(item.points ?? 0),
      icon: this.iconByType(item.type),
    };
  }

  private iconByType(type: string): string {
    switch (type) {
      case 'earn_purchase':
      case 'redeem_order':
        return 'ph-bold ph-shopping-cart';
      case 'gift':
        return 'ph-bold ph-gift';
      case 'deduct':
        return 'ph-bold ph-minus';
      case 'refund':
      case 'recall':
        return 'ph-bold ph-arrow-counter-clockwise';
      default:
        return 'ph-bold ph-coins';
    }
  }

  get filteredHistories(): PointHistoryItem[] {
    if (this.selectedTab === 'earned') return this.histories.filter(item => item.point > 0);
    if (this.selectedTab === 'used') return this.histories.filter(item => item.point < 0);
    return this.histories;
  }

  selectTab(tab: PointHistoryTab): void {
    this.selectedTab = tab;
  }

  login(): void {
    const scopes: AllScope[] = ['scope.userInfo', 'scope.userPhonenumber'];
    this.spinner.show();

    this.userMsService.grantPermissionAndLogin$(scopes)
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => this.spinner.hide())
      )
      .subscribe({
        next: (res) => {
          if (!res?.userInfo) {
            this.notifyService.warning('Bạn chưa cấp đủ quyền cần thiết.');
            return;
          }

          this.userService.saveGrantAndUser(res.perms, res.userInfo);
          if (!res.token || !res.authContext) {
            this.notifyService.error('Không tạo được phiên đăng nhập nội bộ.');
            return;
          }

          this.userService.saveInternalAuth(res.token, 0, res.authContext);
          this.loadMyLoyalty();
        },
        error: () => this.notifyService.error('Đã xảy ra lỗi khi đăng nhập.'),
      });
  }

  get isLoggedIn(): boolean {
    return !!this.userService.internalJwt;
  }

  get barcodeValue(): string {
    return this.userService.userInfoValue?.phoneNumber || this.appService.getUserInfo?.phoneNumber || '';
  }

  private loadMyLoyalty(): void {
    this.loading = true;
    this.loyaltyApi.getMyLoyalty()
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (res) => {
          if (!res.code || !res.data) return;
          this.applyLoyalty(res.data);
        },
        error: () => this.notifyService.error('Không thể tải điểm thành viên.'),
      });
  }

  private applyLoyalty(data: ILoyaltyMe): void {
    const points = Number(data.points ?? 0);
    const rate = Number(data.pointValueRate ?? 1000);
    this.hasLinkedCustomer = !!data.hasLinkedCustomer;
    this.totalPointsLabel = this.formatNumber(points);
    this.pointValueLabel = `${this.formatNumber(points * rate)} VND`;
  }

  private formatNumber(value: number): string {
    return Math.max(0, value).toLocaleString('vi-VN');
  }
}
