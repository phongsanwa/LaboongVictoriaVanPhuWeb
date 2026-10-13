import {Component, OnDestroy, OnInit} from '@angular/core';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {MockPromotionService} from '../../../services/feature-specific/promotion/mock-promotion.service';
import {FormsModule} from '@angular/forms';
import {CheckoutManageService} from '../../../services/global';
import {AppFormAddService} from '../../../services/global/app-form-add.service';
import {filter, map, take} from 'rxjs';
import {ICheckVoucherParams, IResCheckVoucher, ISaveOrderV2Params} from '../../../models/api';
import {switchMap, tap} from 'rxjs/operators';
import {VoucherCardComponent} from './voucher-card/voucher-card.component';
import {OrderApiService} from '../../../services/api';

export type IVoucherItem = {
  code: string;
  title: string;
  description: string;
  expire: Date;
  disabled?: boolean;
  value?: number
};

export const DEFAULT_EXPIRE = new Date(2026, 6, 30);

@Component({
  selector: 'app-box-voucher-checkout',
  templateUrl: 'box-voucher-checkout.component.html',
  styleUrls: ['box-voucher-checkout.component.scss'],
  imports: [
    VoucherCardComponent,
    FormsModule
  ],
  standalone: true
})

export class BoxVoucherCheckoutComponent implements OnInit, OnDestroy {
  selectedCode!: IVoucherItem;
  couponCode = '';
  selectedCountCode: number = 0;
  vouchers: IVoucherItem[] = [
    this.makeVoucher('SALE20K') // dữ liệu mặc định khi chưa có API
  ];

  constructor(
    private offcanvas: NgbActiveOffcanvas,
    private mockPromotion: MockPromotionService,
    private svc: CheckoutManageService,
    private appFm: AppFormAddService,
    private orderApi: OrderApiService
  ) {
  }

  ngOnInit() {
    this.mockPromotion.getVoucher()
      .pipe(
        map(res => (Array.isArray(res) ? res : [])
          .filter(it => it?.voucherCode)
          .map(it => this.makeVoucher(String(it.voucherCode)))),

        tap(list => this.vouchers = list),
        filter(list => list.length > 0),

        switchMap(list =>
          this.svc.payload$.pipe(
            take(1),
            map(p => this.getOrderContextFrom(p)),
            switchMap(({ totalMoney, productIds }) => {
              const params: ICheckVoucherParams = {
                voucherCode: list.map(v => v.code),
                totalMoney,
                productIds
              };
              return this.orderApi.checkVoucher(params)
                .pipe(map(res => ({ res, list })));
            })
          )
        )
      )
      .subscribe(({ res, list }) => {
        const byCode = this.toCheckMap(res);

        this.vouchers = list.map(v => {
          const chk = byCode.get(v.code);
          if (!chk) return v;
          return {
            ...v,
            disabled: chk.valid !== 1,
            reason: chk.valid !== 1 ? (chk.reason) : undefined,
            value: chk.valid === 1 ? chk.value : undefined,
          };
        });
      });
  }

  ngOnDestroy() {
    this.appFm.getDestroySubs();
  }

  private toCheckMap(res: any): Map<string, IResCheckVoucher> {
    const d = res?.data ?? res;
    const list: IResCheckVoucher[] =
      Array.isArray(d) ? d :
        Array.isArray(d?.list) ? d.list :
          (d?.code ? [d] : []);

    const m = new Map<string, IResCheckVoucher>();
    for (const r of list) if (r?.code) m.set(String(r.code), r);
    return m;
  }

  private getOrderContextFrom(p: ISaveOrderV2Params): { totalMoney: number; productIds: string } {
    const products = Array.isArray(p?.products) ? p.products : [];

    const totalMoney =
      Number(p?.payment?.totalOrderAmount) ||
      products.reduce((sum: number, it: any) =>
        sum + (Number(it?.price) || 0) * (Number(it?.quantity) || 0), 0);

    const ids = products
      .map((it: any) => String(it?.productId ?? it?.id ?? '').trim())
      .filter(Boolean);

    const uniqueIds = Array.from(new Set(ids));
    const productIds = `[${uniqueIds.map(id => `${id}`).join(', ')}]`;

    return { totalMoney, productIds };
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

  onApplyVoucher(code: IVoucherItem) {
    this.selectedCode = code;
    this.selectedCountCode = 1;
    this.couponCode = code.code;
  }

  onConfirmCoupon() {
    if (!this.selectedCode) return;
    this.svc.setCouponCode(this.selectedCode);
    this.offcanvas.close(this.selectedCode);
  }

  close() {
    this.offcanvas.dismiss();
  }
}
