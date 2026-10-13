import {ChangeDetectorRef, Component, Input, OnDestroy, OnInit, signal} from "@angular/core";
import {IResProductInList, ProductFeature} from '@shared/models/api';
import {Subject, takeUntil} from 'rxjs';
import {HomeManageService} from '@shared/services/global/home/home-cache.service';
import {uriFeConst} from '@shared/constants';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: [`product-list.component.scss`],
  standalone: false
})

export class ProductListComponent implements OnInit, OnDestroy {
  @Input() title = 'Sản phẩm';
  @Input() features: ProductFeature[] = [];
  @Input() pageSize = 10;

  products: IResProductInList[] = [];
  isLoading = signal(true);
  private destroy$ = new Subject<void>();

  constructor(
    private homeManageService: HomeManageService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const params = {
      pageSize: this.pageSize,
      loadAttr: true,
      features: this.features,
    }
    this.homeManageService.getProductsOnce(params)
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

  protected readonly uriFeConst = uriFeConst;
}
