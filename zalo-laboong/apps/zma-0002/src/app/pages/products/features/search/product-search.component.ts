import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  IResLoadCategory,
  IResProductBrand,
  IResProductInList,
  ISearchProductParams,
  ProductEntityId,
  PRODUCT_FEATURE
} from "@shared/models/api";
import { AppCommonComponent } from "@shared/components/app-common.service";
import { uriFeConst } from "@shared/constants";
import {finalize, Subject, takeUntil, debounceTime, distinctUntilChanged} from "rxjs";
import { ProductApiService } from "@shared/services/api";
import {productTotalPages} from '@shared/utils';
import {CategoryCacheService} from '@shared/services/global/product/category-cache.service';

type SortOption = 'priceDesc' | 'priceAsc' | 'az' | 'za' | '';
type SortDirection = 'ASC' | 'DESC';

interface PriceRangeOption {
  label: string;
  min: number;
  max: number;
}

interface SearchFilters {
  minPrice: number | null;
  maxPrice: number | null;
  sort: SortOption;
  categoryId: ProductEntityId | null;
  brandId: ProductEntityId | null;
}

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
  private static readonly SEARCH_HISTORY_KEY = 'zma-0002:product-search-history';
  private static readonly MAX_HISTORY_ITEMS = 8;

  products: IResProductInList[] = [];
  suggestions: IResProductInList[] = [];
  categories: IResLoadCategory[] = [];
  brands: IResProductBrand[] = [];
  keyword = "";
  searchHistory: string[] = [];
  isSearchInputFocused = false;
  isLoading = false;
  isLoadingMore = false;
  isLoadingSuggestions = false;
  errorMessage = "";
  showFilterSheet = false;
  quickBuyProductId: number | null = null;

  currentPage = 1;
  totalPages = 1;
  pageSize = 20;
  hasMoreProducts = false;
  totalItems = 0;

  readonly priceRanges: PriceRangeOption[] = [
    { label: '0-100k', min: 0, max: 100000 },
    { label: '100k-200k', min: 100000, max: 200000 },
    { label: '200k-300k', min: 200000, max: 300000 },
  ];
  readonly suggestionSkeletons = [{id: 1}, {id: 2}, {id: 3}];
  filters: SearchFilters = this.createDefaultFilters();
  draftFilters: SearchFilters = this.createDefaultFilters();

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private cd = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  constructor(
    private productApi: ProductApiService,
    private categoryCache: CategoryCacheService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Tìm kiếm',
      className: 'header-color'
    });

    this.setFooter({
      variant: 'tabs',
      show: true,
    });

    this.loadCategories();
    this.loadBrands();
    this.loadSuggestions();
    this.loadSearchHistory();

    this.search$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((keyword) => {
        this.keyword = keyword.trim();
        this.currentPage = 1;
        this.products = [];
        this.totalItems = 0;
        this.totalPages = 1;
        this.hasMoreProducts = false;

        if (!this.keyword) {
          this.errorMessage = '';
          this.cd.markForCheck();
          return;
        }

        this.searchProducts(true);
      });

    // 🔗 Lắng nghe query param ?q=
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const q = (params["q"] || "").trim();
      if (q) {
        this.keyword = q;
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        this.hasMoreProducts = false;
        this.products = [];
        this.searchProducts(true);
      }
    });
  }

  onKeywordChange(event: any): void {
    this.search$.next(event.target.value);
  }

  onSearchFocus(): void {
    this.isSearchInputFocused = true;
  }

  onSearchBlur(): void {
    this.isSearchInputFocused = false;
  }

  clearKeyword(): void {
    this.keyword = '';
    this.products = [];
    this.totalItems = 0;
    this.totalPages = 1;
    this.hasMoreProducts = false;
    this.errorMessage = '';
    this.cd.markForCheck();
  }

  selectHistoryKeyword(keyword: string): void {
    const nextKeyword = keyword.trim();
    if (!nextKeyword) return;

    this.keyword = nextKeyword;
    this.isSearchInputFocused = false;
    this.currentPage = 1;
    this.products = [];
    this.totalItems = 0;
    this.totalPages = 1;
    this.hasMoreProducts = false;
    this.errorMessage = '';
    this.searchProducts(true);
  }

  removeHistoryKeyword(keyword: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    const normalized = keyword.trim().toLowerCase();
    this.searchHistory = this.searchHistory.filter(item => item.trim().toLowerCase() !== normalized);
    this.persistSearchHistory();
    this.cd.markForCheck();
  }

  clearSearchHistory(): void {
    this.searchHistory = [];
    this.persistSearchHistory();
    this.cd.markForCheck();
  }

  searchProducts(reset = false): void {
    if (this.isLoading || !this.keyword) return;

    if (reset) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }
    this.errorMessage = "";

    this.productApi
      .search(this.buildSearchParams())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.isLoadingMore = false;
          if (res.code === 1 && res.data) {
            const fetchedProducts = res.data.result || []; // tránh shadowing với this.newProducts
            const responsePage = Number(res.data.paginator?.page ?? this.currentPage) || this.currentPage;
            this.currentPage = responsePage;
            this.totalPages = productTotalPages(res.data);
            this.totalItems = res.data.paginator?.total || 0;
            if (reset) {
              this.addSearchHistory(this.keyword);
            }

            if (reset) {
              this.products = fetchedProducts;
            } else {
              this.products = [...this.products, ...fetchedProducts];
            }
            this.hasMoreProducts = this.resolveHasMoreProducts(fetchedProducts.length);
          } else if (reset) {
            this.products = [];
            this.totalItems = 0;
            this.totalPages = 1;
            this.hasMoreProducts = false;
          }
          this.cd.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.isLoadingMore = false;
          this.errorMessage = "Không thể tải sản phẩm. Vui lòng thử lại sau.";
          this.cd.markForCheck();
        },
      });
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
    if (atBottom && !this.isLoading && !this.isLoadingMore && this.hasMoreProducts) {
      this.searchProducts();
    }
  }

  openFilterSheet(): void {
    this.draftFilters = { ...this.filters };
    this.showFilterSheet = true;
  }

  closeFilterSheet(): void {
    this.showFilterSheet = false;
  }

  openQuickBuy(product: IResProductInList): void {
    this.quickBuyProductId = product.id;
  }

  closeQuickBuy(): void {
    this.quickBuyProductId = null;
  }

  selectPriceRange(range: PriceRangeOption): void {
    this.draftFilters = {
      ...this.draftFilters,
      minPrice: range.min,
      maxPrice: range.max,
    };
  }

  updateDraftPrice(field: 'minPrice' | 'maxPrice', event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value ? Number(input.value) : null;
    this.draftFilters = {
      ...this.draftFilters,
      [field]: Number.isFinite(value) ? value : null,
    };
  }

  selectSort(sort: SortOption): void {
    this.draftFilters = {
      ...this.draftFilters,
      sort: this.draftFilters.sort === sort ? '' : sort,
    };
  }

  selectCategory(categoryId: ProductEntityId): void {
    this.draftFilters = {
      ...this.draftFilters,
      categoryId: String(this.draftFilters.categoryId) === String(categoryId) ? null : categoryId,
    };
  }

  selectBrand(brandId: ProductEntityId): void {
    this.draftFilters = {
      ...this.draftFilters,
      brandId: String(this.draftFilters.brandId) === String(brandId) ? null : brandId,
    };
  }

  resetFilters(): void {
    this.draftFilters = this.createDefaultFilters();
  }

  applyFilters(): void {
    this.filters = { ...this.draftFilters };
    this.showFilterSheet = false;
    if (this.keyword) {
      this.currentPage = 1;
      this.products = [];
      this.hasMoreProducts = false;
      this.searchProducts(true);
    }
  }

  isSelectedPriceRange(range: PriceRangeOption): boolean {
    return this.draftFilters.minPrice === range.min && this.draftFilters.maxPrice === range.max;
  }

  isSelectedCategory(categoryId: ProductEntityId): boolean {
    return String(this.draftFilters.categoryId) === String(categoryId);
  }

  isSelectedBrand(brandId: ProductEntityId): boolean {
    return String(this.draftFilters.brandId) === String(brandId);
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filters.minPrice != null ||
      this.filters.maxPrice != null ||
      this.filters.sort ||
      this.filters.categoryId != null ||
      this.filters.brandId != null
    );
  }

  get shouldShowSearchHistory(): boolean {
    return this.isSearchInputFocused && !this.keyword.trim() && this.searchHistory.length > 0;
  }

  private buildSearchParams(): ISearchProductParams {
    const sortParams = this.buildSortParams(this.filters.sort);
    const params: ISearchProductParams = {
      name: this.keyword,
      page: this.isLoadingMore ? this.currentPage + 1 : this.currentPage,
      pageSize: this.pageSize,
      ...sortParams,
    };

    if (this.filters.minPrice != null) {
      params.fromPrice = this.filters.minPrice;
    }
    if (this.filters.maxPrice != null) {
      params.toPrice = this.filters.maxPrice;
    }
    if (this.filters.categoryId != null) {
      params.categoryId = this.filters.categoryId;
    }
    if (this.filters.brandId != null) {
      params.brandId = this.filters.brandId;
    }

    return params;
  }

  private buildSortParams(sort: SortOption): { sortPrice?: SortDirection; sortName?: SortDirection } {
    switch (sort) {
      case 'priceAsc':
        return { sortPrice: 'ASC' };
      case 'priceDesc':
        return { sortPrice: 'DESC' };
      case 'az':
        return { sortName: 'ASC' };
      case 'za':
        return { sortName: 'DESC' };
      default:
        return {};
    }
  }

  private resolveHasMoreProducts(fetchedCount: number): boolean {
    if (this.totalItems > 0) return this.products.length < this.totalItems;
    if (this.currentPage < this.totalPages) return fetchedCount > 0;
    return false;
  }

  private loadSuggestions(): void {
    this.isLoadingSuggestions = true;
    this.productApi.searchProductPaginator({
      page: 1,
      pageSize: 8,
      loadAttr: false,
      features: [PRODUCT_FEATURE.HOT],
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingSuggestions = false;
          this.cd.markForCheck();
        })
      )
      .subscribe({
        next: (res) => {
          this.suggestions = res.data?.result ?? [];
        },
        error: () => {
          this.suggestions = [];
        }
      });
  }

  private loadSearchHistory(): void {
    try {
      const raw = localStorage.getItem(ProductSearchComponent.SEARCH_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      this.searchHistory = Array.isArray(parsed)
        ? parsed
          .map(item => String(item || '').trim())
          .filter(Boolean)
          .slice(0, ProductSearchComponent.MAX_HISTORY_ITEMS)
        : [];
    } catch {
      this.searchHistory = [];
    }
  }

  private addSearchHistory(keyword: string): void {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) return;

    const lower = normalizedKeyword.toLowerCase();
    this.searchHistory = [
      normalizedKeyword,
      ...this.searchHistory.filter(item => item.trim().toLowerCase() !== lower),
    ].slice(0, ProductSearchComponent.MAX_HISTORY_ITEMS);
    this.persistSearchHistory();
  }

  private persistSearchHistory(): void {
    try {
      localStorage.setItem(
        ProductSearchComponent.SEARCH_HISTORY_KEY,
        JSON.stringify(this.searchHistory)
      );
    } catch {
    }
  }

  private loadCategories(): void {
    this.categoryCache.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = this.flattenCategories(categories ?? []);
          this.cd.markForCheck();
        },
        error: () => {
          this.categories = [];
        }
      });
  }

  private loadBrands(): void {
    this.productApi.loadBrands({page: 1, icpp: 100})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.brands = this.flattenBrands(this.normalizeBrandsResponse(res.data));
          this.cd.markForCheck();
        },
        error: () => {
          this.brands = [];
          this.cd.markForCheck();
        }
      });
  }

  private normalizeBrandsResponse(data: unknown): IResProductBrand[] {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];

    const value = data as {
      result?: IResProductBrand[];
      data?: IResProductBrand[];
      items?: IResProductBrand[];
    };

    return value.result ?? value.data ?? value.items ?? [];
  }

  private flattenCategories(categories: IResLoadCategory[]): IResLoadCategory[] {
    const map = new Map<string, IResLoadCategory>();
    const walk = (items: IResLoadCategory[]) => {
      items.forEach((category) => {
        map.set(String(category.id), category);
        if (category.childs?.length) {
          walk(category.childs);
        }
      });
    };

    walk(categories);
    return Array.from(map.values());
  }

  private flattenBrands(brands: IResProductBrand[]): IResProductBrand[] {
    const map = new Map<string, IResProductBrand>();
    const walk = (items: IResProductBrand[]) => {
      items.forEach((brand) => {
        map.set(String(brand.id), brand);
        if (brand.childs?.length) {
          walk(brand.childs);
        }
      });
    };

    walk(brands);
    return Array.from(map.values());
  }

  private createDefaultFilters(): SearchFilters {
    return {
      minPrice: null,
      maxPrice: null,
      sort: '',
      categoryId: null,
      brandId: null,
    };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  protected readonly uriFeConst = uriFeConst;
}
