import {Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-user-review-form',
  templateUrl: './review-form.component.html',
  styleUrls: ['./review-form.component.scss'],
  standalone: false,
})
export class ReviewFormComponent extends AppCommonComponent implements OnInit {
  isEditMode = false;
  rating = 5;
  content = 'Chất vải dày dặn, đường may chắc chắn. Mặc lên form đẹp, rất hài lòng với sản phẩm.';

  readonly product = {
    name: 'Áo khoác denim basic',
    variant: 'M, Xanh denim',
    image: 'assets/img/product-image.png',
  };

  readonly media = [
    'assets/img/product-image.png',
    'assets/img/product-image2.png',
    'assets/img/no-image.png',
  ];

  constructor(private route: ActivatedRoute) {
    super();
  }

  ngOnInit(): void {
    this.isEditMode = this.route.snapshot.queryParamMap.get('mode') === 'edit';
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: this.isEditMode ? 'Sửa đánh giá sản phẩm' : 'Đánh giá sản phẩm',
    });
    this.setFooter({variant: 'tabs', show: false});
  }

  setRating(value: number): void {
    this.rating = value;
  }

  submit(): void {
    this.headerFooterFacade.back();
  }

  protected readonly Array = Array;
}
