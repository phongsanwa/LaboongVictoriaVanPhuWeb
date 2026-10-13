import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  ChangeDetectorRef
} from "@angular/core";
import {IRelatedProductParams, IResProductDetail, IResProductInList} from '@shared/models/api';
import {ProductManageService} from '@shared/services/global';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {SlideItem} from '@shared/components/actions';
import {ProductRepoService} from '@shared/services/repository';
import {distinctUntilChanged, switchMap, takeUntil} from 'rxjs/operators';
import {ActivatedRoute, Router} from '@angular/router';
import {filter, finalize, map} from 'rxjs';
import {normalizeProductImages} from '@shared/utils';

export type IPSelectOption = {
  name: string,
  code: string | number
}

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  standalone: false
})
export class ProductDetailComponent extends AppCommonComponent implements OnInit, AfterViewInit, OnDestroy {
  idProduct!: number;
  product!: IResProductDetail;
  relatedProducts: IResProductInList[] = [];
  imagesItem: SlideItem[] = [];
  errorMessage = '';

  @ViewChild('contentEl', { static: false })
  contentEl?: ElementRef<HTMLElement>;

  expanded = false;
  showToggle = false;
  collapsedHeight = 81;

  private ro?: ResizeObserver;

  constructor(
    public prdManageService: ProductManageService,
    private productRepo: ProductRepoService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
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
      className: 'header-color'
    });

    this.setFooter({
      variant: 'cart',
      show: true,
      className: 'footer',
      addLabel: 'Thêm vào giỏ',
      buyLabel: 'Mua ngay'
    });

    this.prdManageService.createAllState();

    this.route.queryParamMap.pipe(
      map(p => Number(p.get('id') || '')),
      filter(id => Number.isFinite(id) && id > 0),
      distinctUntilChanged(),
      takeUntil(this.destroyed),
      switchMap(id => {
        this.idProduct = id;
        // this.spinner.show();
        return this.productRepo.getDetailOnce(id).pipe(finalize(() => this.spinner.hide()));
      })
    ).subscribe({
      next: (detail) => {
        this.product = detail;
        const srcList = normalizeProductImages(detail.images, detail.imageThumb?.path || '');
        this.imagesItem = (srcList.length ? srcList : ['assets/img/placeholder.jpg'])
          .map(img => ({
            image: img,
            title: detail.name
          }));

        this.prdManageService.set(detail);

        // load related theo id/category mới
        // const pid = Number(detail.id) || 0;
        // const cid = Number(detail.category.id) || 0;
        // this.loadRelatedProducts(pid, cid);

        // re-attach observer cho mô tả
        queueMicrotask(() => this.tryAttachObserver());
      },
      error: () => {
        this.prdManageService.clear();
        this.errorMessage = 'Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.';
      }
    });
  }

  ngAfterViewInit(): void {
    this.tryAttachObserver();
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
  }

  private tryAttachObserver(): void {
    const host = this.contentEl?.nativeElement;
    if (!host) return;

    this.computeToggle();
    if ('ResizeObserver' in window) {
      this.ro?.disconnect();
      this.ro = new ResizeObserver(() => this.computeToggle());
      this.ro.observe(host);
    }
  }

  toggle(): void {
    this.expanded = !this.expanded;
    setTimeout(() => this.computeToggle(), 0);
  }

  private computeToggle(): void {
    const el = this.contentEl?.nativeElement;
    if (!el) return;
    const needToggle =
      el.scrollHeight > this.collapsedHeight + 2;
    if (this.showToggle !== needToggle) {
      this.showToggle = needToggle;
      this.cdr.detectChanges();
    }
  }

  // Load danh sách sản phẩm tương tự
  // private loadRelatedProducts(productId: number, categoryId: number): void {
  //   const params: IRelatedProductParams = {
  //     loadAttr: true,
  //     limit: 6,
  //     id: productId,
  //     categoryId: categoryId,
  //     excludedIds: [productId]
  //   };
  //
  //   this.productRepo.getRelatedProducts(params)
  //     .pipe(takeUntil(this.destroyed))
  //     .subscribe({
  //       next: (products) => {
  //         this.relatedProducts = products;
  //       },
  //       error: () => {
  //         this.relatedProducts = [];
  //       }
  //     });
  // }
}
