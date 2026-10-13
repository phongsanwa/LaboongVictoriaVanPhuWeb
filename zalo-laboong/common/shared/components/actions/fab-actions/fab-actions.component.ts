import {Component, EventEmitter, Inject, Input, OnChanges, OnDestroy, OnInit, Output} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, merge, of } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';
import {NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle} from '@ng-bootstrap/ng-bootstrap';
import {DOCUMENT} from '@angular/common';
import {openChat} from 'zmp-sdk/apis'

type Pattern = string | RegExp;

@Component({
  selector: 'app-fab-actions',
  standalone: true,
  template: `
    @if (visible) {
      <div class="fab-stack" [style.--fab-bottom.px]="bottom" [style.--fab-right.px]="right">
        <div ngbDropdown #dd="ngbDropdown" container="body" placement="top-start" autoClose="outside">
          <button type="button" class="fab" aria-label="Liên hệ" ngbDropdownToggle (click)="$event.stopPropagation()">
            <i class="ph-light ph-headset"></i>
          </button>

          <div ngbDropdownMenu class="contact-menu">
            <button ngbDropdownItem class="menu-item" (click)="onCall(); dd.close()">
              <i class="ph-light ph-phone me-2"></i><span>Tổng đài</span>
            </button>
            <button ngbDropdownItem class="menu-item" (click)="openChat(); dd.close()">
              <i class="ph-light ph-chat-circle-dots me-2"></i><span>Chat với shop</span>
            </button>
          </div>
        </div>

        <button type="button" class="fab" aria-label="Chia sẻ" (click)="share.emit()">
          <i class="ph-light ph-share-fat"></i>
        </button>
      </div>
    }
  `,
  imports: [
    NgbDropdown,
    NgbDropdownMenu,
    NgbDropdownItem,
    NgbDropdownToggle
  ],
  styles: [`
    .fab-stack {
      position: fixed;
      right: var(--fab-right, 12px);
      bottom: var(--fab-bottom, 72px);
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 100;
    }

    .fab {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: #fff;
      box-shadow: 0 6px 16px rgba(0, 0, 0, .15);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .fab i {
      font-size: 20px;
      background: linear-gradient(45deg, var(--brand-color), #c2c2c2);
      background-clip: text;
      color: transparent;
      display: inline-block;
    }

    .dropup .dropdown-toggle::after {
      display: none !important;
    }
  `]
})
export class FabActionsComponent implements OnInit, OnChanges, OnDestroy {
  /** Check hiển thị theo router, để rỗng thì sẽ hiển thị tất cả màn hình */
  @Input() showOn: Pattern[] = [];
  /** Ẩn trên các route này */
  @Input() hideOn: Pattern[] = ['/cart', '/member'];
  /** vị trí */
  @Input() bottom = 82;
  @Input() right = 12;

  @Input() hotline = '18000000';
  @Input() zaloOA = '';

  @Output() share   = new EventEmitter<void>();
  @Output() callback = new EventEmitter<void>();
  @Output() favorite = new EventEmitter<void>();

  visible = true;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  ngOnInit(): void {
    merge(
      of(this.router.url),
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(e => e.urlAfterRedirects ?? e.url)
      )
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(url => this.updateVisible(url));
  }

  ngOnChanges(): void {
    this.updateVisible(this.router.url);
  }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
  }

  onCall(): void {
    try { this.doc.location.href = `tel:${this.hotline}`; } catch {}
  }

  openChat() {
    openChat({type: 'oa', id: '762755468038541624', message: 'Xin chào'});
  }

  private updateVisible(rawUrl: string): void {
    const path = this.normalizePath(rawUrl);
    if (this.matches(path, this.hideOn)) { this.visible = false; return; }
    this.visible = this.showOn.length ? this.matches(path, this.showOn) : true;
  }

  private normalizePath(u: string): string {
    try { return new URL(u, location.origin).pathname; } catch { return u.split('?')[0].split('#')[0]; }
  }

  private matches(path: string, rules: Pattern[]): boolean {
    return rules.some(r => typeof r === 'string'
      ? path === r || (r.endsWith('/*') && path.startsWith(r.slice(0, -2)))
      : r.test(path));
  }
}
