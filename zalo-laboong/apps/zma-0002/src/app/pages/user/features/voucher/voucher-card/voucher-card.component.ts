import {Component, EventEmitter, Input, Output} from '@angular/core';
import {VoucherItem} from '../voucher.model';

@Component({
  selector: 'app-zma-voucher-card',
  standalone: false,
  templateUrl: './voucher-card.component.html',
  styleUrls: ['./voucher-card.component.scss'],
})
export class ZmaVoucherCardComponent {
  @Input({required: true}) item!: VoucherItem;
  @Input() showCollect = true;
  @Input() conditionEnabled = true;
  @Input() actionLabel = '';
  @Input() owned = false;
  @Output() selected = new EventEmitter<VoucherItem>();
  @Output() collected = new EventEmitter<VoucherItem>();
  @Output() conditionSelected = new EventEmitter<VoucherItem>();
  @Output() actionSelected = new EventEmitter<VoucherItem>();

  get buttonLabel(): string {
    if (this.actionLabel) return this.actionLabel;
    return this.item.collected ? 'Đã lưu' : 'Lưu';
  }

  onCollect(event: MouseEvent): void {
    event.stopPropagation();
    if (this.actionLabel) {
      this.actionSelected.emit(this.item);
      return;
    }
    this.collected.emit(this.item);
  }

  onCondition(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.conditionEnabled) return;
    this.conditionSelected.emit(this.item);
  }
}
