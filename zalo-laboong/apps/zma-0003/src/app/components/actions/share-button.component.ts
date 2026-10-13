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
    <i class="ph ph-share-fat" (click)="onShare()"></i>
  `,
  styles: [`

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
