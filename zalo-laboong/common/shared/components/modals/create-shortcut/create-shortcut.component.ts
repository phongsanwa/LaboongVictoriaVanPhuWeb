import {Component, Input, OnInit} from '@angular/core';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-create-shortcut',
  template: `
    <div class="sheet safe-pb-16">
      <div class="sheet__header" role="heading" aria-level="2">
        <h3 class="sheet__title">Hướng dẫn tạo lối tắt</h3>
        <button type="button" class="sheet__close btn-icon" aria-label="Đóng" (click)="close()">
          <i class="ph ph-x"></i>
        </button>
      </div>

      <div class="sheet__body">
        <h4 class="h-title">1. Lối tắt là gì?</h4>
        <p class="desc">
          Lối tắt là tính năng cho phép người dùng tạo biểu tượng (icon) của Mini App ngay trên
          màn hình chính điện thoại. Nhấn vào biểu tượng này, Mini App sẽ mở ra lập tức như
          một ứng dụng độc lập, không cần vào Zalo để tìm Mini App.
        </p>

        <h4 class="h-title mt">2. Các bước tạo lối tắt</h4>

        <div class="step">
          <div class="step-title"><b>Bước 1.</b> Bấm để sao chép đường dẫn sau</div>

          <div class="copy-box py-1 px-2" (click)="copy($event)">
            <div class="url" [title]="shortcutUrl">{{ shortcutUrl }}</div>
            <button type="button" class="btn-copy" aria-label="Sao chép" (click)="copy($event)">
              <i class="ph ph-copy"></i>
            </button>
          </div>
        </div>

        <div class="step">
          <div class="step-title">
            <b>Bước 2.</b> Dán đường dẫn vào trình duyệt ngoài (Safari trên iOS) và làm theo hướng dẫn để
            <b>Tạo lối tắt</b>.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .h-title { margin:0 0 6px; font-size:16px; font-weight:700; color:#111; }
    .h-title.mt { margin-top:14px; }
    .desc { margin:0 0 12px; color:#6b7280; line-height:1.5; }

    .step { margin-top:10px; }
    .step-title { font-size:15px; color:#111; margin-bottom:8px; }

    .copy-box {
      --pink-bg: #fde8e8;
      --pink-pill: #f8cfd0;
      display:flex; align-items:center; gap:10px;
      background:#f9fafb;
      border-radius:12px;
      cursor:pointer;
      user-select:none;
    }

    .url {
      flex:1 1 auto;
      color:#c14b54;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      font-size:14px;
    }
    .btn-copy {
      flex:0 0 auto;
      width:34px; height:34px; border:none; border-radius:10px;
      background:var(--brand-color);
      display:grid; place-items:center;
      color:#c14b54;
    }

    .ph { font-size:16px; }
  `],
  standalone: true
})

export class CreateShortcutComponent implements OnInit {
  @Input() shortcutUrl = 'https://miniapp.zaloplatforms.com/shortcut.html?appId=3128212657741737680&appName=Nhanh+Mini+Shop&appIcon=https%3A%2F%2Fphoto-logo-mapps.zadn.vn%2Feee88d3c2a79c3279a68.jpg';
  constructor(
    private offcanvas: NgbActiveOffcanvas
  ) {
  }

  ngOnInit() {

  }

  copy(ev?: Event): void {
    ev?.stopPropagation();
    const text = this.shortcutUrl || '';
    if (!text) return;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => this.fallbackCopy(text));
    } else {
      this.fallbackCopy(text);
    }
  }

  private fallbackCopy(text: string): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
  }

  close() { this.offcanvas.dismiss(); }
}
