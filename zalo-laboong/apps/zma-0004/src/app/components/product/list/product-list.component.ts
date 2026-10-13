import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {uriFeConst} from '@shared/constants';
import {IResProduct} from '@shared/models/api';
import {HomeManageService} from '@shared/services/global/home/home-cache.service';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  standalone: false,
})
export class ProductListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  products: IResProduct[] = [];
  isLoading = false;
  errorMessage = "";
  currentPage = 1;
  totalPages = 1;


  constructor(
    private homeManageService: HomeManageService,
    private cd: ChangeDetectorRef,
  ) {
  }

  ngOnInit() {
    const cached = this.homeManageService.productsCache;

    if (cached.length > 0) {
      this.products = cached;
      this.currentPage = this.homeManageService.currentPageCache;
      this.totalPages = this.homeManageService.totalPagesCache || 1;
      this.cd.markForCheck();

      setTimeout(() => {
        const container = document.querySelector('.scroll-container');
        if (container) container.scrollTop = this.homeManageService.scrollPositionCache || 0;
      }, 100);
    } else {
      this.searchProducts();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  searchProducts(): void {
    this.isLoading = true;
    this.errorMessage = "";

    this.homeManageService
      .getProductsOncePaginator({page: this.currentPage, icpp: 10,loadAttr: true})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.isLoading = false;
          if (res) {
            const newProducts = res.result || [];
            this.totalPages = res.totalPages || 1;
            if (this.currentPage === 1) {
              this.products = newProducts;
            } else {
              this.products = [...this.products, ...newProducts];
            }
          }
          this.cd.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = "Không thể tải sản phẩm. Vui lòng thử lại sau.";
        },
      });
  }

  onContainerScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
    if (atBottom && !this.isLoading && this.currentPage < this.totalPages) {
      this.currentPage++;
      this.searchProducts();
    }
  }


  protected readonly uriFeConst = uriFeConst;
}
