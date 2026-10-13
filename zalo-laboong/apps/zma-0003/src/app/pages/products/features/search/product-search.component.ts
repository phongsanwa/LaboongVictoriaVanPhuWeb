import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
  AfterViewInit,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IResProduct } from "@shared/models/api";
import { AppCommonComponent } from "@shared/components/app-common.service";
import { uriFeConst } from "@shared/constants";
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from "rxjs";
import { HomeManageService } from "@shared/services/global/home/home-cache.service";
import {ProductApiService} from '@shared/services/api';
import {productTotalPages} from '@shared/utils';

@Component({
  selector: "app-product-search",
  templateUrl: "./product-search.component.html",
  styleUrls: ["./product-search.component.scss"],
  standalone: false,
})
export class ProductSearchComponent
  extends AppCommonComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  products: IResProduct[] = [];
  newProducts: IResProduct[] = [];
  keyword = "";
  isLoading = false;
  errorMessage = "";

  currentPage = 1;
  totalPages = 1;
  pageSize = 20;

  /** Chế độ hiển thị: list hoặc grid */
  viewMode: 'list' | 'grid' = 'grid';

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private cd = inject(ChangeDetectorRef);
  private homeManageService = inject(HomeManageService);
  private route = inject(ActivatedRoute);
  private scrollContainer?: HTMLElement;
  private scrollHandler: any;

  constructor(private productApi: ProductApiService) {
    super();
  }

  ngOnInit(): void {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Tìm kiếm',
      className: 'header-color-blue'
    });
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((keyword) => {
        this.keyword = keyword.trim();
        if (this.keyword) {
          this.currentPage = 1;
          this.products = [];
          this.searchProducts(true);
        } else {
          this.products = [...this.newProducts];
          this.cd.markForCheck();
        }
      });

    // 🔗 Lắng nghe query param ?q=
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const q = (params["q"] || "").trim();
      if (q) {
        this.keyword = q;
        this.currentPage = 1;
        this.products = [];
        this.searchProducts(true);
      } else {
        this.loadProducts();
      }
    });
  }

  ngAfterViewInit(): void {
    this.scrollContainer = document.querySelector(".flex-1_custom") as HTMLElement;
    this.scrollHandler = () => this.onScroll();
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener("scroll", this.scrollHandler);
    } else {
      window.addEventListener("scroll", this.scrollHandler);
    }
  }

  onKeywordChange(event: any): void {
    this.search$.next(event.target.value);
  }

  searchProducts(reset = false): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = "";

    this.productApi
      .search({
        name: this.keyword,
        page: this.currentPage,
        icpp: this.pageSize,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.code === 1 && res.data) {
            const newProducts = res.data.result || [];
            this.totalPages = productTotalPages(res.data);
            this.products = reset
              ? newProducts
              : [...this.products, ...newProducts];
          } else if (reset) {
            this.products = [];
          }
          this.cd.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = "Không thể tải sản phẩm. Vui lòng thử lại sau.";
          this.cd.markForCheck();
        },
      });
  }

  loadProducts(): void {
    const params = { limit: 10 };
    this.homeManageService
      .getProductsOnce(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        const allProducts = res?.result ?? res ?? [];
        this.newProducts = allProducts;
        this.products = [...this.newProducts];
        this.cd.markForCheck();
      });
  }

  /** Chuyển sang chế độ hiển thị list */
  setListView(): void {
    this.viewMode = 'list';
  }

  /** Chuyển sang chế độ hiển thị grid */
  setGridView(): void {
    this.viewMode = 'grid';
  }

  onScroll(): void {
    if (this.isLoading || this.currentPage >= this.totalPages) return;

    const container = this.scrollContainer || document.documentElement;
    const scrollTop = container.scrollTop || window.scrollY;
    const visibleHeight = container.clientHeight || window.innerHeight;
    const scrollHeight = container.scrollHeight || document.body.offsetHeight;
    if (scrollTop + visibleHeight >= scrollHeight - 100) {
      this.currentPage++;
      this.searchProducts();
    }
  }

  ngOnDestroy(): void {
    if (this.scrollHandler) {
      if (this.scrollContainer) {
        this.scrollContainer.removeEventListener("scroll", this.scrollHandler);
      } else {
        window.removeEventListener("scroll", this.scrollHandler);
      }
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
  protected readonly uriFeConst = uriFeConst;
}
