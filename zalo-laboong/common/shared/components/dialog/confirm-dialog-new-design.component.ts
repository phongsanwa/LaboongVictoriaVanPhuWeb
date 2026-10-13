import {Component, Input, ViewEncapsulation} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {IDialogOptions} from '@core/services';

@Component({
  selector: 'app-confirm-dialog-new-design',
  template: `
    <div class="c-modern">
      <button type="button" class="c-x" aria-label="Close" (click)="onNotConfirm()">
        <i class="ph ph-x"></i>
      </button>

      <h3 class="c-title">{{ data.title || ('common.notification' | transloco) }}</h3>

      @if (data.html) {
        <div class="c-desc" [innerHTML]="data.html"></div>
      } @else {
        <p class="c-desc">
          {{ data.content || ('common.messages.confirmDelete' | transloco) }}
        </p>
        @if (data.subContent) {
          <div class="c-sub" [innerHTML]="data.subContent"></div>
        }
      }

      <div class="c-actions">
        @if (data.btnCloseName) {
          <button type="button" class="btn c-btn c-btn-outline" (click)="onNotConfirm()">
            {{ data.btnCloseName | transloco }}
          </button>
        }
        <button type="button" class="btn btn-warning c-btn" (click)="onConfirm()">
          {{ data.btnConfirmName || ('common.delete' | transloco) }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host-context(.modern-confirm) .modal-content {
      border: 0;
      border-radius: 16px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, .15);
    }

    .c-modern {
      position: relative;
      padding: 22px 20px 18px;
      text-align: center;
      background: #fff;
      border-radius: 16px;
    }

    .c-x {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 50%;
      background: #eee;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .c-title {
      font-size: 22px;
      font-weight: 800;
      margin: 8px 0 6px;
    }

    .c-desc {
      color: #6b7280;
      margin: 0 0 10px;
    }

    .c-sub {
      color: #9ca3af;
      font-size: 14px;
    }

    .c-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 10px;
    }

    .c-btn {
      height: 44px;
      padding: 0 18px;
      border-radius: 10px;
      font-weight: 700;
    }

    .c-btn-outline {
      background: #fff;
      border: 1px solid var(--brand-color);
      color: #111;
    }

    .c-btn-solid {
      background: var(--brand-color);
      color: #fff;
      border: 1px solid var(--brand-color);
    }
  `],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ConfirmDialogNewDesignComponent {
  @Input() data: IDialogOptions = {};

  constructor(public activeModal: NgbActiveModal) {
  }

  onNotConfirm() {
    this.activeModal.close({confirmDelete: false});
  }

  onConfirm() {
    this.activeModal.close({confirmDelete: true});
  }
}
