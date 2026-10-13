import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input, OnChanges,
  Output,
  QueryList,
  ViewChildren
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NavTabItem {
  key: string;
  label: string;
  badge?: string | number | true | null; // true = dot
  disabled?: boolean;
}

export interface NavTabsColors {
  text?: string;       // màu chữ tab
  active?: string;     // màu chữ tab đang active
  underline?: string;  // màu gạch chân tab active (mặc định dùng màu active)
}

@Component({
  selector: 'app-nav-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tabs scroll-x">
      @for (t of tabs; track t.key) {
        <button #tabBtn
                type="button"
                class="tab"
                [attr.data-key]="t.key"
                [class.active]="active === t.key"
                [disabled]="t.disabled"
                (click)="onClick(t)">
          <span class="label">{{ t.label }}</span>

          @if (t.badge !== undefined && t.badge !== null && t.badge !== '') {
            @if (t.badge === true) {
              <span class="dot"></span>
            } @else {
              <span class="badge">{{ t.badge }}</span>
            }
          }
        </button>
      }
    </div>
  `,
  styles: [`
    :host{
      display:block;
      --navtabs-text: #00000;
      --navtabs-active: #0b2e69;
      --navtabs-underline: var(--navtabs-active);
    }

    .scroll-x{
      overflow-x:auto;
      overflow-y:hidden;
      -webkit-overflow-scrolling:touch;
      -ms-overflow-style:none;
      scrollbar-width:none;
      scroll-behavior:smooth;
    }
    .scroll-x::-webkit-scrollbar{ display:none; }

    .tabs{ display:flex; gap:20px; padding:12px 8px; border-bottom:1px solid #eee; }
    .tab{
      position:relative;
      background:transparent; border:0; padding:6px 0;
      font-weight:600; white-space:nowrap; cursor:pointer;
      color:var(--navtabs-text);
      display:inline-flex; align-items:center; gap:8px;
    }
    .tab:disabled{ opacity:.5; cursor:not-allowed; }
    .tab.active{ color:var(--navtabs-active); }
    .tab.active::after{
      content:''; position:absolute; left:0; right:0; bottom:-12px;
      height:2px; border-radius:2px; background:var(--navtabs-underline);
    }

    .badge{
      display:inline-block; padding:0 8px; line-height:18px; height:18px;
      border-radius:999px; font-size:12px; background:#f0f0f0; color:#333; font-weight:600;
    }
    .dot{
      width:8px; height:8px; border-radius:50%; background:var(--navtabs-active);
      display:inline-block;
    }

    .empty{ padding:12px; color:#9a9a9a; }
  `]
})
export class NavTabsComponent implements AfterViewInit, OnChanges {
  @ViewChildren('tabBtn')
  tabBtns!: QueryList<ElementRef<HTMLButtonElement>>;
  @Input() tabs: NavTabItem[] = [];
  @Input() active: string | null = null;
  @Output() activeChange = new EventEmitter<string>();

  @HostBinding('style.--navtabs-text') cssText?: string;
  @HostBinding('style.--navtabs-active') cssActive?: string;
  @HostBinding('style.--navtabs-underline') cssUnderline?: string;

  private _colors: NavTabsColors = {};
  @Input() set colors(v: NavTabsColors | undefined) {
    this._colors = v ?? {};
    this.cssText = this._colors.text ?? '#8b7766';
    this.cssActive = this._colors.active ?? '#0b2e69';
    this.cssUnderline = this._colors.underline ?? this.cssActive;
  }
  get colors() { return this._colors; }

  ngAfterViewInit() {
    this.scrollToActiveTab();
  }

  ngOnChanges() {
    setTimeout(() => {
      this.scrollToActiveTab();
    });
  }

  onClick(t: NavTabItem) {
    if (t.disabled) return;
    if (this.active === t.key) return;
    this.active = t.key;
    this.activeChange.emit(t.key);
  }

  // scroll tới tab active
  private scrollToActiveTab() {
    if (!this.active || !this.tabBtns?.length) return;

    const activeTab = this.tabBtns.find(
      item => item.nativeElement.dataset['key'] === this.active
    );

    activeTab?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });
  }



}
