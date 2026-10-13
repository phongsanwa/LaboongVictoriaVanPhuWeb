import {Component, Input, OnInit} from '@angular/core';
import {IResCalculateFee} from '@shared/models/api';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {NgClass} from '@angular/common';
import {I18nFormatCurrencyAmountPipe} from '@shared/pipes/global';
import {CheckoutManageService} from '@shared/services/global';

@Component({
  selector: 'app-select-carrier-modal',
  templateUrl: 'carrier-select-modal.component.html',
  styles: [`
    .carrier-list .carrier-item {
      background-color: #ffffff;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 60px;
    }

    .carrier-item .carrier-logo {
      max-width: 80px;
      max-height: 20px;
      object-fit: contain;
    }

    .carrier-item:hover {
      background-color: #f8f9fa;
      border-color: #bbb;
    }

    .carrier-item.active {
      border-color: #037B8A !important;
      background-color: #E6F5F7 !important;
      box-shadow: 0 4px 10px rgba(0, 0, 0, .1);
    }
  `],
  imports: [
    NgClass,
    I18nFormatCurrencyAmountPipe
  ],
  standalone: true
})
export class CarrierSelectModalComponent implements OnInit {
  @Input({ required: true }) options!: IResCalculateFee[];
  @Input({ required: true }) service!: CheckoutManageService;
  @Input() activeServiceId?: number;

  selected?: IResCalculateFee;

  constructor(public modal: NgbActiveModal) {}

  ngOnInit() {
    console.log('option', this.options)
    if (this.activeServiceId && !this.selected) {
      this.selected = this.options?.find(o => o.serviceId === this.activeServiceId);
    }
  }

  onSelectCarrier(c: IResCalculateFee) {
    this.selected = c;
  }

  onApply() {
    if (this.selected) this.modal.close(this.selected);
    else this.modal.dismiss('no-selection');
  }
}
