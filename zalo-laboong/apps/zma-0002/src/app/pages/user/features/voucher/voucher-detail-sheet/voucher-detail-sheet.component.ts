import {Component, EventEmitter, Input, Output} from '@angular/core';
import {VoucherItem} from '../voucher.model';

@Component({
  selector: 'app-zma-voucher-detail-sheet',
  standalone: false,
  templateUrl: './voucher-detail-sheet.component.html',
  styleUrls: ['./voucher-detail-sheet.component.scss'],
})
export class ZmaVoucherDetailSheetComponent {
  @Input({required: true}) voucher!: VoucherItem;
  @Output() closed = new EventEmitter<void>();
}
