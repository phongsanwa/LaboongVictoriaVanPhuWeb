import { Component, OnInit } from '@angular/core';
import { AppCommonComponent } from '@shared/components/app-common.service';
import {environment} from '../../../../../environments';
import {TEMPLATE_VOUCHERS, VoucherItem} from './voucher.model';

interface Tab {
  id: string;
  label: string;
}

@Component({
  selector: 'app-voucher',
  standalone: false,
  templateUrl: './voucher.component.html',
  styleUrls: ['./voucher.component.scss'],
})
export class VoucherComponent extends AppCommonComponent implements OnInit {
  selectedVoucher: VoucherItem | null = null;
  conditionVoucher: VoucherItem | null = null;
  code = '';

  vouchers: VoucherItem[] = [];

  tabs: Tab[] = [
    {id: 'all', label: 'Tất cả'},
    {id: 'mine', label: 'Ưu đãi của tôi'},
  ];
  selectedTab = 'all';

  ngOnInit() {
    this.setupListHeader();
    this.vouchers = this.showTemplateFallbacks ? TEMPLATE_VOUCHERS.map(item => ({...item})) : [];
  }

  private setupListHeader(): void {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Ưu đãi',
      className: 'header-color',
    });
    this.setFooter({variant: 'tabs', show: false});
  }

  applyCode(): void {
    if (!this.code.trim()) return;
    this.notifyService.success('Áp dụng mã ưu đãi thành công');
  }

  collect(item: VoucherItem, event?: MouseEvent): void {
    event?.stopPropagation();
    item.collected = true;
  }

  selectTab(tabId: string): void {
    this.selectedTab = tabId;
  }

  useVoucher(item: VoucherItem): void {
    this.openDetail(item);
  }

  openDetail(item: VoucherItem): void {
    this.selectedVoucher = item;
  }

  openCondition(item: VoucherItem): void {
    this.conditionVoucher = item;
  }

  closeCondition(): void {
    this.conditionVoucher = null;
    this.setupListHeader();
  }

  closeDetail(): void {
    this.selectedVoucher = null;
  }

  get showTemplateFallbacks(): boolean {
    return !!environment.showTemplateFallbacks;
  }

  get displayVouchers(): VoucherItem[] {
    if (this.selectedTab === 'mine') return this.vouchers;
    return this.vouchers;
  }

  get isMineTab(): boolean {
    return this.selectedTab === 'mine';
  }
}
