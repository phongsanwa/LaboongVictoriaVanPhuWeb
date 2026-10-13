import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { IPromotionCoupon } from '@shared/models/api';

@Component({
  selector: 'app-cart-flow-voucher-picker',
  standalone: false,
  templateUrl: './cart-flow-voucher-picker.component.html',
  styleUrls: ['./cart-flow-voucher-picker.component.scss'],
})
export class CartFlowVoucherPickerComponent implements OnChanges {
  @Input() couponResult: IPromotionCoupon | null = null;
  @Input() appliedCode: string | null = null;
  @Input() loading = false;

  @Output() applyCoupon = new EventEmitter<string>();
  @Output() complete = new EventEmitter<string | null>();

  voucherCode = '';
  pendingCode: string | null = null;

  ngOnChanges(): void {
    this.pendingCode = this.appliedCode;
  }

  applyCode(): void {
    const code = this.voucherCode.trim();
    if (!code) return;
    this.pendingCode = code;
    this.applyCoupon.emit(code);
  }

  onComplete(): void {
    this.complete.emit(this.pendingCode);
  }

  get footerText(): string {
    if (this.couponResult?.status === 1 && this.couponResult.amount) {
      return `Voucher giảm ${(this.couponResult.amount).toLocaleString('vi-VN')} VND`;
    }
    if (this.pendingCode) return `Mã: ${this.pendingCode}`;
    return 'Chưa chọn voucher';
  }

  get couponValid(): boolean {
    return this.couponResult?.status === 1;
  }

  get couponMessage(): string | null {
    return this.couponResult?.message ?? null;
  }
}
