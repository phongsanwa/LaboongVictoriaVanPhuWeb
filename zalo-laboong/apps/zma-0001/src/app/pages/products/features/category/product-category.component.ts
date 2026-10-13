import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
} from "@angular/core";
import {
  IResProductInList,
  ProductEntityId,
} from "@shared/models/api";
import {EMPTY, finalize, map, startWith, take, takeUntil} from "rxjs";
import {AppCommonComponent} from "@shared/components/app-common.service";
import {uriFeConst} from "@shared/constants";
import {CategoryCacheService} from "@shared/services/global/product/category-cache.service";
import {distinctUntilChanged, switchMap, tap} from 'rxjs/operators';
import {IResLoadCategory} from '@shared/models/api';

@Component({
  selector: "app-product-category",
  templateUrl: "./product-category.component.html",
  styleUrls: ["./product-category.component.scss"],
  standalone: false,
})
export class ProductCategoryComponent extends AppCommonComponent implements OnInit, OnDestroy {
  @ViewChild('categoryScroll') categoryScrollRef!: ElementRef<HTMLElement>;

  /** Danh mục cha/con */
  category: IResLoadCategory[] = [];

  /** Danh sách sản phẩm hiển thị */
  products: IResProductInList[] = [];

  /** Trang hiện tại & tổng số trang */
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  hasMoreProducts = false;

  /** Danh mục đang chọn */
  selectedParentCategoryId!: ProductEntityId;
  selectedCategoryId!: ProductEntityId;
  selectedParent: IResLoadCategory | null = null;

  private isLoadingNextPage = false;
  showSubCategory = false;
  constructor(
    private categoryCache: CategoryCacheService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.setHeader({
      variant: "title",
      show: true,
      back: true,
      title: "Danh mục sản phẩm",
    });

    this.setFooter({
      variant: "tabs",
      show: true,
    });

    this.loadCategoriesOnce();
  }

  ngOnDestroy(): void {
    this.getDestroySubs();
  }

  private loadCategoriesOnce(): void {

    this.categoryCache.getCategories().pipe(
      take(1),
      tap(cats => this.category = Array.isArray(cats) ? cats : []),

      switchMap(cats => {
        if (!cats.length) return EMPTY;
        return this.navService.subQueryParams().pipe(
          startWith(this.navService.getParams()),
          map((params: any) => params?.['id'] != null ? String(params['id']) : ''),
          map(id => cats.find(c => String(c.id) === id)?.id ?? cats[0].id),
          distinctUntilChanged(),
          tap(activeId => {
            // Update lại các state
            this.selectedParentCategoryId = activeId;
            this.selectedCategoryId = activeId;
            this.selectedParent = cats.find(c => String(c.id) === String(activeId))!;

            this.currentPage = 1;
            this.totalPages = 1;
            this.totalItems = 0;
            this.hasMoreProducts = false;
            this.products = [];
            this.loadProductsOnce(1, true, true);
            this.scrollToActiveCategory(activeId);
          })
        );
      }),
      takeUntil(this.destroyed)
    ).subscribe({
      error: () => {
        this.category = [];
      }
    });
  }

  /** Load sản phẩm theo danh mục + trang */
  private loadProductsOnce(
    page: number,
    reset = false,
    showSpinner = false
  ): void {
    if (this.isLoadingNextPage || this.selectedCategoryId == null) return; //Chặn load trùng
    this.isLoadingNextPage = true;

    if (showSpinner) this.spinner.show();

    const params = {
      categoryId: this.selectedCategoryId,
      page,
      pageSize: 25,
      loadAttr: false,
    }

    this.categoryCache
      .getProducts(params)
      .pipe(takeUntil(this.destroyed),
        finalize(() => {
          this.isLoadingNextPage = false;
          if (showSpinner) this.spinner.hide();
        })
      )
      .subscribe({
        next: (data) => {
          const {result, totalPages, totalItems} = data;
          this.currentPage = Number(data.paginator?.page ?? page) || page;
          this.totalPages = totalPages;
          this.totalItems = totalItems;
          if (reset || page === 1) {
            this.products = result;
          } else {
            this.products = [...this.products, ...result];
          }
          this.hasMoreProducts = this.resolveHasMoreProducts(result.length);
        },
        error: (err) => {
          if (reset || page === 1) {
            this.products = [];
            this.totalItems = 0;
            this.totalPages = 1;
            this.hasMoreProducts = false;
          }
          console.error("Lỗi khi load sản phẩm:", err);
        },
      });
  }

  /** Chọn danh mục cha */
  selectCategory(categoryId: ProductEntityId): void {
    this.selectedParentCategoryId = categoryId;
    this.selectedCategoryId = categoryId;
    this.selectedParent = this.category.find((c) => String(c.id) === String(categoryId))!;
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalItems = 0;
    this.hasMoreProducts = false;
    this.products = [];
    this.loadProductsOnce(1, true, true);
  }

  /** Chọn danh mục con */
  selectSubCategory(categoryId: ProductEntityId): void {
    this.selectedCategoryId = categoryId;
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalItems = 0;
    this.hasMoreProducts = false;
    this.products = [];
    this.loadProductsOnce(1, true, true);
  }

  /** Cuộn để load thêm */
  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollTop + element.clientHeight;
    const maxScroll = element.scrollHeight;
    if (scrollPosition >= maxScroll - 100 && !this.isLoadingNextPage && this.hasMoreProducts) {
      this.loadProductsOnce(this.currentPage + 1, false, false);
    }
  }

  private resolveHasMoreProducts(fetchedCount: number): boolean {
    if (this.totalItems > 0) return this.products.length < this.totalItems;
    if (this.currentPage < this.totalPages) return fetchedCount > 0;
    return false;
  }

  /** Scroll ngang menu danh mục tới item đang active */
  private scrollToActiveCategory(categoryId: ProductEntityId): void {
    setTimeout(() => {
      const container = this.categoryScrollRef?.nativeElement;
      if (!container) return;
      const activeEl = container.querySelector(`[data-cate-id="${categoryId}"]`) as HTMLElement;
      if (!activeEl) return;
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  }

  protected readonly uriFeConst = uriFeConst;
}
