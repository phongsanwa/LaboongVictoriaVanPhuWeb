import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import {IZmaAboutStoreBlockDefaults} from '../../../models/zma-template.model';

@Component({
  selector: 'app-zma-about-store',
  template: `
    <div class="zma-about-store mb-3">
      @switch (aboutType) {

        <!-- ========== STYLE 1: Card đơn giản với avatar + rating + mô tả ========== -->
        @case ('style1') {
          <section class="about-store about-store--style1 p-3 rounded-3">
            <div class="d-flex align-items-center mb-3">
              <div class="me-3">
                <img
                  [src]="logoUrl"
                  [alt]="storeName"
                  class="rounded-circle"
                  width="56"
                  height="56"
                />
              </div>

              <div class="flex-grow-1">
                <h6 class="mb-1 fw-semibold">{{ storeName }}</h6>

                <div class="small text-muted d-flex align-items-center gap-1">
                  <i class="ph-bold ph-star text-warning me-1"></i>
                  <span>{{ ratingText }}</span>
                </div>

                @if (subtitle) {
                  <div class="small text-muted mt-1">
                    {{ subtitle }}
                  </div>
                }
              </div>
            </div>

            @if (data.description) {
              <p class="mb-2 small text-muted">
                {{ data.description }}
              </p>
            }

            <div class="small">
              @if (data.address) {
                <div class="d-flex align-items-start mb-1">
                  <i class="ph ph-map-pin me-2 mt-1"></i>
                  <span>{{ data.address }}</span>
                </div>
              }

              @if (data.hotline) {
                <div class="d-flex align-items-center mb-1">
                  <i class="ph ph-phone me-2"></i>
                  <span>Hotline: {{ data.hotline }}</span>
                </div>
              }

              @if (data.openHours) {
                <div class="d-flex align-items-center">
                  <i class="ph ph-clock me-2"></i>
                  <span>Giờ mở cửa: {{ data.openHours }}</span>
                </div>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styleUrls: ['./about-store.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AboutStoreComponent implements OnInit {
  @Input() data!: IZmaAboutStoreBlockDefaults;
  @Input() debug = false;

  ngOnInit() {
    if (this.debug) {
      console.log('[AboutStoreComponent] data =', this.data);
      console.log('[AboutStoreComponent] type =', this.aboutType);
    }
  }

  /** Kiểu layout: style1 / style2 / ... */
  get aboutType(): string {
    return this.data.type || 'style1';
  }

  /** Tiêu đề khối */
  get title(): string {
    return this.data.title || 'Về cửa hàng';
  }

  /** Sub / mô tả ngắn */
  get subtitle(): string | undefined {
    return this.data.subtitle;
  }

  get storeName(): string {
    return this.data.storeName || 'Nhanh Shop';
  }

  get logoUrl(): string {
    return (
      this.data.logoUrl ||
      'https://posstatic.nvndev.net/assets/img/favicon.svg'
    );
  }

  get ratingText(): string {
    const r = this.data.rating ?? 4.8;
    const c = this.data.totalReviews ?? 120;
    return `${r.toFixed(1)} · ${c} đánh giá`;
  }
}
