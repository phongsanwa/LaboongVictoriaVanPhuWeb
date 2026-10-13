import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import {IZmaProductGridBlockDefaults, IZmaProductItem} from '../../../models/zma-template.model';
import {uriFeConst} from '../../../../constants';


@Component({
  selector: 'app-zma-product-grid',
  templateUrl: './product-grid.component.html',
  styleUrls: ['./product-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ProductGridComponent implements OnInit {
  @Input() data!: IZmaProductGridBlockDefaults;
  @Input() debug = false;

  ngOnInit() {
    if (this.debug) {
      console.log('[ProductGridComponent] data =', this.data);
      console.log('[ProductGridComponent] type =', this.productType);
    }
  }

  /** Kiểu product-grid, ví dụ: style1 = card nhỏ grid, style2 = list lớn */
  get productType(): string {
    return this.data?.type || 'style1';
  }

  /** Danh sách product từ config */
  get products(): IZmaProductItem[] {
    return this.data?.items ?? [];
  }

  /** Class cột Bootstrap theo layout & columns (dùng cho style1) */
  get colClass(): string {
    if (this.data?.layout === 'list') return 'col-12';

    switch (this.data?.columns) {
      case 3: return 'col-4';
      case 2:
      default: return 'col-6';
    }
  }

  formatPrice(p: number | null | undefined): string {
    if (p == null) return '';
    return p.toLocaleString('vi-VN') + ' ₫';
  }

  protected readonly uriFeConst = uriFeConst;
}
