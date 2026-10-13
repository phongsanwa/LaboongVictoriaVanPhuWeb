import { Component, OnDestroy, OnInit} from '@angular/core';
import {uriFeConst} from "@shared/constants";
import {AppCommonComponent} from '@shared/components/app-common.service';
import {IResProduct} from '@shared/models/api';
import {CategoryCacheService} from '@shared/services/global/product/category-cache.service';
import {finalize, takeUntil} from 'rxjs';


@Component({
  selector: 'app-product-category',
  templateUrl: './product-category.component.html',
  styleUrls: [`./product-category.component.scss`],
  standalone: false
})

export class ProductCategoryComponent extends AppCommonComponent implements OnInit, OnDestroy {

  products: IResProduct[] = [];
  totalPages = 1;
  currentPage = 1;
  categoryId!: string;

  isLoading = false;
  private isLoadingNextPage = false;
  constructor(
    private categoryCache: CategoryCacheService,
  ) {
    super();
    this.categoryId = String(this.navService.getParam('id') ?? '');
  }

  ngOnInit() {

    this.setHeader({
      variant: "title",
      show: true,
      back: true,
      title: "Danh mục sản phẩm",
      className: "",
    });

    this.setFooter({
      variant: "tabs",
      show: false,
    });
    this.isLoading = true;
    if(this.categoryId) {
      this.loadProductsOnce(1);
    }
  }

  ngOnDestroy(): void {
    this.getDestroySubs();
  }

  private loadProductsOnce(
    page: number,
    reset = false,
    showSpinner = false
  ): void {
    if (this.isLoadingNextPage) return; //Chặn load trùng
    this.isLoadingNextPage = true;

    if (showSpinner) this.spinner.show();
    const params = {
      categoryId: this.categoryId,
      page,
      icpp: 25,
      loadAttr: true,
    }

    this.categoryCache
      .getProducts(params)
      .pipe(takeUntil(this.destroyed),
        finalize(() => {
          this.isLoading = false;
          this.isLoadingNextPage = false;
          if (showSpinner) this.spinner.hide();
        })
      )
      .subscribe({
        next: (data) => {
          const {result, totalPages} = data;
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

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollTop + element.clientHeight;
    const maxScroll = element.scrollHeight;
    if (scrollPosition >= maxScroll - 100 && !this.isLoadingNextPage && this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadProductsOnce(this.currentPage, false, false);
    }
  }



  protected readonly uriFeConst = uriFeConst;
}
