import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IResProduct } from "@shared/models/api";
import { AppCommonComponent } from "@shared/components/app-common.service";
import { uriFeConst } from "@shared/constants";
import {Subject, takeUntil, debounceTime, distinctUntilChanged, finalize} from "rxjs";
import {ProductApiService} from '@shared/services/api';
import {HeaderFooterFacadeService} from '@shared/services/global/layout-service/header-footer-facade.service';
import {productTotalPages} from '@shared/utils';

@Component({
  selector: "app-product-search",
  templateUrl: "./product-search.component.html",
  styleUrls: ["./product-search.component.scss"],
  standalone: false,
})
export class ProductSearchComponent
  extends AppCommonComponent
  implements OnInit, OnDestroy
{
  products: IResProduct[] = [];
  newProducts: IResProduct[] = [];
  keyword = "";
  isLoading = false;
  errorMessage = "";

  currentPage = 1;
  totalPages = 1;
  pageSize = 20;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private cd = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private readonly facade = inject(HeaderFooterFacadeService);

  constructor(private productApi: ProductApiService) {
    super();
  }

  ngOnInit(): void {
    this.setHeader({
      variant: 'title',
      show: false,
      back: true,
      title: 'Tìm kiếm',
    });
    this.setFooter({variant: 'tabs', show: false});
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((keyword) => {
        this.keyword = keyword.trim();
        if (this.keyword) {
          this.currentPage = 1;
          this.products = [];
          this.searchProducts(this.currentPage, true);
        } else {
          this.products = [...this.newProducts];
          this.cd.markForCheck();
        }
      });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const q = (params["q"] || "").trim();
      if (q) {
        this.keyword = q;
        this.currentPage = 1;
        this.products = [];
        this.searchProducts(this.currentPage, true);
      }
    });
  }

  onKeywordChange(event: any): void {
    this.search$.next(event.target.value);
  }


  private searchProducts(
    page: number,
    reset = false,
  ): void {
    this.isLoading = true;

    const params = {
      page: page,
      icpp: this.pageSize,
      name: this.keyword,
    };

    this.productApi
      .search(params)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (res) => {
          const result = res?.data?.result ?? [];
          this.totalPages = productTotalPages(res?.data);

          if (reset) {
            this.products = result;
          } else {
            this.products = [...this.products, ...result];
          }

          this.cd.markForCheck();
        },
        error: () => console.error("Lỗi khi load sản phẩm")
      });
  }


  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollTop + element.clientHeight;
    const maxScroll = element.scrollHeight;

    if (scrollPosition >= maxScroll - 100 && !this.isLoading && this.currentPage < this.totalPages
    ) {
      this.currentPage++;
      this.searchProducts(this.currentPage, false);
    }
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  back(): void {
    this.facade.back();
  }

  protected readonly uriFeConst = uriFeConst;
}
