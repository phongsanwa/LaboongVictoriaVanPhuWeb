import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit, signal } from "@angular/core";
import { IResProductInList, ProductFeature } from '@shared/models/api';
import { Subject, takeUntil } from 'rxjs';
import { HomeManageService } from '@shared/services/global/home/home-cache.service';
import { uriFeConst } from '@shared/constants';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['product-list.component.scss'],
  standalone: false
})
export class ProductListComponent implements OnInit, OnDestroy {
  @Input() title = 'Sản phẩm';
  @Input() features: ProductFeature[] = [];
  @Input() pageSize = 4;

  products: IResProductInList[] = [];
  quickBuyProductId: number | null = null;
  isLoading = signal(true);
  readonly skeletonItems = [1, 2, 3];

  private destroy$ = new Subject<void>();

  constructor(
    private homeManageService: HomeManageService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.homeManageService.getProductsOnce({ pageSize: this.pageSize, features: this.features })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.products = list.result ?? [];
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
        error: () => {
          this.isLoading.set(false);
          this.cd.markForCheck();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get displayProducts(): IResProductInList[] {
    return (this.products ?? []).slice(0, 8);
  }

  openQuickBuy(product: IResProductInList): void {
    this.quickBuyProductId = product.id;
  }

  closeQuickBuy(): void {
    this.quickBuyProductId = null;
  }

  protected readonly uriFeConst = uriFeConst;
}
