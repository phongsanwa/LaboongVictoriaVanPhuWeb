import {DOCUMENT} from "@angular/common";
import {Component, Inject, OnDestroy, OnInit,} from "@angular/core";
import {
  IProductAttribute,
  IProductAttributeValue,
  IResLoadCategory,
  IResProductInList,
  ProductEntityId,
} from "@shared/models/api";
import {EMPTY, finalize, map, startWith, take, takeUntil} from "rxjs";
import { AppCommonComponent } from "@shared/components/app-common.service";
import { uriFeConst } from "@shared/constants";
import { CategoryCacheService } from "@shared/services/global/product/category-cache.service";
import {distinctUntilChanged, switchMap, tap} from 'rxjs/operators';

@Component({
  selector: "app-product-category",
  templateUrl: "./product-category.component.html",
  styleUrls: ["./product-category.component.scss"],
  standalone: false,
})
export class ProductCategoryComponent extends AppCommonComponent implements OnInit, OnDestroy {
  private readonly bodyScrollLockClass = 'zma-product-category-lock-scroll';

  /** Danh mục cha/con */
  category: IResLoadCategory[] = [];

  /** Danh sách sản phẩm hiển thị */
  products: IResProductInList[] = [];
  attributes: IProductAttribute[] = [];
  selectedAttributeValues: Record<string, IProductAttributeValue[]> = {};
  draftAttributeValues: Record<string, IProductAttributeValue[]> = {};
  showAttributeFilterSheet = false;
  activeAttribute: IProductAttribute | null = null;

  /** Trang hiện tại & tổng số trang */
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  hasMoreProducts = false;

  /** Danh mục đang chọn */
  selectedParentCategoryId: ProductEntityId | null = null;
  selectedCategoryId: ProductEntityId | null = null;
  selectedParent: IResLoadCategory | null = null;

  /** Service inject */
  isLoadingProducts = false;
  isLoadingNextPage = false;
  isLoadingAttributes = false;
  quickBuyProductId: number | null = null;

  constructor(
    private categoryCache: CategoryCacheService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    super();
  }
  ngOnInit(): void {
    this.document.body.classList.add(this.bodyScrollLockClass);
    this.updateHeader();

    this.setFooter({
      variant: "tabs",
      show: true,
    });

    this.loadCategoriesOnce();
  }
  ngOnDestroy(): void {
    this.document.body.classList.remove(this.bodyScrollLockClass);
    this.getDestroySubs();
  }


  /** ✅ Chỉ load danh mục 1 lần */
  private loadCategoriesOnce(): void {
    this.categoryCache.getCategories().pipe(
      take(1),
      tap(cats => this.category = Array.isArray(cats) ? cats : []),

      switchMap(cats => {
        if (!cats.length) return EMPTY;
        return this.navService.subQueryParams().pipe(
          startWith(this.navService.getParams()),
          map((params: any) => params?.['id'] != null ? String(params['id']) : ''),
          map(id => cats.find(c => String(c.id) === id) ?? null),
          distinctUntilChanged(),
          tap(activeCategory => {
            this.currentPage = 1;
            this.totalPages = 1;
            this.totalItems = 0;
            this.hasMoreProducts = false;
            this.products = [];

            if (!activeCategory) {
              this.selectedParentCategoryId = null;
              this.selectedCategoryId = null;
              this.selectedParent = null;
              this.resetAttributeFilters();
              this.updateHeader();
              return;
            }

            this.selectedParentCategoryId = activeCategory.id;
            this.selectedCategoryId = activeCategory.id;
            this.selectedParent = activeCategory;
            this.updateHeader(activeCategory.name);
            this.resetAttributeFilters();
            this.loadAttributes(activeCategory.id);
            this.loadProductsOnce(1, true, true);
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
    if (this.isLoadingNextPage || this.selectedCategoryId == null) return;
    this.isLoadingNextPage = true;
    if (reset || page === 1) {
      this.isLoadingProducts = true;
    }

    if (showSpinner) this.spinner.show();
    const params = {
      categoryId: this.selectedCategoryId,
      page,
      pageSize: 25,
      ...this.buildAttributeParams(),
    };

    this.categoryCache
      .getProducts(params)
      .pipe(takeUntil(this.destroyed),
        finalize(() => {
          this.isLoadingNextPage = false;
          if (reset || page === 1) {
            this.isLoadingProducts = false;
          }
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

  private loadAttributes(categoryId: ProductEntityId): void {
    this.isLoadingAttributes = true;
    this.categoryCache
      .getAttributes(categoryId)
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => this.isLoadingAttributes = false)
      )
      .subscribe({
        next: (attributes) => {
          this.attributes = this.normalizeAttributes(attributes);
        },
        error: (err) => {
          this.attributes = [];
          console.error("Lỗi khi load thuộc tính sản phẩm:", err);
        }
      });
  }

  selectCategory(categoryId: ProductEntityId): void {
    this.navService.redirect([uriFeConst.product.category], {
      queryParams: { id: categoryId }
    });
  }

  openSearch(): void {
    this.navService.redirect([uriFeConst.product.search]);
  }

  openQuickBuy(product: IResProductInList): void {
    this.quickBuyProductId = product.id;
  }

  closeQuickBuy(): void {
    this.quickBuyProductId = null;
  }

  openAttributeFilterSheet(attribute: IProductAttribute): void {
    if (!attribute?.column || !attribute.values?.length) return;
    this.activeAttribute = attribute;
    this.draftAttributeValues = this.cloneAttributeSelections(this.selectedAttributeValues);
    this.showAttributeFilterSheet = true;
  }

  closeAttributeFilterSheet(): void {
    this.showAttributeFilterSheet = false;
    this.activeAttribute = null;
  }

  toggleDraftAttributeValue(attribute: IProductAttribute, value: IProductAttributeValue): void {
    if (!attribute.column) return;
    const current = this.draftAttributeValues[attribute.column] ?? [];
    const nextFilters = {...this.draftAttributeValues};
    const isSelected = current.some(item => String(item.id) === String(value.id));

    if (isSelected) {
      const nextValues = current.filter(item => String(item.id) !== String(value.id));
      if (nextValues.length) {
        nextFilters[attribute.column] = nextValues;
      } else {
        delete nextFilters[attribute.column];
      }
    } else {
      nextFilters[attribute.column] = [...current, value];
    }

    this.draftAttributeValues = nextFilters;
  }

  applyAttributeFilters(): void {
    this.selectedAttributeValues = this.cloneAttributeSelections(this.draftAttributeValues);
    this.showAttributeFilterSheet = false;
    this.activeAttribute = null;
    this.reloadProductsWithFilters();
  }

  resetDraftAttributeFilters(): void {
    if (!this.activeAttribute?.column) {
      this.draftAttributeValues = {};
      return;
    }

    const nextFilters = {...this.draftAttributeValues};
    delete nextFilters[this.activeAttribute.column];
    this.draftAttributeValues = nextFilters;
  }

  clearAllAttributeFilters(): void {
    if (!this.hasSelectedAttributes()) return;
    this.selectedAttributeValues = {};
    this.draftAttributeValues = {};
    this.reloadProductsWithFilters();
  }

  clearAttributeFilter(attribute: IProductAttribute, event?: Event): void {
    event?.stopPropagation();
    if (!attribute.column || !this.selectedAttributeValues[attribute.column]?.length) return;

    const nextFilters = {...this.selectedAttributeValues};
    delete nextFilters[attribute.column];
    this.selectedAttributeValues = nextFilters;
    this.reloadProductsWithFilters();
  }

  isAttributeValueSelected(attribute: IProductAttribute, value: IProductAttributeValue): boolean {
    const selected = attribute.column ? this.selectedAttributeValues[attribute.column] : null;
    return !!selected?.some(item => String(item.id) === String(value.id));
  }

  isDraftAttributeValueSelected(attribute: IProductAttribute, value: IProductAttributeValue): boolean {
    const selected = attribute.column ? this.draftAttributeValues[attribute.column] : null;
    return !!selected?.some(item => String(item.id) === String(value.id));
  }

  hasSelectedAttribute(attribute: IProductAttribute): boolean {
    return !!attribute.column && !!this.selectedAttributeValues[attribute.column]?.length;
  }

  getAttributeFilterLabel(attribute: IProductAttribute): string {
    const selected = attribute.column ? this.selectedAttributeValues[attribute.column] ?? [] : [];
    if (!selected.length) return attribute.name;

    const names = selected.map(value => value.name).filter(Boolean);
    const visibleNames = names.slice(0, 2).join(', ');
    return `${attribute.name}: ${visibleNames}${names.length > 2 ? ',...' : ''}`;
  }

  hasSelectedAttributes(): boolean {
    return Object.values(this.selectedAttributeValues).some(values => values.length > 0);
  }

  get activeDraftAttributeCount(): number {
    return this.activeAttribute?.column
      ? this.draftAttributeValues[this.activeAttribute.column]?.length ?? 0
      : 0;
  }

  private updateHeader(title = 'Danh mục sản phẩm'): void {
    this.setHeader({
      variant: "title",
      show: true,
      back: !!this.selectedCategoryId,
      title,
      className: "header-color",
    });
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

  private reloadProductsWithFilters(): void {
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalItems = 0;
    this.hasMoreProducts = false;
    this.products = [];
    this.loadProductsOnce(1, true, true);
  }

  private resetAttributeFilters(): void {
    this.attributes = [];
    this.selectedAttributeValues = {};
    this.draftAttributeValues = {};
    this.showAttributeFilterSheet = false;
    this.activeAttribute = null;
  }

  private buildAttributeParams(): { attrColumnValues?: Record<string, string[]> } {
    const attrColumnValues = Object.fromEntries(
      Object.entries(this.selectedAttributeValues)
        .map(([column, values]) => [
          column,
          values
            .map(value => value.id)
            .filter(id => id !== null && id !== undefined)
            .map(id => String(id)),
        ])
        .filter(([column, values]) => !!column && Array.isArray(values) && values.length > 0)
    ) as Record<string, string[]>;

    return Object.keys(attrColumnValues).length ? {attrColumnValues} : {};
  }

  private normalizeAttributes(attributes: IProductAttribute[]): IProductAttribute[] {
    return (attributes ?? [])
      .filter(attribute => !!attribute?.column && Array.isArray(attribute.values) && attribute.values.length > 0)
      .map(attribute => ({
        ...attribute,
        values: [...attribute.values].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      }));
  }

  private cloneAttributeSelections(
    selections: Record<string, IProductAttributeValue[]>
  ): Record<string, IProductAttributeValue[]> {
    return Object.fromEntries(
      Object.entries(selections).map(([column, values]) => [column, [...values]])
    );
  }

  protected readonly uriFeConst = uriFeConst;
}
