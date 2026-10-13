import {Component, Input} from '@angular/core';
import {openShareSheet} from 'zmp-sdk/apis';

export interface SharePayload {
  title: string;
  thumbnail: string;
  path: string;
}

@Component({
  selector: 'app-shared-button',
  template: `
    <button (click)="onShare()"
            class="text-orange text-center rounded-1 px-2 py-1 bg-white border-1 border-orange align-items-center d-flex text-sm cursor-pointer">
      <i class="ph-bold ph-share me-1"></i>
      <div class="me-1">Chia sẻ</div>
    </button>
  `,
  styles: [`
    .border-orange {
      border: 1px solid var(--brand-color);;
      font-size: 11px;
      width: fit-content;
    }
    .text-orange {
      color: var(--brand-color);;
    }
  `],
  standalone: true
})
export class ShareButtonComponent {
  @Input() payload!: SharePayload;
  @Input() label = 'Chia sẻ ngay cho bạn bè';

  onShare() {
    if (!this.payload) return;
    openShareSheet({
      type: 'zmp_deep_link',
      data: {
        title: this.payload.title,
        thumbnail: this.payload.thumbnail,
        path: this.payload.path,
      }
    }).catch(err => console.error('ShareSheet lỗi:', err));
  }
}
