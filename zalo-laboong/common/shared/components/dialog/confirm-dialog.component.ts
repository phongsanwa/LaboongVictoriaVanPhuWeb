import {Component, Input, ViewEncapsulation} from '@angular/core';
import {NgbActiveModal} from "@ng-bootstrap/ng-bootstrap";
import {IDialogOptions} from '../../../core/services';

@Component({
  selector: 'app-c-confirm-dialog',
  template: `
    <div class="modal-header py-2 bg-light">
      <h5 class="modal-title">
        {{ data.title ? data.title : 'common.notification' | transloco }}
      </h5>

      @if (!data.btnCloseDisable) {
        <button type="button" class="btn-close" (click)="onNotConfirm()"></button>
      }
    </div>

    <div class="modal-body">
      @if (data.html) {
        <div [innerHTML]="data.html"></div>
      } @else {
        {{ data.content ? data.content : 'common.messages.confirmDelete' | transloco }}
        @if (data.subContent) {
          <div [innerHTML]="data.subContent"></div>
        }
      }
    </div>

    <div class="modal-footer py-1">
      @if (data.btnCloseName) {
        <button (click)="onNotConfirm()" class="btn btn-sm {{data.btnCloseClass}}">
          <i class="ph-light ph-x me-2"></i>
          {{ data.btnCloseName | transloco }}
        </button>
      }

      <button (click)="onConfirm()"
              class="btn btn-sm {{data.btnConfirmClass ? data.btnConfirmClass : 'btn-danger'}}">
        <i class="ph ph-check me-2"></i>
        {{ data.btnConfirmName ? data.btnConfirmName : ('common.delete' | transloco) }}
      </button>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ConfirmDialogComponent {
  @Input() data: IDialogOptions = {};

  constructor(
    public activeModal: NgbActiveModal
  ) {
  }

  onNotConfirm() {
    this.activeModal.close({confirmDelete: false});
  }

  onConfirm() {
    this.activeModal.close({confirmDelete: true});
  }
}
