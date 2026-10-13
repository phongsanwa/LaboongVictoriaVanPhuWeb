import {
  Component,
  OnInit,
  OnDestroy, inject,
} from "@angular/core";
import {EMPTY, finalize, map, startWith, Subject, take, takeUntil} from "rxjs";
import { AppCommonComponent } from "@shared/components/app-common.service";
import {uriFeConst} from "@shared/constants";
import { CategoryCacheService } from "@shared/services/global/product/category-cache.service";
import {IResLoadCategory, IResProduct, ProductEntityId} from '@shared/models/api';
import {distinctUntilChanged, switchMap, tap} from 'rxjs/operators';
import { HeaderFooterFacadeService } from '@shared/services/global/layout-service/header-footer-facade.service';

@Component({
  selector: "app-product-category",
  templateUrl: "./product-category.component.html",
  styleUrls: ["./product-category.component.scss"],
  standalone: false,
})
export class ProductCategoryComponent
  extends AppCommonComponent
  implements OnInit, OnDestroy
{
  category: IResLoadCategory[] = [];

  products: IResProduct[] = [];

  currentPage = 1;
  totalPages = 1;

  selectedParentCategoryId!: ProductEntityId;
  selectedCategoryId!: ProductEntityId;
  selectedParent: IResLoadCategory | null = null;

  private destroy$ = new Subject<void>();
  private readonly facade = inject(HeaderFooterFacadeService);
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
      show: false,
    });

    this.loadCategoriesOnce();
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
            this.products = [];
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

  private loadProductsOnce(
    page: number,
    reset = false,
    showSpinner = false
  ): void {
    if (showSpinner) this.spinner.show();
    const params = {
      categoryId: this.selectedCategoryId,
      page,
      icpp: 25,
      loadAttr: false,
    }

    this.categoryCache
      .getProducts(params)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (showSpinner) this.spinner.hide();
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

  selectCategory(categoryId: ProductEntityId): void {
    this.selectedParentCategoryId = categoryId;
    this.selectedCategoryId = categoryId;
    this.selectedParent = this.category.find((c) => String(c.id) === String(categoryId))!;
    this.currentPage = 1;
    this.products = [];
    this.loadProductsOnce(1, true, true);
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollTop + element.clientHeight;
    const maxScroll = element.scrollHeight;

    if (
      scrollPosition >= maxScroll - 100 &&
      this.currentPage < this.totalPages
    ) {
      this.currentPage++;
      this.loadProductsOnce(this.currentPage, false, false);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected readonly uriFeConst = uriFeConst;
}
