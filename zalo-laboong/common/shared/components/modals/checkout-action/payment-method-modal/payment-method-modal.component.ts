import { Component, Input } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { IPaymentMethod } from '@shared/models/api';

@Component({
  selector: 'app-payment-method-modal',
  standalone: true,
  templateUrl: './payment-method-modal.component.html',
  styleUrls: ['./payment-method-modal.component.scss'],
})
export class PaymentMethodModalComponent {
  @Input({ required: true }) methods: IPaymentMethod[] = [];
  @Input() selectedMethod: IPaymentMethod | null = null;

  constructor(public offcanvas: NgbActiveOffcanvas) {}

  onSelect(method: IPaymentMethod): void {
    this.offcanvas.close(method);
  }
}
