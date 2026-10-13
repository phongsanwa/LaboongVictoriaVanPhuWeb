import {Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {CommonModule} from '@angular/common';
import {finalize} from 'rxjs';
import {ProductRepoService} from '@shared/services/repository';
import {ProductManageService} from '@shared/services/global';
import {IProductAvailableColor, IResProductChild, IResProductDetail} from '@shared/models/api';
import {normalizeProductImages, productDisplayPrice, productImageThumbPath, productOriginalPrice} from '@shared/utils';
import {NotifyService} from '@core/services';
import {AppShopSettingsService} from '@core/services/app-shop-settings.service';

@Component({
  selector: 'app-zma-product-quick-buy',
  standalone: true,
  imports: [CommonModule],
  providers: [ProductManageService],
  template: `
    @if (productId) {
      <div class="quick-buy-overlay" (click)="close()"></div>
      <section class="quick-buy-sheet d-flex flex-column gap-3 w-100" aria-label="Mua nhanh sản phẩm">
        @if (isLoading) {
          <div class="quick-buy-loading d-flex flex-column align-items-center justify-content-center">
            <span class="quick-buy-loading__spinner"></span>
            <span>Đang tải sản phẩm...</span>
          </div>
        } @else if (product) {
          <div class="sheet-summary d-flex w-100">
            <img [src]="sheetImage" [alt]="product.name">
            <div class="sheet-info">
              <h2>{{ product.name }}</h2>
              <div class="sheet-price align-items-baseline d-flex flex-wrap">
                <span>{{ formatPrice(sheetPrice) }}</span>
                @if (sheetOriginalPrice && sheetOriginalPrice > sheetPrice) {
                  <del>{{ formatPrice(sheetOriginalPrice) }}</del>
                }
              </div>
              <p>Kho: {{ sheetInventoryRemain }}</p>
            </div>
            <button type="button" class="sheet-close p-0" (click)="close()" aria-label="Đóng">
              <i class="ph-light ph-x"></i>
            </button>
          </div>

          <div class="divider w-100"></div>

          @if (availableColors.length) {
            <div class="sheet-option d-flex flex-column gap-2">
              <h3>Chọn màu sắc</h3>
              <div class="sheet-color-list d-flex flex-wrap">
                @for (color of availableColors; track color.name) {
                  <button type="button"
                          class="sheet-color-option"
                          [class.active]="prdService.objPro.color === color.name"
                          [class.disabled]="checkDisableColor(color.name)"
                          [disabled]="checkDisableColor(color.name)"
                          [style.background-color]="prdService.objPro.color === color.name ? null : colorStyle(color)"
                          [attr.aria-label]="color.name"
                          [attr.title]="color.name"
                          (click)="selectColor(color)">
                    <span [style.background-color]="colorStyle(color)"></span>
                  </button>
                }
              </div>
            </div>
          }

          @if (availableSizes.length) {
            <div class="sheet-option d-flex flex-column gap-2">
              <h3>Chọn kích thước</h3>
              <div class="sheet-size-list d-flex flex-wrap">
                @for (size of availableSizes; track size) {
                  <button type="button"
                          [class.active]="prdService.objPro.size === size"
                          [class.disabled]="checkDisableSize(size)"
                          [disabled]="checkDisableSize(size)"
                          (click)="selectSize(size)">
                    {{ size }}
                  </button>
                }
              </div>
            </div>
          }

          <div class="quantity-row align-items-center d-flex justify-content-between">
            <span>Số lượng</span>
            <div class="quantity-control d-flex">
              <button type="button" (click)="decreaseQuantity()">-</button>
              <span>{{ prdService.objPro.quantity }}</span>
              <button type="button"
                      [disabled]="prdService.objPro.quantity >= maxQuantity"
                      [class.disabled]="prdService.objPro.quantity >= maxQuantity"
                      (click)="increaseQuantity()">+
              </button>
            </div>
          </div>

          @if (prdService.isRequiredAttr || prdService.isRequiredChild) {
            <div class="sheet-error">{{ prdService.isRequiredAttr || prdService.isRequiredChild }}</div>
          }

          @if (isSoldOutForAction) {
            <button type="button" class="confirm-btn sold-out" (click)="showSoldOutToast()">Hết hàng</button>
          } @else {
            <div class="sheet-actions d-flex w-100">
              <button type="button" class="confirm-btn add-cart" (click)="confirmPurchase('cart')">
                Thêm vào giỏ
              </button>
              <button type="button" class="confirm-btn buy-now" (click)="confirmPurchase('buy')">
                Mua ngay
              </button>
            </div>
          }
        }
      </section>
    }
  `,
  styleUrls: ['./product-quick-buy.component.scss']
})
export class ZmaProductQuickBuyComponent implements OnChanges {
  @Input() productId: number | null = null;
  @Output() closed = new EventEmitter<void>();

  product!: IResProductDetail;
  productImages: string[] = [];
  isLoading = false;

  private shopSettings = inject(AppShopSettingsService);

  constructor(
    public prdService: ProductManageService,
    private productRepo: ProductRepoService,
    private notifyService: NotifyService,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && this.productId) {
      this.loadProduct(this.productId);
    }
  }

  get currentImage(): string {
    return this.productImages[0] || 'assets/img/no-image.png';
  }

  get sheetImage(): string {
    return this.prdService.objPro?.image || this.currentImage;
  }

  get sheetPrice(): number {
    return this.prdService.objPro?.price || (this.product ? productDisplayPrice(this.product) : 0);
  }

  get sheetOriginalPrice(): number {
    return this.prdService.objPro?.oldPrice || (this.product ? productOriginalPrice(this.product) : 0);
  }

  get sheetInventoryRemain(): number {
    return this.prdService.selectedVariant?.inventoryRemain ??
      this.findVariantBySelection()?.inventoryRemain ??
      this.product?.inventoryRemain ??
      0;
  }

  get maxQuantity(): number {
    // Settings chưa có sẽ default cho mua, nên không giới hạn số lượng theo tồn kho.
    if (this.shopSettings.allowBuyWhenSoldOut) return Number.MAX_SAFE_INTEGER;
    const inventoryRemain = Number(this.sheetInventoryRemain || 0);
    return inventoryRemain > 0 ? inventoryRemain : 1;
  }

  get availableSizes(): string[] {
    return this.prdService.availableSizes?.length
      ? this.prdService.availableSizes
      : (this.product?.availableSizes?.length ? this.product.availableSizes : this.uniqueVariantValues('size'));
  }

  get availableColors(): IProductAvailableColor[] {
    if (this.product?.availableColors?.length) {
      return this.normalizeColorOptions(this.product.availableColors);
    }
    return this.uniqueVariantValues('color').map(name => ({
      name,
      code: this.findColorCodeByName(name),
    }));
  }

  get isSoldOutForAction(): boolean {
    // Settings chưa có sẽ default cho mua, nên không hiện nút hết hàng cho tới khi API cấu hình chặn tồn.
    if (this.shopSettings.allowBuyWhenSoldOut) return false;

    // Chỉ kiểm tra tồn kho khi setting chặn mua hàng hết tồn
    if (!this.product) return false;

    const hasOptions = this.availableColors.length > 0 || this.availableSizes.length > 0;
    if (!hasOptions) {
      const product = this.product.childs?.[0] ?? this.product;
      return !this.hasInventory(product.inventoryRemain);
    }

    const variant = this.findExactVariantBySelection();
    if (variant) return !this.hasInventory(variant.inventoryRemain);

    return !this.hasAnyAvailableVariant();
  }

  close(): void {
    this.productId = null;
    this.product = undefined as unknown as IResProductDetail;
    this.closed.emit();
  }

  selectColor(color: IProductAvailableColor | string): void {
    const colorName = this.colorName(color);
    if (this.checkDisableColor(colorName)) return;
    this.prdService.onColorChange(colorName);
    this.clampQuantityToInventory();
  }

  selectSize(size: string): void {
    if (this.checkDisableSize(size)) return;
    this.prdService.onSizeChange(size);
    this.clampQuantityToInventory();
  }

  checkDisableSize(size: string): boolean {
    const color = this.prdService.objPro?.color;
    const childs = this.product?.childs ?? [];
    if (!childs.length) return false;

    // Khi settings chưa có hoặc cho phép mua hết tồn, chỉ disable size không có variant; không disable vì tồn kho.
    const allowSoldOut = this.shopSettings.allowBuyWhenSoldOut;

    return !childs.some(child =>
      this.sameVariantValue(child.size, size) &&
      (allowSoldOut || this.hasInventory(child.inventoryRemain)) &&
      (!color || this.sameVariantValue(child.color, color))
    );
  }

  checkDisableColor(color: string): boolean {
    const size = this.prdService.objPro?.size;
    const childs = this.product?.childs ?? [];
    if (!childs.length) return false;

    // Khi settings chưa có hoặc cho phép mua hết tồn, chỉ disable màu không có variant; không disable vì tồn kho.
    const allowSoldOut = this.shopSettings.allowBuyWhenSoldOut;

    return !childs.some(child =>
      this.sameVariantValue(child.color, color) &&
      (allowSoldOut || this.hasInventory(child.inventoryRemain)) &&
      (!size || this.sameVariantValue(child.size, size))
    );
  }

  increaseQuantity(): void {
    this.prdService.objPro.quantity = Math.min(
      this.maxQuantity,
      this.prdService.objPro.quantity + 1
    );
  }

  decreaseQuantity(): void {
    this.prdService.objPro.quantity = Math.max(1, this.prdService.objPro.quantity - 1);
  }

  confirmPurchase(mode: 'cart' | 'buy'): void {
    this.prdService.getProductIdBySizeAndColor();
    const err = this.prdService.validateSelection(this.product);
    if (err) {
      this.prdService.isRequiredAttr = err;
      return;
    }
    if (this.isSoldOutForAction) {
      this.showSoldOutToast();
      return;
    }

    this.prdService.addToCart(mode === 'buy');
    if (mode === 'cart') {
      this.notifyService.success('Thêm sản phẩm thành công!');
    }
    this.close();
  }

  showSoldOutToast(): void {
    this.notifyService.warning('Sản phẩm hiện đã hết hàng');
  }

  formatPrice(value: number): string {
    return `${Number(value || 0).toLocaleString('vi-VN')} VND`;
  }

  colorName(color: IProductAvailableColor | string): string {
    return typeof color === 'string' ? color : color.name;
  }

  colorStyle(color: IProductAvailableColor | string): string {
    const code = typeof color === 'string'
      ? this.findColorCodeByName(color)
      : color.code || this.findColorCodeByName(color.name);
    return this.normalizeColorCode(code) || '#e5e7eb';
  }

  private loadProduct(id: number): void {
    this.isLoading = true;
    this.product = undefined as unknown as IResProductDetail;
    this.productImages = [];
    this.prdService.createAllState();
    this.productRepo.getDetailOnce(id)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (detail) => {
          this.product = detail;
          const srcList = normalizeProductImages(detail.images, detail.imageThumb?.path || '');
          this.productImages = srcList.length ? srcList : [productImageThumbPath(detail.imageThumb) || 'assets/img/no-image.png'];
          this.prdService.set(detail);
          this.prdService.initForAddToCart(detail);
        },
        error: () => {
          this.notifyService.error('Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.');
          this.close();
        }
      });
  }

  private uniqueVariantValues(key: 'color' | 'size'): string[] {
    const values = (this.product?.childs ?? [])
      .map(child => child[key])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map(value => value.trim());
    return [...new Set(values)];
  }

  private sameVariantValue(a?: string | null, b?: string | null): boolean {
    return (a ?? '').trim() === (b ?? '').trim();
  }

  private normalizeColorOptions(colors: IResProductDetail['availableColors']): IProductAvailableColor[] {
    const options = colors
      .map(color => {
        const name = typeof color === 'string' ? color.trim() : (color.name ?? '').trim();
        if (!name) return null;
        const code = typeof color === 'string'
          ? this.findColorCodeByName(name)
          : (color.code ?? '').trim() || this.findColorCodeByName(name);
        return {name, code};
      })
      .filter((color): color is IProductAvailableColor => !!color);

    return this.uniqueColorsByName(options);
  }

  private findColorCodeByName(name: string): string {
    const color = (this.product?.childs ?? []).find(child => this.sameVariantValue(child.color, name));
    return color?.colorCode?.trim() || '';
  }

  private uniqueColorsByName(colors: IProductAvailableColor[]): IProductAvailableColor[] {
    const result: IProductAvailableColor[] = [];
    const seen = new Set<string>();
    for (const color of colors) {
      const key = color.name.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(color);
    }
    return result;
  }

  private normalizeColorCode(value: string): string {
    const color = (value || '').trim();
    if (!color) return '';
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) ||
      /^rgba?\(/i.test(color) ||
      /^hsla?\(/i.test(color)) {
      return color;
    }
    if (/^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) {
      return `#${color}`;
    }
    return '';
  }

  private hasInventory(value: number | null | undefined): boolean {
    return Number(value ?? 0) > 0;
  }

  private hasAnyAvailableVariant(): boolean {
    return (this.product?.childs ?? []).some(child => this.hasInventory(child.inventoryRemain));
  }

  private findVariantBySelection(): IResProductChild | undefined {
    const childs = this.product?.childs ?? [];
    if (!childs.length) return undefined;

    const selectedId = this.prdService.objPro?.id;
    if (selectedId) {
      const variantById = childs.find(child => child.id === selectedId);
      if (variantById) return variantById;
    }

    const color = this.prdService.objPro?.color;
    const size = this.prdService.objPro?.size;
    if (color && size) {
      return childs.find(child =>
        this.sameVariantValue(child.color, color) &&
        this.sameVariantValue(child.size, size)
      );
    }

    if (color) return childs.find(child => this.sameVariantValue(child.color, color));
    if (size) return childs.find(child => this.sameVariantValue(child.size, size));

    return undefined;
  }

  private findExactVariantBySelection(): IResProductChild | undefined {
    const childs = this.product?.childs ?? [];
    if (!childs.length) return undefined;

    const color = this.prdService.objPro?.color;
    const size = this.prdService.objPro?.size;
    const hasColors = this.availableColors.length > 0;
    const hasSizes = this.availableSizes.length > 0;

    if (hasColors && !color) return undefined;
    if (hasSizes && !size) return undefined;

    return childs.find(child =>
      (!hasColors || this.sameVariantValue(child.color, color)) &&
      (!hasSizes || this.sameVariantValue(child.size, size))
    );
  }

  private clampQuantityToInventory(): void {
    this.prdService.objPro.quantity = Math.min(
      Math.max(1, this.prdService.objPro.quantity),
      this.maxQuantity
    );
  }
}
