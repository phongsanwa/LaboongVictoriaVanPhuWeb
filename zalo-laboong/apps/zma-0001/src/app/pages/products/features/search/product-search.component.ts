import {Component, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {IResProductInList} from "@shared/models/api";
import {AppCommonComponent} from '@shared/components/app-common.service';
import {uriFeConst} from "@shared/constants";
import {ProductApiService} from '@shared/services/api';
import {productTotalPages} from '@shared/utils';

@Component({
  selector: "app-product-search",
  templateUrl: "./product-search.component.html",
  styleUrls: ["./product-search.component.scss"],
  standalone: false
})
export class ProductSearchComponent extends AppCommonComponent implements OnInit {
  products: IResProductInList[] = [];
  keyword = "";
  isLoading = false;
  errorMessage = "";

  currentPage = 1;
  totalPages = 1;
  pageSize = 20;

  constructor(
    private route: ActivatedRoute,
    private productApi: ProductApiService) {
    super();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.keyword = (params["q"] || "").trim();
      if (this.keyword) {
        this.currentPage = 1;
        this.products = [];
        this.searchProducts(true);
      }
    });
  }

  searchProducts(reset = false): void {
    this.isLoading = true;
    this.errorMessage = "";

    this.productApi
      .search({
        name: this.keyword,
        page: this.currentPage,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.code === 1 && res.data) {
            const newProducts = res.data.result || [];
            this.totalPages = productTotalPages(res.data);
            this.products = reset ? newProducts : [...this.products, ...newProducts];
          } else {
            if (reset) this.products = [];
          }
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = "Không thể tải sản phẩm. Vui lòng thử lại sau.";
        },
      });
  }

  loadMore(): void {
    if (this.currentPage < this.totalPages && !this.isLoading) {
      this.currentPage++;
      this.searchProducts();
    }
  }

	 protected readonly uriFeConst = uriFeConst;
}
