import { Component, inject, Input } from '@angular/core';
import { AppConfigStateService } from '@core/services/app-config-state.service';

@Component({
  selector: 'app-spinner-with-logo',
  standalone: true,
  template: `
    <div class="spinner-overlay"
         [class.hidden]="!loading"
         [style.--overlay-alpha]="opacity">
      <div class="spin-wrapper"
           [style.--size.rem]="sizeRem"
           [style.--thickness.px]="thickness"
           [style.--speed.s]="speed"
           [style.--track-color]="trackColor"
           [style.--segment-color]="segmentColor">
        <div class="spin-track"></div>
        <div class="spin-loader"></div>
        <div class="logo-wrap">
          <img [src]="resolvedLogoUrl" alt="logo">
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./spinner-with-logo.component.scss'],
})
export class SpinnerWithLogoComponent {
  private appConfig = inject(AppConfigStateService);

  private static readonly DEFAULT_LOGO = 'https://posstatic.nvndev.net/assets/img/favicon.svg';

  /**
   * Cho phép override logo thủ công.
   * Nếu null → tự lấy từ AppConfigStateService.appLogoUrl (brand logo của mini app).
   * Nếu cả 2 đều null → dùng DEFAULT_LOGO.
   */
  @Input() logoUrl: string | null = null;

  get resolvedLogoUrl(): string {
    return this.logoUrl
      || this.appConfig.appLogoUrl
      || SpinnerWithLogoComponent.DEFAULT_LOGO;
  }

  /** Kích thước vòng (rem) và độ dày nét (px) */
  @Input() sizeRem = 2.85;
  @Input() thickness = 3;

  /** Tốc độ quay (giây) */
  @Input() speed = 1;

  /** Màu track và màu segment động */
  @Input() trackColor = '#ccc';
  @Input() segmentColor = '#f82c2c';

  /** Hiển thị/ẩn, độ mờ, và lớp vị trí (absolute/fixed/relative...) */
  @Input() loading = true;
  @Input() opacity = 0.25;
  @Input() position = 'position-absolute';
}
