import {ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {Router} from '@angular/router';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {IResProductInList} from '@shared/models/api';
import {uriFeConst} from '@shared/constants';
import {VoucherItem} from '../voucher.model';
import {ProductApiService} from '@shared/services/api';
import {finalize, Subject, takeUntil} from 'rxjs';

@Component({
  selector: 'app-voucher-condition',
  standalone: false,
  templateUrl: './voucher-condition.component.html',
  styleUrls: ['./voucher-condition.component.scss'],
})
export class VoucherConditionComponent extends AppCommonComponent implements OnInit, OnDestroy {
  @Input({required: true}) voucher!: VoucherItem;
  @Output() closed = new EventEmitter<void>();

  selectedVoucher: VoucherItem | null = null;
  products: IResProductInList[] = [];
  isLoading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private productApi: ProductApiService,
    private cd: ChangeDetectorRef,
  ) {
    super();
  }

  ngOnInit(): void {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Tìm kiếm',
      className: 'header-color',
      backHandler: () => this.closed.emit(),
    });
    this.setFooter({variant: 'tabs', show: false});
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openDetail(item: VoucherItem): void {
    this.selectedVoucher = item;
  }

  closeDetail(): void {
    this.selectedVoucher = null;
  }

  goToProductDetail(productId: number): void {
    this.router.navigate([uriFeConst.product.detail], {queryParams: {id: productId}});
  }

  formatPrice(value: number): string {
    return `${Number(value || 0).toLocaleString('vi-VN')} VND`;
  }

  productImage(product: IResProductInList): string {
    return product.image || product.imageThumb?.path || 'assets/img/no-image.png';
  }

  private loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.productApi.searchProductPaginator({page: 1, pageSize: 4})
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cd.markForCheck();
        }),
      )
      .subscribe({
        next: res => {
          this.products = res.code === 1 ? (res.data?.result ?? []).slice(0, 4) : [];
          if (!this.products.length) this.errorMessage = 'Chưa có sản phẩm có thể áp dụng.';
          this.cd.markForCheck();
        },
        error: () => {
          this.products = [];
          this.errorMessage = 'Không tải được danh sách sản phẩm.';
          this.cd.markForCheck();
        },
      });
  }
}
