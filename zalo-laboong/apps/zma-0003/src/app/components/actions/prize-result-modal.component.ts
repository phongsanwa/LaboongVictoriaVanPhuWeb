import {CommonModule} from '@angular/common';
import {Component, Input, ViewEncapsulation} from '@angular/core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {NotifyService} from '@core/services';

@Component({
  selector: 'app-prize-result-modal',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="modal-body p-0 prize-modal">
      <div class="prize-card">
        <div class="prize-header text-center">
          <div class="title">CHÚC MỪNG BẠN ĐÃ NHẬN ĐƯỢC<br/>PHẦN QUÀ</div>
        </div>

        <button type="button" class="close-fab" (click)="activeModal.dismiss('close')" aria-label="Đóng">
          <i class="ph-light ph-x ph-lg"></i>
        </button>

        <div class="prize-content">
          <p class="muted mb-1">Bạn đã nhận phần quà</p>
          <p class="prize-name">{{ prizeName }}</p>

          <div class="code-wrap">
            <div class="code-box">{{ code || '—' }}</div>
            <button type="button" class="copy-btn" (click)="onCopy()">
              <span class="copy-icon" aria-hidden="true">
                <!-- clipboard icon -->
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 4H15V6H9V4Z" fill="currentColor"/>
                  <path
                    d="M7 6C5.89543 6 5 6.89543 5 8V18C5 19.1046 5.89543 20 7 20H15C16.1046 20 17 19.1046 17 18V8C17 6.89543 16.1046 6 15 6H7Z"
                    stroke="currentColor" stroke-width="1.5"/>
                  <rect x="9" y="2" width="6" height="2" rx="1" fill="currentColor"/>
                </svg>
              </span>
              <span class="copy-text">{{ copyLabel }}</span>
            </button>
          </div>

          <p class="note">Số lượng có hạn vậy nên mong quý khách hàng inbox để được nhận phần thưởng.</p>
        </div>

        <div class="prize-actions">
          <button type="button" class="btn btn-outline-prize" (click)="onInbox()">INBOX</button>
          <button type="button" class="btn btn-prize" (click)="onBuy()">MUA HÀNG</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-modal-prize .modal-content {
      border: 0;
      border-radius: 20px;
      overflow: visible;
      box-shadow: 0 10px 24px rgba(0, 0, 0, .12);
    }

    .prize-modal {
      position: relative;
    }

    .prize-card {
      position: relative;
      background: #fff;
      border-radius: 20px;
      overflow: hidden;
    }

    .prize-header {
      background: var(--brand-color);
      color: #fff;
      padding: 18px 16px;
    }

    .prize-header .title {
      font-weight: 800;
      line-height: 1.15;
      text-transform: uppercase;
      text-align: center;
      letter-spacing: .3px;
      filter: drop-shadow(0 1px 0 rgba(0, 0, 0, .06));
    }

    .prize-content {
      padding: 16px;
      text-align: center;
    }

    .muted {
      color: #6c757d;
      font-size: 14px;
    }

    .prize-name {
      font-weight: 800;
      font-size: 18px;
      margin: 0 0 12px;
    }

    .code-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 8px;
    }

    .code-box {
      flex: 1;
      background: #F1F2F4;
      border-radius: 10px;
      padding: 10px 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-weight: 700;
      font-size: 16px;
      color: #1b1b1b;
      text-align: center;
    }

    .copy-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      border: 0;
      background: transparent;
      color: #d6b029;
      font-weight: 600;
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 8px;
    }

    .copy-btn:hover {
      background: rgba(245, 210, 74, .12);
    }

    .note {
      color: #8b9199;
      font-size: 14px;
      margin: 12px 16px 0;
    }

    .prize-actions {
      display: flex;
      gap: 14px;
      padding: 16px;
      justify-content: center;
    }

    .btn {
      height: 48px;
      border-radius: 14px;
      padding: 0 22px;
      font-weight: 800;
      letter-spacing: .3px;
    }

    .btn-outline-prize {
      background: #fff;
      border: 2px solid var(--brand-color);
      color: var(--brand-color);
    }

    .btn-outline-prize:active {
      transform: translateY(1px);
    }

    .btn-prize {
      background: var(--brand-color);
      border: 0;
      color: #fff;
    }

    .btn-prize:active {
      transform: translateY(1px);
    }

    .close-fab {
      position: absolute;
      right: -20px;
      transform: translateX(-50%);
      top: 0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 0;
      background: transparent;
      padding: 0;
      cursor: pointer;
      color: #ffffff;
    }

    @media (min-width: 576px) {
      .prize-header .title {
        font-size: 20px;
      }
      .prize-name {
        font-size: 20px;
      }
    }
  `]
})
export class PrizeResultModalComponent {
  @Input() prizeName = 'Samsung Galaxy S23';
  @Input() code: string | null = 'NICNLBUR7M1X';
  @Input() copyLabel = 'Copy mã';

  constructor(
    public activeModal: NgbActiveModal,
    private notify: NotifyService
  ) {
  }

  onCopy() {
    if (!this.code) return;
    navigator.clipboard.writeText(this.code).then(() => {
      this.notify.success('copies')
    });
  }

  onInbox() {
    this.activeModal.close('inbox');
  }

  onBuy() {
    this.activeModal.close('buy');
  }
}
