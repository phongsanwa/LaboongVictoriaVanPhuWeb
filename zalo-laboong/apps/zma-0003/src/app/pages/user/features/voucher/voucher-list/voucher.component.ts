import { Component, OnInit } from '@angular/core';
import { AppCommonComponent } from '@shared/components/app-common.service';
import {MockPromotionService} from '@shared/services/feature-specific/promotion/mock-promotion.service';
import {uriFeConst} from '@shared/constants';
import {
  DEFAULT_EXPIRE,
  IVoucherItem
} from '@shared/components/actions/box-voucher-checkout/box-voucher-checkout.component';

@Component({
  selector: 'app-voucher',
  standalone: false,
  templateUrl: './voucher.component.html',
  styleUrls: ['./voucher.component.scss'],
})
export class VoucherComponent extends AppCommonComponent implements OnInit {
  benefits = [
    { title: 'Giới thiệu thành viên mới', points: 200 },
    { title: 'Chia sẻ tạo affiliate', points: 200 },
    { title: 'Điền form khảo sát', points: 100 },
  ];

  vouchers: IVoucherItem[] = [
    this.makeVoucher('SALE20K') // dữ liệu mặc định khi chưa có API
  ];


  constructor(
    private mockPromotion: MockPromotionService,
  ) {
    super();
  }

  ngOnInit() {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Ưu đãi',
    });

    this.mockPromotion.getVoucher().subscribe({
      next: (res: any) => {
        if (!res) return;

        const codes: string[] = Array.isArray(res)
          ? res
          : (res?.voucherCodes ?? (res?.voucherCode ? [res.voucherCode] : []));

        if (!codes.length) return;

        this.vouchers = codes.map((c) => this.makeVoucher(String(c)));
      }
    });
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
  onApplyVoucher(code: string) {
    this.navService.redirect([uriFeConst.user.voucherDetail], {queryParams: {voucherId: code}})
  }
}
