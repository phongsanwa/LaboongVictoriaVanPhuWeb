import {Component, OnInit} from '@angular/core';
import {ILoyaltyMe, ILoyaltyTier} from '@shared/models/api';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {uriFeConst} from '@shared/constants';
import {LoyaltyApiService} from '@shared/services/api';
import {finalize, forkJoin, takeUntil} from 'rxjs';

interface MemberTab {
  id: string;
  levelId: number;
  label: string;
  color: string;
  threshold: number;
  ruleType: number;
  sortOrder: number;
  benefits: string[];
}

@Component({
  selector: 'app-membership',
  templateUrl: './membership.component.html',
  styleUrls: ['./membership.component.scss'],
  standalone: false,
})
export class MembershipComponent extends AppCommonComponent implements OnInit {
  memberTabs: MemberTab[] = [];
  selectedTab = '';
  currentRank: MemberTab | null = null;
  benefits: string[] = [];
  loyaltyMe: ILoyaltyMe | null = null;
  loading = false;

  private readonly tierColors = ['#6f7071', '#9aa3ad', '#d59b1a', '#2c8fd8', '#7c3aed'];

  constructor(private loyaltyApi: LoyaltyApiService) {
    super();
  }

  ngOnInit() {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Hạng thành viên',
      className: 'header-color',
    });

    this.setFooter({
      variant: 'tabs',
      show: false,
    });

    if (this.isLoggedIn) {
      this.loadMembership();
    }
  }

  get selectedColor(): string {
    return this.selectedRank?.color ?? '#3459a7';
  }

  get selectedRank(): MemberTab | null {
    return this.memberTabs.find(tab => tab.id === this.selectedTab)
      ?? this.currentRank
      ?? this.memberTabs[0]
      ?? null;
  }

  get progressPercent(): number {
    if (!this.showProgress) return 0;
    const target = this.nextTargetThreshold;
    if (target <= 0) return 100;
    const totalMoney = Number(this.loyaltyMe?.totalMoney ?? 0);
    return Math.min(100, Math.round((totalMoney / target) * 100));
  }

  get formattedSpend(): string {
    return this.formatCompactMoney(this.loyaltyMe?.totalMoney ?? 0);
  }

  get formattedTarget(): string {
    const target = this.nextTargetThreshold;
    return target > 0 ? this.formatCompactMoney(target) : 'Cao nhất';
  }

  get currentRankLabel(): string {
    if (!this.loyaltyMe?.hasLinkedCustomer) {
      return 'Chưa có hạng';
    }
    return this.currentRank?.label || this.loyaltyMe.levelName || 'Thành viên';
  }

  get isLoggedIn(): boolean {
    return !!this.userService.internalJwt;
  }

  get hasLinkedCustomer(): boolean {
    return !!this.loyaltyMe?.hasLinkedCustomer;
  }

  get showProgress(): boolean {
    return this.hasLinkedCustomer && this.currentRank?.ruleType === 2;
  }

  selectTab(tabId: string) {
    this.selectedTab = tabId;
    this.syncBenefits();
  }

  openLogin(): void {
    this.navService.redirect([uriFeConst.user.profile]);
  }

  private loadMembership(): void {
    this.loading = true;
    forkJoin({
      tiers: this.loyaltyApi.getTiers(),
      loyalty: this.loyaltyApi.getMyLoyalty(),
    })
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: ({tiers, loyalty}) => {
          this.memberTabs = tiers.code && tiers.data?.tiers
            ? this.mapMemberTabs(tiers.data.tiers)
            : [];
          this.loyaltyMe = loyalty.code && loyalty.data ? loyalty.data : null;
          this.syncCurrentRank();
          this.syncBenefits();
        },
        error: () => this.notifyService.error('Không thể tải hạng thành viên.'),
      });
  }

  private mapMemberTabs(tiers: ILoyaltyTier[]): MemberTab[] {
    return [...tiers]
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
      .map((tier, index) => ({
        id: `${tier.levelId}`,
        levelId: tier.levelId,
        label: tier.levelName,
        color: this.tierColors[index % this.tierColors.length],
        threshold: Number(tier.threshold ?? 0),
        ruleType: Number(tier.ruleType ?? 0),
        sortOrder: Number(tier.sortOrder ?? index),
        benefits: Array.isArray(tier.benefits) ? tier.benefits : [],
      }));
  }

  private syncCurrentRank(): void {
    const currentLevelId = this.loyaltyMe?.hasLinkedCustomer ? this.loyaltyMe.levelId : null;
    const current = currentLevelId !== null
      ? this.memberTabs.find(tab => tab.levelId === currentLevelId)
      : null;

    this.currentRank = current ?? this.memberTabs[0] ?? null;
    this.selectedTab = this.currentRank?.id ?? this.memberTabs[0]?.id ?? '';
  }

  private syncBenefits(): void {
    this.benefits = this.selectedRank?.benefits ?? [];
  }

  private get nextTargetThreshold(): number {
    if (!this.currentRank) return 0;
    const currentIndex = this.memberTabs.findIndex(tab => tab.levelId === this.currentRank?.levelId);
    const nextRank = currentIndex >= 0 ? this.memberTabs[currentIndex + 1] : null;
    return nextRank?.threshold ?? 0;
  }

  private formatCompactMoney(value: number): string {
    if (value >= 1000000 && value % 1000000 === 0) {
      return `${value / 1000000}tr`;
    }
    return `${Math.max(0, value).toLocaleString('vi-VN')}đ`;
  }
}
