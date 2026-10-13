import {Component, OnInit} from '@angular/core';
import { finalize } from 'rxjs';
import { openShareSheet } from 'zmp-sdk/apis';
import { SlideItem } from '@shared/components/actions';
import {CartManageService, ProductManageService} from '@shared/services/global';
import { IResProductDetail } from '@shared/models/api';
import { AppCommonComponent } from '@shared/components/app-common.service';
import {uriFeConst} from '@shared/constants';
import {ProductRepoService} from '@shared/services/repository';
import {normalizeProductImages} from '@shared/utils';


@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  standalone: false
})
export class ProductDetailComponent extends AppCommonComponent implements OnInit {
  idProduct!: number;
  product!: IResProductDetail;
  imagesItem: SlideItem[] = [];
  isLoading = false;
  errorMessage = '';


  constructor(
    public prdManageService: ProductManageService,
    public cartService: CartManageService,
    private productRepo: ProductRepoService
  ) {
    super();
    this.idProduct = Number(this.navService.getParam('id') ?? '');
  }

  ngOnInit(): void {
    const id = this.idProduct;

    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Chi tiết sản phẩm',
    });

    this.setFooter({variant: 'tabs', show: false});

    this.prdManageService.createAllState();
    this.isLoading = true;

    this.productRepo.getDetailOnce(id)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (detail) => {
          this.product = detail;
          const srcList =
            Array.isArray(detail.images) && detail.images.length > 0
              ? normalizeProductImages(detail.images, detail.imageThumb?.path || detail.image)
              : (detail.image ? [detail.image] : ['assets/img/placeholder.jpg']);

          this.imagesItem = srcList.map(image => ({ image }));
          this.prdManageService.set(detail);
        },
        error: () => {
          this.prdManageService.clear();
          this.errorMessage = 'Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.';
        }
      });
  }

  checkDisableSize(size: string) {
    const color = this.prdManageService.objPro.color;
    if (!color) return '';
    const sizeOfColor = this.prdManageService.selectChildColor[color];
    if (!sizeOfColor) return '';
    return sizeOfColor.includes(size) ? '' : 'disabled';
  }

  confirmOrder() {
    this.prdManageService.getProductIdBySizeAndColor();

    const err = this.prdManageService.validateSelection(this.product);
    if (err) {
      this.prdManageService.isRequiredAttr = err;
      return;
    }
    this.prdManageService.addToCart();
    this.notifyService.success('Thêm sản phẩm thành công!');
  }



  onShare(product: IResProductDetail) {
    if (!product) return;
    openShareSheet({
      type: 'zmp_deep_link',
      data: {
        title: product.name,
        thumbnail: product.image,
        path: '/product/view/?id=' + product.id,
      }
    }).catch(err => console.error('ShareSheet lỗi:', err));
  }

  protected readonly uriFeConst = uriFeConst;
}
