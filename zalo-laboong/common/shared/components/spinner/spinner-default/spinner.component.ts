import { Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (loading) {
      <div
        [class]="'cssload-container h-100 w-100 ' + (position || '')"
        [style.opacity]="opacity">
        <div class="cssload-speeding-wheel"></div>
      </div>
    }
  `,
  styleUrls: ['./spinner.component.scss']
})
export class AppSpinnerComponent {
  /** Điều khiển hiển thị spinner */
  @Input() loading = false;
  /** Độ mờ của overlay (0–1) */
  @Input() opacity = 1;
  /** position-absolute / fixed tuỳ nhu cầu */
  @Input() position = 'position-absolute';
}
