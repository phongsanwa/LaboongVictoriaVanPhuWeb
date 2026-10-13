import {Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {uriFeConst} from '@shared/constants';
import {ActivatedRoute, Router} from '@angular/router';

type ReviewTab = 'reviewed' | 'pending';

interface ReviewProduct {
  id: number;
  name: string;
  variant: string;
  image: string;
  purchasedAt: string;
}

interface ReviewedItem extends ReviewProduct {
  rating: number;
  content: string;
  reviewedAt: string;
  likes: number;
  media: string[];
}

@Component({
  selector: 'app-user-reviews',
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss'],
  standalone: false,
})
export class ReviewsComponent extends AppCommonComponent implements OnInit {
  activeTab: ReviewTab = 'reviewed';

  readonly reviewedItems: ReviewedItem[] = [
    {
      id: 1,
      name: 'Áo khoác denim basic nam nữ đủ size đủ số...',
      variant: 'M, Xanh denim',
      image: 'assets/img/product-image.png',
      purchasedAt: '20/05/2024',
      rating: 4,
      content: 'Chất liệu đẹp, form chuẩn, mặc rất thoải mái!',
      reviewedAt: '20/05/2024 16:48',
      likes: 12,
      media: ['assets/img/product-image.png', 'assets/img/product-image2.png', 'assets/img/no-image.png'],
    },
    {
      id: 2,
      name: 'Áo khoác denim basic nam nữ đủ size đủ số...',
      variant: 'M, Xanh denim',
      image: 'assets/img/product-image.png',
      purchasedAt: '20/05/2024',
      rating: 4,
      content: 'Chất liệu đẹp, form chuẩn, mặc rất thoải mái!',
      reviewedAt: '20/05/2024 16:48',
      likes: 12,
      media: ['assets/img/product-image2.png', 'assets/img/no-image.png', 'assets/img/product-image.png'],
    },
  ];

  readonly pendingItems: ReviewProduct[] = [
    {id: 11, name: 'Áo khoác denim basic', variant: 'M, Xanh denim', image: 'assets/img/product-image.png', purchasedAt: '20/05/2024'},
    {id: 12, name: 'Quần jeans ống suông dài rộng ngắn...', variant: 'L, Xanh nhạt', image: 'assets/img/product-image2.png', purchasedAt: '19/05/2024'},
    {id: 13, name: 'Áo sơ mi trắng cổ điển thanh lịch', variant: 'M, Trắng', image: 'assets/img/no-image.png', purchasedAt: '22/05/2024'},
    {id: 14, name: 'Giày thể thao nhẹ nhàng, màu xanh...', variant: '40, Xanh', image: 'assets/img/product-image.png', purchasedAt: '20/05/2024'},
    {id: 15, name: 'Túi xách tay da thật phong cách retro', variant: 'Đen', image: 'assets/img/product-image2.png', purchasedAt: '18/05/2024'},
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    super();
  }

  ngOnInit(): void {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Đánh giá của tôi',
    });
    this.setFooter({variant: 'tabs', show: false});

    const tab = this.route.snapshot.queryParamMap.get('tab');
    this.activeTab = tab === 'pending' ? 'pending' : 'reviewed';
  }

  selectTab(tab: ReviewTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {tab},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  openReviewForm(item: ReviewProduct, edit = false): void {
    this.navService.redirect([uriFeConst.user.reviewForm], {
      queryParams: {
        id: item.id,
        mode: edit ? 'edit' : 'create',
      },
    });
  }

  protected readonly Array = Array;
}
