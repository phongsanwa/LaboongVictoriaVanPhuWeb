import {
  ChangeDetectorRef,
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
} from "@angular/core";
import { finalize, Subject, takeUntil } from "rxjs";
import { AppCommonComponent } from "@shared/components/app-common.service";
import {ActivatedRoute, Router} from "@angular/router";
import { NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { ProductManageService } from "@shared/services/global";
import { uriFeConst } from "@shared/constants";
import { CategoryCacheService } from "@shared/services/global/product/category-cache.service";
import {IResLoadCategory, IResProduct, ProductEntityId} from '@shared/models/api';

@Component({
  selector: "app-product-category",
  templateUrl: "./product-category.component.html",
  styleUrls: ["./product-category.component.scss"],
  standalone: false,
})
export class ProductCategoryComponent
  extends AppCommonComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  /** Danh mục cha/con */
  category: IResLoadCategory[] = [];

  /** Danh sách sản phẩm hiển thị */
  products: IResProduct[] = [];

  /** Trang hiện tại & tổng số trang */
  currentPage = 1;
  totalPages = 1;
  isLoadingMore = false;

  /** Danh mục đang chọn */
  selectedParentCategoryId!: ProductEntityId;
  selectedCategoryId!: ProductEntityId;
  selectedParent: IResLoadCategory | null = null;

  /** Chế độ hiển thị: list hoặc grid */
  viewMode: 'list' | 'grid' = 'grid';

  /** Service inject */
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private offcanvas = inject(NgbOffcanvas);
  private prdService = inject(ProductManageService);
  private categoryCache = inject(CategoryCacheService);
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  constructor() {
    super();
  }

  ngOnInit(): void {
    this.loadCategoriesOnce();
  }

  ngAfterViewInit(): void {
    // Dùng Promise để đảm bảo chạy sau vòng detect change hiện tại
    Promise.resolve().then(() => {
      this.setHeader({
        variant: "title",
        show: true,
        back: true,
        title: "Danh mục sản phẩm",
        className: "header-color-blue",
      });

      this.setFooter({
        variant: "tabs",
        show: false,
      });

      this.cdr.markForCheck();
    });
  }

  /** ✅ Chỉ load danh mục 1 lần */
  private loadCategoriesOnce(): void {
    this.spinner.show();
    this.categoryCache
      .getCategories()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.spinner.hide())
      )
      .subscribe({
        next: (categories) => {
          this.category = categories;

          if (this.category.length > 0) {
            this.route.queryParamMap
              .pipe(takeUntil(this.destroy$))
              .subscribe((params) => {
                const paramId = params.get("id");
                const matchedCategory = paramId
                  ? this.category.find((c) => String(c.id) === paramId)
                  : null;
                if (matchedCategory) {
                  this.selectedParentCategoryId = matchedCategory.id;
                  this.selectedCategoryId = matchedCategory.id;
                } else {
                  this.selectedParentCategoryId = this.category[0].id;
                  this.selectedCategoryId = this.category[0].id;
                }

                this.selectedParent = this.category.find(
                  (c) => String(c.id) === String(this.selectedParentCategoryId)
                )!;
                this.currentPage = 1;
                this.products = [];
                this.loadProductsOnce(1, true, true);
                this.cdr.detectChanges();
              });
          }
        },
        error: (err) => {
          console.error("Lỗi khi load danh mục", err);
          this.category = [];
        },
      });
  }

  /** Load sản phẩm theo danh mục + trang */
  private loadProductsOnce(
    page: number,
    reset = false,
    showSpinner = false
  ): void {
    if (showSpinner) this.spinner.show();

    const params = {
      categoryId: this.selectedCategoryId,
      page: page,
      icpp: 25,
      loadAttr: false,
    }

    this.categoryCache
      .getProducts(params)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (showSpinner) this.spinner.hide();
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          const { result, totalPages } = data;
          this.totalPages = totalPages;

          if (reset || page === 1) {
            this.products = result;
          } else {
            this.products = [...this.products, ...result];
          }
        },
        error: (err) => console.error("Lỗi khi load sản phẩm:", err),
      });
  }

  /** Chọn danh mục cha */
  selectCategory(categoryId: ProductEntityId): void {
    this.selectedParentCategoryId = categoryId;
    this.selectedCategoryId = categoryId;
    this.selectedParent = this.category.find((c) => String(c.id) === String(categoryId))!;
    this.currentPage = 1;
    this.products = [];
    this.loadProductsOnce(1, true, true);
  }

  /** Chọn danh mục con */
  selectSubCategory(categoryId: ProductEntityId): void {
    this.selectedCategoryId = categoryId;
    this.currentPage = 1;
    this.products = [];
    this.loadProductsOnce(1, true, true);
  }

  /** Cuộn để load thêm */
  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollTop + element.clientHeight;
    const maxScroll = element.scrollHeight;

    if (
      scrollPosition >= maxScroll - 100 &&
      this.currentPage < this.totalPages &&
      !this.isLoadingMore
    ) {
      this.currentPage++;
      this.isLoadingMore = true;
      this.loadProductsOnce(this.currentPage, false, false);
    }
  }

  /** Chuyển sang chế độ hiển thị list */
  setListView(): void {
    this.viewMode = 'list';
  }

  /** Chuyển sang chế độ hiển thị grid */
  setGridView(): void {
    this.viewMode = 'grid';
  }

  goToSearch(): void {
    this.router.navigate(['/product/search']);
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected readonly uriFeConst = uriFeConst;
}
