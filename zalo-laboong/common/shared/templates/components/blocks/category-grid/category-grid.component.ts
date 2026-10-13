import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {IZmaCategoryGridBlockDefaults} from '../../../models/zma-template.model';
import {uriFeConst} from '../../../../constants';

@Component({
  selector: 'app-zma-category-grid',
  templateUrl: './category-grid.component.html',
  styleUrls: ['./category-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class CategoryGridComponent implements OnInit {
  @Input() data!: IZmaCategoryGridBlockDefaults;
  @Input() debug = false;

  // giả sử bạn đã có uriFeConst import ở file này

  ngOnInit() {
    if (this.debug) {
      console.log('[CategoryGridComponent] data =', this.data);
      console.log('[CategoryGridComponent] type =', this.categoryType);
    }
  }

  /** Kiểu category-grid, default = style1 */
  get categoryType(): string {
    return this.data?.type || 'style1';
  }

  /** Categories lấy từ config (data.items) */
  get categories() {
    return this.data?.items ?? [];
  }

  // Data style 1
  featureItems = [
    { title: 'Tất cả tour', icon: 'ph-bold ph-flag text-warning', link: uriFeConst.product.category },
    { title: 'Tin tức', icon: 'ph-bold ph-megaphone text-purple', link: '/news' },
    { title: 'Mini game', icon: 'ph-bold ph-circle-notch text-danger', link: uriFeConst.game },
    { title: 'CTV', icon: 'ph-bold ph-handshake text-primary', link: '/' }
  ];

  destinations = [
    {
      name: 'Lào Cai',
      image: 'https://vcdn1-dulich.vnecdn.net/2024/02/20/Caotoc-3017-1708419387.jpg?w=0&h=0&q=100&dpr=1&fit=crop&s=Zq6nV4CLl26lvB_2m0602g'
    },
    {
      name: 'Hưng Yên',
      image: 'https://cdn.tgdd.vn/Files/2023/05/27/1531840/trai-nghiem-du-lich-van-giang-hung-yen-voi-5-dia-diem-dong-khach-202305272234485255.jpg'
    },
    {
      name: 'Sơn La',
      image: 'https://media.baosonla.org.vn/public/hoaht/2024-09-27/diem-du-lich-sinh-thai-thac-dai-yem,-huyen-moc-chau(1).jpg'
    },
    {
      name: 'Hòa Bình',
      image: 'https://vcdn1-dulich.vnecdn.net/2022/05/12/maichauhideawaylakeresort12116-2557-3347-1652355363.jpg?w=1200&h=0&q=100&dpr=1&fit=crop&s=ArgnARX1jUyOi7RJbQc5Ew'
    },
    {
      name: 'Nam Định',
      image: 'https://xevietnam.com/wp-content/uploads/2020/06/bai-bien-long-thinh-nam-dinh.jpg'
    }
  ];
  protected readonly uriFeConst = uriFeConst;
}
