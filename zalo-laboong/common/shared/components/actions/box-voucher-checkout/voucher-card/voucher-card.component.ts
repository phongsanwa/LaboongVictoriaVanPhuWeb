import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-voucher-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="voucher mb-2" [class.disabled]="disabled" role="group" aria-label="Phiếu ưu đãi">
      <header class="voucher__top">
        <div class="voucher__label">{{ label }}</div>
        @if (expiryLabel) {
          <div class="voucher__badge">{{ expiryPrefix }} {{ expiryLabel }}</div>
        }
      </header>

      <div class="voucher__dash"></div>

      <div class="voucher__body">
        <div class="voucher__left">
          <div class="voucher__icon" aria-hidden="true">🛍️</div>
          <div class="voucher__text">
            <h3 class="voucher__title">{{ title }}</h3>
            <p class="voucher__desc">{{ description }}</p>
          </div>
        </div>

        <button
          class="voucher__btn"
          type="button"
          [class.selected]="selected"
          [disabled]="disabled"
          (click)="apply.emit()">
          {{ cta }}
        </button>
      </div>
    </article>
  `,
  styles: [`
    .voucher {
      --brand: var(--brand-color);
      --ink: #111827;
      --muted: #6b7280;
      --bg: #ffffff;
      --badge-bg: #fceceb;
      --radius: 18px;
      --cut: 18px;
      --border-w: 2px;

      position: relative;
      background: var(--bg);
      border-radius: var(--radius);
      padding: 16px 16px 18px;
      color: var(--ink);
      box-shadow: 0 6px 18px rgba(0, 0, 0, .08);
      border: var(--border-w) solid var(--brand);
    }

    .voucher.disabled {
      opacity: .4;
      pointer-events: none;
    }

    .voucher__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .voucher__label {
      font-weight: 800;
      font-size: 24px;
      color: var(--brand);
    }

    .voucher__badge {
      padding: 8px 12px;
      border-radius: 12px;
      background: var(--badge-bg);
      color: #2d2a2a;
      font-weight: 600;
      white-space: nowrap;
    }

    .voucher__dash {
      position: relative;
      margin: 12px 0;
      border-top: 3px dashed var(--brand);

      &::before,
      &::after {
        content: "";
        position: absolute;
        width: 35px;
        height: 35px;

        border: 2px solid transparent;
        border-top-color: var(--brand);
        border-right-color: var(--brand);

        border-radius: 50%;
        top: 38%;
        transform: translate(-50%, -50%) rotate(45deg);
        background-color: #fff;
      }

      &::before {
        left: -16px;
      }

      &::after {
        right: -16px;
        transform: translate(50%, -50%) rotate(225deg);
      }
    }

    .voucher__body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .voucher__left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .voucher__icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: #eef2ff;
      color: var(--brand);
      font-size: 20px;
      flex: 0 0 auto;
    }

    .voucher__text {
      min-width: 0
    }

    .voucher__title {
      margin: 0;
      font-weight: 800;
      font-size: 20px;
    }

    .voucher__desc {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 14px;
    }

    .voucher__btn {
      padding: 12px 22px;
      background: var(--brand);
      color: #fff;
      border: 0;
      border-radius: 12px;
      font-weight: 700;
      font-size: 18px;
      box-shadow: 0 6px 0 rgb(201 4 43 / 15%);
      white-space: nowrap;
    }

    .voucher__btn:active {
      transform: translateY(1px);
      box-shadow: 0 6px 0 rgb(201 4 43 / 15%);
    }
    .voucher__btn.selected {
      background-color: #4caf50;
      color: #fff;
      position: relative;
    }

    .voucher__btn.selected::after {
      content: '\\2713';
      position: absolute;
      transform: translateY(-50%);
      font-size: 16px;
      color: #fff;
    }

    @media (max-width: 520px) {
      .voucher {
        --radius: 16px;
        --cut: 16px;
        padding: 14px 14px 16px;
      }
      .voucher__label {
        font-size: 18px;
      }
      .voucher__badge {
        font-size: 10px;
      }
      .voucher__title {
        font-size: 14px;
      }
      .voucher__desc {
        font-size: 9px;
      }
      .voucher__btn {
        font-size: 14px;
        padding: 10px 18px;
      }
    }

    @media (max-width: 400px) {
      .voucher {
        --radius: 16px;
        --cut: 16px;
        padding: 12px 12px 14px;
      }
      .voucher__label {
        font-size: 16px;
      }
      .voucher__badge {
        font-size: 8px;
      }
      .voucher__title {
        font-size: 12px;
      }
      .voucher__desc {
        font-size: 8px;
      }
      .voucher__btn {
        font-size: 12px;
        padding: 8px 16px;
      }

      .voucher__dash {
        &::before {
          left: -14px;
        }

        &::after {
          right: -14px;
          transform: translate(50%, -50%) rotate(225deg);
        }
      }
    }
  `]
})
export class VoucherCardComponent {
  @Input() label = 'Phiếu ưu đãi';

  @Input() title = 'Ưu đãi lần đầu';
  @Input() description = 'Giảm 5% cho đơn tiếp theo';
  @Input() expiry?: string | Date;

  @Input() expiryPrefix = 'HSD đến';

  @Input() cta = 'Dùng ngay';

  @Input() disabled = false;

  @Output() apply = new EventEmitter<void>();
  @Input() selected = false;
  get expiryLabel(): string | null {
    if (!this.expiry) return null;
    const d = this.expiry instanceof Date ? this.expiry : new Date(this.expiry);
    if (Number.isNaN(+d)) return null;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }
}
