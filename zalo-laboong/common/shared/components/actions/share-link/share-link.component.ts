import {
  Component, Input, Inject, PLATFORM_ID, ViewChild, ElementRef,
  OnInit, OnChanges, SimpleChanges, signal
} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import QRCode from 'qrcode';
import {RenderCodesComponent} from '../render-code/render-code.component';
import {openShareSheet} from 'zmp-sdk/apis';

@Component({
  selector: 'app-share-canvas',
  standalone: true,
  imports: [CommonModule, RenderCodesComponent],
  templateUrl: 'share-link.component.html',
  styleUrls: ['share-link.component.scss']
})
export class ShareLinkComponent implements OnInit, OnChanges {
  @Input() url = typeof location !== 'undefined' ? location.href : '';
  @Input() qrSize = 280;
  @Input() title = '';

  @ViewChild('qrCanvas') private qrCanvas?: ElementRef<HTMLCanvasElement>;

  readonly browser = signal<boolean>(false);

  steps = [
    {icon: 'ph-light ph-share-fat', label: 'Chia sẻ Link QR giới thiệu'},
    {icon: 'ph-light ph-user', label: 'Bạn bè quét QR'},
    {icon: 'ph-light ph-shopping-bag', label: 'Bạn bè mua sản phẩm'},
    {icon: 'ph-light ph-gift', label: 'Cả hai cùng nhận thưởng'},
  ];

  constructor(
    public offcanvas: NgbActiveOffcanvas,
    @Inject(PLATFORM_ID) pid: Object
  ) {
    this.browser.set(isPlatformBrowser(pid));
  }

  ngOnInit(): void {
    this.renderQR();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['url'] || changes['qrSize']) this.renderQR();
  }

  private renderQR(): void {
    if (!this.browser() || !this.qrCanvas) return;
    const canvas = this.qrCanvas.nativeElement;
    QRCode.toCanvas(canvas, this.url || '', {
      width: this.qrSize,
      margin: 1
    }, (err) => {
      if (err) console.warn('[ShareCanvas] render QR error', err);
    });
  }

  downloadQR(): void {
    if (!this.qrCanvas) return;
    const link = document.createElement('a');
    link.download = 'qr.png';
    link.href = this.qrCanvas.nativeElement.toDataURL('image/png');
    link.click();
  }

  copyLink(): void {
    const text = this.url || '';
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  shareZalo(): void {
    openShareSheet({
      type: 'zmp_deep_link',
      data: {
        title: "Tham gia Nhanh Shop ngay hôm nay!",
        description: 'Giải pháp bán hàng & CSKH trên Zalo',
        thumbnail: 'https://scontent.fhan14-1.fna.fbcdn.net/v/t39.30808-6/466946780_583180257548911_4758190046271806609_n.png?_nc_cat=101&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=KkzetVJplVEQ7kNvwHpYJac&_nc_oc=AdmSzr4o5dhH_xBaMugjPlcv8MjrQSOdW7SKaW7QGKWegyD6EOnOKEBpTLF1uNhTsJQ&_nc_zt=23&_nc_ht=scontent.fhan14-1.fna&_nc_gid=quZXPtLw4YP2yzOgRktwAQ&oh=00_Afj2YJaqvb5Ey3oqnPnq5p3nBf5ZI4aClr1VZxdCmaakWQ&oe=6914B140',
        path: "/",
      }
    }).catch(err => console.error('ShareSheet lỗi:', err));
  }
}
