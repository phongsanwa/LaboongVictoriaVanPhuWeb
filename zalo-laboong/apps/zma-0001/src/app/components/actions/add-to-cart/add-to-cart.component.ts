import {Component, computed, Input, OnInit, signal} from '@angular/core';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {IProductAvailableColor, IResProductChild, IResProductDetail} from '@shared/models/api';
import {ProductManageService} from '@shared/services/global';
import {NotifyService} from '@core/services';
import {IPSelectOption} from '../../../pages/products/features/detail/product-detail.component';
import {AppShopSettingsService} from '@core/services/app-shop-settings.service';

@Component({
  selector: 'app-add-to-cart',
  templateUrl: 'add-to-cart.component.html',
  styleUrls: ['add-to-cart.component.scss'],
  standalone: false
})

export class AddToCartComponent implements OnInit {
  @Input() prdService!: ProductManageService;
  @Input() type!: string
  product!: IResProductDetail;
  private readonly productSignal = signal<IResProductDetail | null>(null);
  private readonly selectedColorSignal = signal('');
  private readonly selectedSizeSignal = signal('');
  readonly disabledSizeSet = computed(() => {
    const product = this.productSignal();
    const childs = product?.childs ?? [];
    const color = this.selectedColorSignal();
    const disabled = new Set<string>();
    if (!childs.length) return disabled;
    const allowSoldOut = this.shopSettings.allowBuyWhenSoldOut;

    for (const size of this.prdService.availableSizes ?? []) {
      // Settings chưa có hoặc cho phép mua hết tồn: chỉ disable size không có variant, không disable vì tồn kho.
      const hasAvailableVariant = childs.some((child: IResProductChild) =>
        this.sameVariantValue(child.size, size) &&
        (allowSoldOut || this.hasInventory(child.inventoryRemain)) &&
        (!color || this.sameVariantValue(child.color, color))
      );
      if (!hasAvailableVariant) disabled.add(size);
    }
    return disabled;
  });
  readonly disabledColorSet = computed(() => {
    const product = this.productSignal();
    const childs = product?.childs ?? [];
    const size = this.selectedSizeSignal();
    const disabled = new Set<string>();
    if (!childs.length) return disabled;
    const allowSoldOut = this.shopSettings.allowBuyWhenSoldOut;

    for (const color of product?.availableColors ?? []) {
      const colorName = this.colorName(color);
      // Settings chưa có hoặc cho phép mua hết tồn: chỉ disable màu không có variant, không disable vì tồn kho.
      const hasAvailableVariant = childs.some((child: IResProductChild) =>
        this.sameVariantValue(child.color, colorName) &&
        (allowSoldOut || this.hasInventory(child.inventoryRemain)) &&
        (!size || this.sameVariantValue(child.size, size))
      );
      if (!hasAvailableVariant) disabled.add(colorName);
    }
    return disabled;
  });
  selectChilds: IPSelectOption[] = [];

  constructor(
    public active: NgbActiveOffcanvas,
    private notify: NotifyService,
    private shopSettings: AppShopSettingsService
  ) {
  }

  ngOnInit() {
    this.product = this.prdService.value as IResProductDetail;
    if (!this.product) return;

    this.prdService.initForAddToCart(this.product);
    this.productSignal.set(this.product);
    this.syncSelectionSignals();
  }

  checkDisableSize(size: string): string {
    return this.disabledSizeSet().has(size) ? 'disabled' : '';
  }

  checkDisableColor(color: string): string {
    return this.disabledColorSet().has(color) ? 'disabled' : '';
  }

  selectColor(color: string): void {
    if (this.checkDisableColor(color)) return;
    this.prdService.onColorChange(color);
    this.syncSelectionSignals();
  }

  selectSize(size: string): void {
    if (this.checkDisableSize(size)) return;
    this.prdService.onSizeChange(size);
    this.syncSelectionSignals();
  }

  colorName(color: IProductAvailableColor | string): string {
    return typeof color === 'string' ? color : color.name;
  }

  private sameVariantValue(a?: string | null, b?: string | null): boolean {
    return (a ?? '').trim() === (b ?? '').trim();
  }

  private hasInventory(value: number | null | undefined): boolean {
    return Number(value ?? 0) > 0;
  }

  private syncSelectionSignals(): void {
    this.selectedColorSignal.set(this.prdService.objPro?.color ?? '');
    this.selectedSizeSignal.set(this.prdService.objPro?.size ?? '');
  }

  onChangeChild(childId: number) {
    this.prdService.objPro.id = childId;
    this.prdService.objPro.parentId = this.product.id;
  }

  confirmOrder() {
    this.prdService.getProductIdBySizeAndColor();

    const err = this.prdService.validateSelection(this.product);
    if (err) {
      this.prdService.isRequiredAttr = err;
      return;
    }

    this.prdService.addToCart(this.type === 'buyNow');

    this.active.close();
    this.notify.success('Thêm sản phẩm thành công!')
  }
}
