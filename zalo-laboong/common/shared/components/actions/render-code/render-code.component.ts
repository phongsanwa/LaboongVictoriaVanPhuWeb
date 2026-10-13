import {
  Component, Input, ViewChild, ElementRef, Inject, PLATFORM_ID,
  OnChanges, SimpleChanges, AfterViewInit
} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import * as QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

type CodeMode = 'qr' | 'barcode';

@Component({
  selector: 'app-render-codes',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .qr, .barcode {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 0 auto
    }

    .muted {
      color: #888;
      font-size: 12px;
      text-align: center
    }
  `],
  template: `
    @if (browser) {
      @switch (mode) {
        @case ('qr') {
          <canvas #qrCanvas class="qr"></canvas>
        }
        @case ('barcode') {
          <svg #barcodeSvg class="barcode"></svg>
        }
        @default {
          <div class="muted">Mode không hợp lệ</div>
        }
      }
    } @else {
      <div class="muted">Hiển thị khi chạy trên trình duyệt</div>
    }
  `
})
export class RenderCodesComponent implements OnChanges, AfterViewInit {
  @Input() data = '';
  @Input() mode: CodeMode = 'qr';

  @Input() qrSize = 240;            // px
  @Input() barcodeHeight = 60;      // px
  @Input() showValueUnderBarcode = true;
  @Input() barcodeLineWidth = 2;

  @ViewChild('qrCanvas') private qrCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('barcodeSvg') private barcodeSvg?: ElementRef<SVGSVGElement>;

  readonly browser: boolean;

  constructor(@Inject(PLATFORM_ID) pid: Object) {
    this.browser = isPlatformBrowser(pid);
  }

  ngAfterViewInit() {
    if (this.browser) this.renderSelected();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.browser) return;
    setTimeout(() => {
      if (changes['data'] || changes['mode'] ||
        changes['qrSize'] || changes['barcodeHeight'] ||
        changes['showValueUnderBarcode'] || changes['barcodeLineWidth']) {
        this.renderSelected();
      }
    }, 0);
  }

  private renderSelected(): void {
    const data = this.normalizeInput(this.data);
    if (!data) {
      this.clearQR();
      this.clearBarcode();
      return;
    }
    if (this.mode === 'qr') {
      this.renderQR(data);
      this.clearBarcode();
    } else {
      this.renderBarcode(data);
      this.clearQR();
    }
  }

  /**
   * Nếu là URL (http/https/tel/mailto hoặc giống URL), trả về nguyên chuỗi.
   * Ngược lại coi là phone: chỉ giữ ký tự số.
   */
  private normalizeInput(raw: string): string {
    if (!raw) return '';
    const src = raw.trim();

    const looksLikeUrl =
      /^(https?:\/\/|tel:|mailto:)/i.test(src) ||
      (() => {
        const hasDot = src.includes('.');
        const hasAlpha = /[a-z]/i.test(src);
        const hasSlash = src.includes('/');
        return hasDot && hasAlpha && hasSlash;
      })();

    if (looksLikeUrl) return src;

    return (src.match(/\d+/g) || []).join('');
  }

  private clearQR() {
    const c = this.qrCanvas?.nativeElement;
    if (c) {
      const ctx = c.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    }
  }

  private clearBarcode() {
    const s = this.barcodeSvg?.nativeElement;
    if (s) s.innerHTML = '';
  }

  private renderQR(data: string) {
    const canvas = this.qrCanvas?.nativeElement;
    if (!canvas) return;
    QRCode.toCanvas(canvas, data, {width: this.qrSize, margin: 1}, (err: any) => {
      if (err) console.error('[RenderCodes] QR render error:', err);
    });
  }

  private renderBarcode(data: string) {
    const svg = this.barcodeSvg?.nativeElement;
    if (!svg) return;

    const width = data.length > 30 ? Math.min(1, this.barcodeLineWidth) : this.barcodeLineWidth;

    try {
      JsBarcode(svg, data, {
        format: 'CODE128',
        displayValue: this.showValueUnderBarcode,
        fontSize: 12,
        height: this.barcodeHeight,
        margin: 8,
        lineColor: '#111',
        width
      });
    } catch (e) {
      console.error('[RenderCodes] Barcode render error:', e);
      svg.innerHTML = '<text x="0" y="15" fill="#f00">Barcode lỗi</text>';
    }
  }
}
