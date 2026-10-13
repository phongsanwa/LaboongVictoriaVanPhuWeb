import {Component, OnDestroy, OnInit} from "@angular/core";
import {ProductManageService} from '@shared/services/global';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {SlideItem} from '@shared/components/actions';
import { NavTabItem } from '@shared/components/app-nav-tabs/app-nav-tab.component';
import {IResProductDetail, IResProduct, IRelatedProductParams} from '@shared/models/api';
import {ProductRepoService} from '@shared/services/repository';
import { uriFeConst } from "@shared/constants";
import {takeUntil} from 'rxjs/operators';
import {Params} from '@angular/router';
import {normalizeProductImages} from '@shared/utils';

export type IPSelectOption = {
  name: number | string,
  code: number | string
}

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  standalone: false
})
export class ProductDetailComponent extends AppCommonComponent implements OnInit, OnDestroy {
  tabs: NavTabItem[] = [];
  activeTab: string = 'overview';
  idProduct!: number;
  product!: IResProductDetail;
  imagesItem: SlideItem[] = [];
  errorMessage = '';
  relatedProducts: IResProduct[] = [];
  isLoadingRelated = false;

  constructor(
    public prdManageService: ProductManageService,
    private productRepo: ProductRepoService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Chi tiết sản phẩm',
      className: 'header-color'
    });

    this.setFooter({
      variant: 'cart',
      show: true,
      className: 'footer',
      addLabel: 'Thêm vào giỏ',
      buyLabel: 'Mua ngay'
    });

    this.tabs = [
      { key: 'overview', label: 'Tổng quan' },
      { key: 'detail', label: 'Chi tiết sản phẩm' },
      { key: 'suggestion', label: 'Gợi ý' },
    ];
    this.prdManageService.createAllState();

    this.navService.subQueryParams()
      .pipe(takeUntil(this.destroyed))
      .subscribe((params: Params) => {
        const newId = Number(params['id']);
        if (newId && newId !== this.idProduct) {
          this.idProduct = newId;
          this.loadProductData(newId);
        } else if (newId && !this.product) {
          this.idProduct = newId;
          this.loadProductData(newId);
        }
      });
  }

  ngOnDestroy(): void {
    this.getDestroySubs();
  }

  /**
   * Load all product data (detail + related products)
   * Reset state trước khi load data mới
   */
  private loadProductData(id: number): void {
    // Reset state
    this.activeTab = 'overview';
    this.relatedProducts = [];
    this.errorMessage = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load product detail
    this.loadProductDetail(id);
  }

  /**
   * Load product detail
   */
  private loadProductDetail(id: number): void {
    this.spinner.show();

    this.productRepo.getDetailOnce(id)
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: (detail) => {
          this.product = detail;

          const srcList =
            Array.isArray(detail.images) && detail.images.length > 0
              ? normalizeProductImages(detail.images, detail.imageThumb?.path || detail.image)
              : (detail.image ? [detail.image] : ['assets/img/placeholder.jpg']);

          this.imagesItem = srcList.map(image => ({ image, title: detail.name }));

          this.prdManageService.set(detail);
          this.spinner.hide()
          if (detail.categoryId) {
            const categoryId = Number(detail.categoryId);
            this.loadRelatedProducts(id,categoryId);
          }
        },
        error: () => {
          this.prdManageService.clear();
          this.spinner.hide();
          this.errorMessage = 'Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.';
        }
      });
  }

  /**
   * Load related products by category
   */
  private loadRelatedProducts(productId: number, categoryId: number): void {
    this.isLoadingRelated = true;

    const params: IRelatedProductParams = {
      loadAttr: true,
      limit: 6,
      id: productId,
      categoryId: categoryId,
      excludedIds: [productId]
    };

    this.productRepo.getRelatedProducts(params)
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: (products) => {
          this.relatedProducts = products;
          this.isLoadingRelated = false;
        },
        error: (err) => {
          console.error('Error loading related products:', err);
          this.relatedProducts = [];
          this.isLoadingRelated = false;
        }
      });
  }

  onTabChange(tabKey: string) {
    this.activeTab = tabKey;
    const el = document.getElementById(tabKey);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Copy product link to clipboard
   */
  copyProductLink(): void {
    if (!this.product?.id) {
      this.notifyService.error('Không thể sao chép link');
      return;
    }

    const productPath = `/product/detail/?id=${this.product.id}`;
    const fullUrl = `${window.location.origin}${productPath}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl)
        .then(() => {
          this.notifyService.success('Đã sao chép link sản phẩm');
        })
        .catch((err) => {
          console.error('Failed to copy link:', err);
          this.notifyService.error('Không thể sao chép link');
        });
    } else {
      this.notifyService.error('Trình duyệt không hỗ trợ');
    }
  }

  protected readonly uriFeConst = uriFeConst;
}
