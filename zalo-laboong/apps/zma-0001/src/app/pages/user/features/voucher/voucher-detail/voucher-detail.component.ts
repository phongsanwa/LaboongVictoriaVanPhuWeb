import {Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {MockPromotionService} from '@shared/services/feature-specific/promotion/mock-promotion.service';
import {
  DEFAULT_EXPIRE,
  IVoucherItem
} from '@shared/components/actions/box-voucher-checkout/box-voucher-checkout.component';

@Component({
  selector: 'app-voucher-detail',
  templateUrl: 'voucher-detail.component.html',
  styleUrls: ['voucher-detail.component.scss'],
  standalone: false
})

export class VoucherDetailComponent extends AppCommonComponent implements OnInit {
  voucher?: IVoucherItem;

  constructor(
    private mockPromotion: MockPromotionService
  ) {
    super();
  }

  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Chi tiết Voucher'});
    this.setFooter({variant: 'tabs', show: false});

    const voucherId = String(this.navService.getParam('voucherId') || '').trim().toUpperCase();

    this.mockPromotion.getVoucher().subscribe({
      next: (res: any) => {
        if (!res) return;

        const codes: string[] = Array.isArray(res)
          ? res
          : (res?.voucherCodes ?? (res?.voucherCode ? [res.voucherCode] : []));

        if (!codes.length) return;

        const match = voucherId
          ? codes.find((c: string) => String(c).toUpperCase().trim() === voucherId)
          : codes[0];

        const codeToUse = String(match || codes[0] || '').toUpperCase().trim();
        this.voucher = this.makeVoucher(codeToUse || 'SALE20K');
      }
    });
  }
  get barcodeData(): string {
    const u = this.appService.getUserInfo;
    return (u && u.phoneNumber) ? String(u.phoneNumber) : '0868323415';
  }

  makeVoucher(code: string): IVoucherItem {
    const meta = this.metaFromCode(code);
    return {
      code,
      title: meta.title,
      description: meta.description,
      expire: DEFAULT_EXPIRE,
    };
  }

  metaFromCode(codeRaw: string): { title: string; description: string } {
    const code = (codeRaw || '').toUpperCase().trim();

    if (code === 'SALE20K') {
      return {
        title: 'Mã giảm giá 20K',
        description: 'Giảm 20k cho đơn tiếp theo',
      };
    }

    const m = code.match(/^SALE(\d+)\s*K?$/i);
    if (m) {
      const amount = m[1];
      return {
        title: `Mã giảm giá ${amount}K`,
        description: `Giảm ${amount}k cho đơn tiếp theo`,
      };
    }

    return {
      title: 'Mã ưu đãi',
      description: 'Áp dụng cho đơn tiếp theo',
    };
  }

  formatDate(d: Date | string): string {
    const date = (d instanceof Date) ? d : new Date(d);
    if (Number.isNaN(+date)) return '—';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }

  copy(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.notifyService.success('Copy thành công!')
    });
  }
}
