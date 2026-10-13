import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter,
  Input, Output, SimpleChanges, OnChanges, ViewChild
} from '@angular/core';
import {CommonModule} from '@angular/common';

export interface WheelSegment {
  id: string;
  label: string;
  imageUrl?: string;
  color?: string;
  textColor?: string;
  weight?: number;
  meta?: any;
}

@Component({
  selector: 'app-lucky-wheel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }

    .stage {
      position: relative;
      margin: 30px auto;
      width: var(--size);
      height: var(--size);
      max-width: 100%;
    }

    .woay-bg { position: relative; width: 100%; height: 100%; }

    .wheel {
      position: absolute;
      left: 4%;
      top: 4%;
      width: 92%;
      height: 92%;
      transform-origin: center;
      z-index: 1;
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: 50%;
    }

    .woay-border {
      position: absolute;
      width: 100%;
      left: 0;
      top: 0;
      pointer-events: none;
      z-index: 2;
    }

    .btn-woay {
      position: absolute;
      width: 27%;
      left: 36.5%;
      top: 36.5%;
      aspect-ratio: 1 / 1;
      cursor: pointer;
      border: 0;
      background: transparent;
      padding: 0;
      z-index: 3;
    }
    .woay-button-bg { position: absolute; width: 100%; left: 0; top: 0; }

    .woay-arrow {
      position: absolute;
      width: 12%;
      left: 44%;
      top: 0;
      pointer-events: none;
      z-index: 4;
    }

    .visually-hidden {
      position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }
  `],
  template: `
    <div class="stage" style="pointer-events: none;" [style.--size.px]="size">
      <div class="woay-bg">
        <div #wheel class="wheel">
          <canvas #canvas></canvas>
        </div>

        <img class="woay-border" [src]="borderSrc" alt="" />

        <button type="button" class="btn-woay" (click)="spin()">
          <img class="woay-button-bg" [src]="buttonSrc" alt="" />
          <span class="visually-hidden">Quay vòng</span>
        </button>

        <img class="woay-arrow" [src]="arrowSrc" alt="" />
      </div>
    </div>
  `
})
export class LuckyWheelComponent implements AfterViewInit, OnChanges {
  @ViewChild('canvas', {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wheel', {static: true}) wheelRef!: ElementRef<HTMLElement>;

  @Input() borderSrc = 'https://app.woay.vn/w/12f91114-d9c6-45d7-8559-d8af6d09f6ca/assets/5b04cb93-00d2-41fe-b6bd-c0f39595fa90.png';
  @Input() buttonSrc = 'https://app.woay.vn/w/12f91114-d9c6-45d7-8559-d8af6d09f6ca/assets/e7f5f8db-c4fc-4da1-a658-3f72b23d4646.png';
  @Input() arrowSrc  = 'https://app.woay.vn/w/12f91114-d9c6-45d7-8559-d8af6d09f6ca/assets/8d6e6efc-d413-4b6e-aec7-14955ff2de5c.png';

  @Input() segments: WheelSegment[] = [];
  @Input() winnerId: string | null | undefined;
  @Input() size = 320;
  @Input() innerRadius = 28;
  @Input() spinTurns = 6;
  @Input() durationSec = 4;

  @Output() spinStart = new EventEmitter<void>();
  @Output() spinEnd = new EventEmitter<WheelSegment>();

  private gsap?: any;
  private rotationDeg = 0;
  private layout: Array<WheelSegment & {
    startDeg: number;
    endDeg: number;
    midDeg: number;
    color: string;
    textColor: string
  }> = [];
  private imgCache = new Map<string, HTMLImageElement>();
  spinning = false;

  ngAfterViewInit(): void {
    this.paintWheel();
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['segments'] && this.canvasRef) this.paintWheel();
  }

  private async paintWheel() {
    await this.preload();

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const px = this.size * dpr;
    const cx = px / 2, cy = px / 2, outerR = px / 2 - 2 * dpr, innerR = Math.max(0, this.innerRadius * dpr);

    canvas.width = px;
    canvas.height = px;
    ctx.clearRect(0, 0, px, px);

    // layout by weight
    // const w = this.segments.map(s => Math.max(0.0001, s.weight ?? 1)); // Tạm comment, fix kích thước bằng nhau, nếu có nhu cầu theo weight sẽ check sau
    const w = this.segments.map(() => 1);
    const sum = w.reduce((a, b) => a + b, 0);
    let acc = -90; // pointer at top
    this.layout = this.segments.map((s, i) => {
      const span = (w[i] / sum) * 360, startDeg = acc, endDeg = acc + span, midDeg = (startDeg + endDeg) / 2;
      acc = endDeg;
      return {...s, startDeg, endDeg, midDeg, color: s.color ?? this.autoColor(i), textColor: s.textColor ?? '#fff'};
    });

    // draw slices + image
    for (const seg of this.layout) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, this.rad(seg.startDeg), this.rad(seg.endDeg));
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.06)';
      ctx.lineWidth = dpr;
      ctx.stroke();

      // hole
      if (innerR > 0) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      // image (center on arc)
      if (seg.imageUrl) {
        const img = this.imgCache.get(seg.imageUrl);
        if (img && img.complete) {
          const r = (innerR + outerR) / 2;
          const wImg = 70 * dpr, hImg = 70 * dpr; // scale ảnh
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(this.rad(seg.midDeg));
          ctx.drawImage(img, r - wImg / 2, -hImg / 2, wImg, hImg);
          ctx.restore();
        }
      } else {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.rad(seg.midDeg));
        ctx.fillStyle = seg.textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${Math.max(10, Math.floor(14 * dpr))}px system-ui, Arial`;
        const rText = (innerR + outerR) / 2;
        ctx.fillText(seg.label, rText, 0);
        ctx.restore();
      }
    }

    // reset rotation transform
    this.rotationDeg = 0;
    this.wheelRef.nativeElement.style.transform = `rotate(0deg)`;
  }

  async spin() {
    if (this.spinning || !this.layout.length) return;
    await this.ensureGsap();

    const target = this.pickTarget();
    if (!target) return;

    const desired = -90;
    const current = this.norm(this.rotationDeg);
    const delta = this.norm(desired - target.midDeg - current);
    const total = this.rotationDeg + delta + 360 * this.spinTurns;

    this.spinning = true;
    this.spinStart.emit();
    const el = this.wheelRef.nativeElement;

    this.gsap.to(el, {
      rotate: total, duration: this.durationSec, ease: 'power4.out',
      onUpdate: () => (this.rotationDeg = this.gsap.getProperty(el, 'rotation') as number),
      onComplete: () => {
        this.spinning = false;
        this.rotationDeg = total;
        this.spinEnd.emit(target);
      }
    });
  }

  reset() {
    if (this.spinning) return;
    this.rotationDeg = 0;
    this.wheelRef.nativeElement.style.transform = 'rotate(0deg)';
  }

  private async preload() {
    const urls = Array.from(new Set(this.segments.map(s => s.imageUrl).filter(Boolean) as string[]));
    await Promise.all(urls.map(u => this.loadImg(u).catch(() => null)));
  }

  private loadImg(url: string) {
    return new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => {
        this.imgCache.set(url, i);
        res(i)
      };
      i.onerror = rej;
      i.src = url;
    });
  }

  private pickTarget() {
    if (this.winnerId) {
      const f = this.layout.find(s => s.id === this.winnerId);
      if (f) return f;
    }
    const t = this.layout.reduce((a, s) => a + (s.weight ?? 1), 0);
    let r = Math.random() * t;
    for (const s of this.layout) {
      r -= (s.weight ?? 1);
      if (r <= 0) return s;
    }
    return this.layout.at(-1)!;
  }

  private autoColor(i: number) {
    const h = Math.round((i / Math.max(1, this.segments.length)) * 360);
    return `hsl(${h} 80% 55%)`;
  }

  private rad(d: number) {
    return (d * Math.PI) / 180;
  }

  private norm(d: number) {
    let x = d % 360;
    if (x < 0) x += 360;
    return x;
  }

  private async ensureGsap() {
    if (this.gsap) return;
    const mod: any = await import('gsap');
    this.gsap = mod.gsap || mod;
  }
}
