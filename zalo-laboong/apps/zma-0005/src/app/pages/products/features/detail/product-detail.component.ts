import {ChangeDetectorRef, Component, inject, OnInit} from "@angular/core";
import {IResProduct, IResProductDetail} from '@shared/models/api';
import {finalize, Subject, takeUntil} from 'rxjs';
import {HeaderFooterFacadeService, ProductManageService} from '@shared/services/global';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {SlideItem} from '@shared/components/actions';
import {HomeManageService} from '@shared/services/global/home/home-cache.service';
import {ProductRepoService} from '@shared/services/repository';
import {minimizeApp, openChat, openShareSheet} from 'zmp-sdk/apis';
import {uriFeConst} from '@shared/constants';
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
  haveAvailable = false;
  products: IResProduct[] = [];
  private homeManageService = inject(HomeManageService);
  private destroy$ = new Subject<void>();
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly facade = inject(HeaderFooterFacadeService);
  constructor(
    public prdManageService: ProductManageService,
    private productRepo: ProductRepoService
  ) {
    super();
    this.idProduct = Number(this.navService.getParam('id') ?? '');
  }


  ngOnInit(): void {
    const id = this.idProduct;
    this.setHeader({
      variant: 'title',
      show: false,
      back: true,
      title: 'Chi tiết sản phẩm',
    });

    this.setFooter({
      variant: 'cart',
      show: true,
      className: 'footer',
      addLabel: 'Thêm vào giỏ',
      buyLabel: 'Mua ngay'
    });

    const params = {
      limit: 10
    }
    this.homeManageService.getProductsOnce(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this.products = list?.result ?? [];
        this.cdr.markForCheck();
      });

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

          this.imagesItem = srcList.map(image => ({ image, title: detail.name }));

          this.prdManageService.set(detail);
          setTimeout(() => {
            this.haveAvailable = true;
          }, 0);
        },
        error: () => {
          this.prdManageService.clear();
          this.errorMessage = 'Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.';
        }
      });
  }

  minimizeOpenChat() {
    minimizeApp()
      .then(() => {
        openChat({type: 'user', id: '900441440596624596', message: 'Xin chào'});
      })
      .catch((err) => {
        console.error('Lỗi khi thu nhỏ hoặc mở chat:', err);
      });
  }

  onShare() {
    openShareSheet({
      type: 'zmp_deep_link',
      data: {
        title: this.product.name,
        thumbnail: this.product.image,
        path: '/product/view/?id=' + this.product.id
      }
    }).catch(err => console.error('ShareSheet lỗi:', err));
  }

  back(): void {
    this.facade.back();
  }

  protected readonly uriFeConst = uriFeConst;
}
