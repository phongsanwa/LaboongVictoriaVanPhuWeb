import {Component, computed, OnInit, signal} from "@angular/core";
import {
  IProductAvailableColor,
  IResProductChild,
  IResProductDetail,
  IResProductInList,
  ISearchProductParams
} from 'common/shared/models/api';
import {finalize, takeUntil} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {ProductManageService} from 'common/shared/services/global';
import {AppCommonComponent} from 'common/shared/components/app-common.service';
import {SlideConfig, SlideItem} from 'common/shared/components/actions';
import {ProductRepoService} from '@shared/services/repository';
import {ProductApiService} from '@shared/services/api';
import {uriFeConst} from '@shared/constants';
import {
  normalizeProductImages,
  productDisplayPrice,
  productImageThumbPath,
  productOriginalPrice
} from '@shared/utils';
import {openChat, openShareSheet} from 'zmp-sdk/apis';
import {environment} from '../../../../../environments';
import {AppShopSettingsService} from '@core/services/app-shop-settings.service';

interface ProductReviewItem {
  name: string;
  initials: string;
  color: string;
  likes: number;
  rating: number;
  variant: string;
  content: string;
  date: string;
  hasImages: boolean;
}

type ReviewFilterKey = 'all' | 'images' | 5 | 4 | 3 | 2 | 1;

type ProductColorOption = IProductAvailableColor;

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  standalone: false
})
export class ProductDetailComponent extends AppCommonComponent implements OnInit {
  idProduct!: number;
  product!: IResProductDetail;

  // Cache product data as a signal so option lists and disabled states recompute only when detail changes.
  private readonly productSignal = signal<IResProductDetail | null>(null);

  // Keep selected attributes in signals because ProductManageService state is mutable and not signal-aware.
  private readonly selectedColorSignal = signal('');
  private readonly selectedSizeSignal = signal('');

  // Derived size list used by both the page and purchase sheet; avoids rebuilding from childs in the template.
  readonly availableSizes = computed(() => {
    const product = this.productSignal();
    if (!product) return [];

    return this.prdManageService.availableSizes?.length
      ? this.prdManageService.availableSizes
      : (product.availableSizes?.length ? product.availableSizes : this.uniqueVariantValues('size', product));
  });

  // Normalize API color objects once per product change and preserve color code for swatch rendering.
  readonly availableColors = computed<ProductColorOption[]>(() => {
    const product = this.productSignal();
    if (!product) return [];

    if (product.availableColors?.length) {
      return this.normalizeColorOptions(product.availableColors, product);
    }
    return this.uniqueVariantValues('color', product).map(name => ({
      name,
      code: this.findColorCodeByName(name, product),
    }));
  });

  // Precompute disabled sizes as a Set so each size button can do O(1) lookup during change detection.
  readonly disabledSizeSet = computed(() => {
    const product = this.productSignal();
    const childs = product?.childs ?? [];
    const color = this.selectedColorSignal();
    const disabled = new Set<string>();
    if (!childs.length) return disabled;
    const allowSoldOut = this.shopSettings.allowBuyWhenSoldOut;

    for (const size of this.availableSizes()) {
      // Khi settings chưa có hoặc cho phép mua hết tồn, chỉ disable size không có variant; không disable vì tồn kho.
      const hasAvailableVariant = childs.some(child =>
        (!color || this.sameVariantValue(child.color, color)) &&
        this.sameVariantValue(child.size, size) &&
        (allowSoldOut || this.hasInventory(child.inventoryRemain))
      );
      if (!hasAvailableVariant) disabled.add(size);
    }
    return disabled;
  });

  // Precompute disabled colors as a Set for the same reason, keyed by color name used in variant matching.
  readonly disabledColorSet = computed(() => {
    const product = this.productSignal();
    const childs = product?.childs ?? [];
    const size = this.selectedSizeSignal();
    const disabled = new Set<string>();
    if (!childs.length) return disabled;
    const allowSoldOut = this.shopSettings.allowBuyWhenSoldOut;

    for (const color of this.availableColors()) {
      // Khi settings chưa có hoặc cho phép mua hết tồn, chỉ disable màu không có variant; không disable vì tồn kho.
      const hasAvailableVariant = childs.some(child =>
        this.sameVariantValue(child.color, color.name) &&
        (!size || this.sameVariantValue(child.size, size)) &&
        (allowSoldOut || this.hasInventory(child.inventoryRemain))
      );
      if (!hasAvailableVariant) disabled.add(color.name);
    }
    return disabled;
  });
  imagesItem: SlideItem[] = [];
  imageSlideConfig: SlideConfig = {
    showNavigation: false,
    showPagination: false,
    autoplay: false,
    slidesPerView: 1,
    spaceBetween: 0,
    loop: false,
    showName: false,
    className: 'detail-slide-item',
  };
  productImages: string[] = [];
  isLoading = false;
  errorMessage = '';
  haveAvailable = false;
  selectedImageIndex = 0;
  showPurchaseSheet = false;
  purchaseMode: 'cart' | 'buy' = 'cart';
  descriptionOpen = true;
  materialOpen = false;
  guideOpen = false;
  otherProducts: IResProductInList[] = [];
  isLoadingOtherProducts = false;
  quickBuyProductId: number | null = null;
  showReviewPage = false;
  selectedReviewFilter: ReviewFilterKey = 'all';
  readonly ratingSummary = {
    score: 4.8,
    total: 120,
    distribution: [
      {label: '5 sao', count: 98},
      {label: '4 sao', count: 16},
      {label: '3 sao', count: 4},
      {label: '2 sao', count: 1},
      {label: '1 sao', count: 1},
    ],
  };
  readonly reviewStars = [1, 2, 3, 4, 5];
  readonly productReviews: ProductReviewItem[] = [
    {
      name: 'Nguyễn Minh Anh',
      initials: 'A',
      color: '#f1d7c5',
      likes: 12,
      rating: 5,
      variant: 'Phân loại: M, Xanh denim',
      content: 'Chất liệu đẹp, form chuẩn, mặc rất thoải mái! Sẽ ủng hộ tiếp shop.',
      date: '20/05/2024',
      hasImages: true,
    },
    {
      name: 'Trần Nhật Minh Ánh',
      initials: 'M',
      color: '#cfe3ff',
      likes: 11,
      rating: 5,
      variant: 'Phân loại: S, Xanh nhạt',
      content: 'Chất liệu đẹp, form chuẩn, mặc rất thoải mái! Sẽ ủng hộ tiếp shop.',
      date: '20/05/2024',
      hasImages: true,
    },
    {
      name: 'Trần Nhật Minh Ánh',
      initials: 'T',
      color: '#d8f0ee',
      likes: 11,
      rating: 5,
      variant: 'Phân loại: M, Xanh denim',
      content: 'Chất liệu đẹp, form chuẩn, mặc rất thoải mái! Sẽ ủng hộ tiếp shop.',
      date: '20/05/2024',
      hasImages: true,
    },
    {
      name: 'Nguyễn Cao Hải Anh',
      initials: 'H',
      color: '#e7ded7',
      likes: 11,
      rating: 5,
      variant: 'Phân loại: M, Xanh denim',
      content: 'Chất liệu đẹp, form chuẩn, mặc rất thoải mái! Sẽ ủng hộ tiếp shop.',
      date: '20/05/2024',
      hasImages: true,
    },
  ];
  readonly reviewFilters: Array<{ key: ReviewFilterKey; label: string }> = [
    {key: 'all', label: 'Tất cả (120)'},
    {key: 'images', label: 'Có hình (45)'},
    {key: 5, label: '5 sao (98)'},
    {key: 4, label: '4 sao (16)'},
    {key: 3, label: '3 sao (4)'},
    {key: 2, label: '2 sao (1)'},
    {key: 1, label: '1 sao (1)'},
  ];
  protected readonly uriFeConst = uriFeConst;

  constructor(
    public prdManageService: ProductManageService,
    private productRepo: ProductRepoService,
    private productApi: ProductApiService,
    private route: ActivatedRoute,
    private shopSettings: AppShopSettingsService,
  ) {
    super();
  }


  ngOnInit(): void {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: '',
    });

    this.setFooter({
      variant: 'tabs',
      show: true,
    });

    // Subscribe queryParam `id` — fire ngay lần đầu và mọi lần đổi product khác
    // (router reuse cùng component khi chỉ đổi query → ngOnInit không re-fire)
    this.route.queryParamMap
      .pipe(takeUntil(this.destroyed))
      .subscribe(map => {
        const newId = Number(map.get('id') ?? '');
        if (!newId || newId === this.idProduct) return;
        this.idProduct = newId;
        this.loadProduct(newId);
      });
  }

  private loadProduct(id: number): void {
    this.resetProductState();

    // Scroll lên đầu khi chuyển product
    window.scrollTo({top: 0, behavior: 'instant' as ScrollBehavior});

    this.prdManageService.createAllState();

    this.isLoading = true;
    this.spinner.show();

    this.productRepo.getDetailOnce(id)
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => {
          this.isLoading = false;
          this.spinner.hide();
        })
      )
      .subscribe({
        next: (detail) => {
          this.product = detail;

          const srcList = normalizeProductImages(detail.images, detail.imageThumb?.path || '');
          this.productImages = srcList.length ? srcList : [productImageThumbPath(detail.imageThumb) || 'assets/img/no-image.png'];
          this.selectedImageIndex = 0;

          this.imagesItem = this.productImages.map(image => ({ image }));
          this.prdManageService.set(detail);
          this.prdManageService.initForAddToCart(detail);
          this.productSignal.set(detail);
          this.syncSelectionSignals();
          this.loadOtherProducts(detail);
          setTimeout(() => {
            this.haveAvailable = true;
          }, 0);
        },
        error: () => {
          this.prdManageService.clear();
          this.errorMessage = 'Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.';
        }
      });
  }

  private resetProductState(): void {
    this.product = undefined as any;
    this.productImages = [];
    this.imagesItem = [];
    this.selectedImageIndex = 0;
    this.haveAvailable = false;
    this.errorMessage = '';
    this.showPurchaseSheet = false;
    this.quickBuyProductId = null;
    this.otherProducts = [];
    this.productSignal.set(null);
    this.selectedColorSignal.set('');
    this.selectedSizeSignal.set('');
  }

  get currentImage(): string {
    return this.productImages[this.selectedImageIndex] || this.productImages[0] || 'assets/img/no-image.png';
  }

  get imageCounterLabel(): string {
    const total = Math.max(this.productImages.length, 1);
    const current = Math.min(this.selectedImageIndex + 1, total);
    return `${current}/${total}`;
  }

  get displayPrice(): number {
    return this.product ? productDisplayPrice(this.product) : 0;
  }

  get originalPrice(): number {
    return this.product ? productOriginalPrice(this.product) : 0;
  }

  get reviewImages(): string[] {
    return this.productImages.slice(0, 2);
  }

  get filteredProductReviews(): ProductReviewItem[] {
    if (this.selectedReviewFilter === 'all') return this.productReviews;
    if (this.selectedReviewFilter === 'images') {
      return this.productReviews.filter(review => review.hasImages);
    }
    return this.productReviews.filter(review => review.rating === this.selectedReviewFilter);
  }

  get showTemplateFallbacks(): boolean {
    return !!environment.showTemplateFallbacks;
  }

  get maxRatingCount(): number {
    return Math.max(...this.ratingSummary.distribution.map(item => item.count), 1);
  }

  get sheetImage(): string {
    return this.prdManageService.objPro?.image || this.currentImage;
  }

  get sheetPrice(): number {
    return this.prdManageService.objPro?.price || this.displayPrice;
  }

  get sheetOriginalPrice(): number {
    return this.prdManageService.objPro?.oldPrice || this.originalPrice;
  }

  get sheetInventoryRemain(): number {
    return this.prdManageService.selectedVariant?.inventoryRemain ??
      this.findVariantBySelection()?.inventoryRemain ??
      this.product?.inventoryRemain ??
      0;
  }

  get maxQuantity(): number {
    // Chỉ giới hạn số lượng theo tồn khi settings đã cấu hình chặn mua hàng hết tồn.
    if (this.shopSettings.allowBuyWhenSoldOut) return Number.MAX_SAFE_INTEGER;
    const inventoryRemain = Number(this.sheetInventoryRemain || 0);
    return inventoryRemain > 0 ? inventoryRemain : 1;
  }

  get isSoldOutForAction(): boolean {
    // Settings chưa có sẽ default cho mua, nên không hiện nút hết hàng cho tới khi API cấu hình chặn tồn.
    if (this.shopSettings.allowBuyWhenSoldOut) return false;
    if (!this.product) return false;

    const hasOptions = this.availableColors().length > 0 || this.availableSizes().length > 0;
    if (!hasOptions) {
      const product = this.product.childs?.[0] ?? this.product;
      return !this.hasInventory(product.inventoryRemain);
    }

    const variant = this.findExactVariantBySelection();
    if (variant) return !this.hasInventory(variant.inventoryRemain);

    return !this.hasAnyAvailableVariant();
  }

  openPurchaseSheet(mode: 'cart' | 'buy'): void {
    if (this.isSoldOutForAction) {
      this.showSoldOutToast();
      return;
    }

    this.purchaseMode = mode;
    this.prdManageService.getProductIdBySizeAndColor();
    const err = this.prdManageService.validateSelection(this.product);
    if (err) {
      this.prdManageService.isRequiredAttr = err;
      this.showPurchaseSheet = true;
      return;
    }

    this.executePurchase();
  }

  closePurchaseSheet(): void {
    this.showPurchaseSheet = false;
  }

  openReviewPage(): void {
    this.showReviewPage = true;
    this.selectedReviewFilter = 'all';
    this.showPurchaseSheet = false;
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Đánh giá sản phẩm',
      className: 'header-color',
      backHandler: () => this.closeReviewPage(),
    });
    this.setFooter({
      variant: 'tabs',
      show: false,
    });
  }

  closeReviewPage(): void {
    this.showReviewPage = false;
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: '',
    });
    this.setFooter({
      variant: 'tabs',
      show: true,
    });
  }

  selectReviewFilter(key: ReviewFilterKey): void {
    this.selectedReviewFilter = key;
  }

  selectImage(index: number): void {
    const lastIndex = Math.max(this.productImages.length - 1, 0);
    const nextIndex = Number.isFinite(index) ? index : 0;
    this.selectedImageIndex = Math.min(Math.max(nextIndex, 0), lastIndex);
  }

  selectColor(color: ProductColorOption | string): void {
    const colorName = this.colorName(color);
    if (this.checkDisableColor(colorName)) return;
    this.prdManageService.onColorChange(colorName);
    this.syncSelectionSignals();
    this.clampQuantityToInventory();
  }

  selectSize(size: string): void {
    if (this.checkDisableSize(size)) return;
    this.prdManageService.onSizeChange(size);
    this.syncSelectionSignals();
    this.clampQuantityToInventory();
  }

  checkDisableSize(size: string): boolean {
    return this.disabledSizeSet().has(size);
  }

  checkDisableColor(color: string): boolean {
    return this.disabledColorSet().has(color);
  }

  increaseQuantity(): void {
    this.prdManageService.objPro.quantity = Math.min(
      this.maxQuantity,
      this.prdManageService.objPro.quantity + 1
    );
  }

  decreaseQuantity(): void {
    this.prdManageService.objPro.quantity = Math.max(1, this.prdManageService.objPro.quantity - 1);
  }

  confirmPurchase(mode: 'cart' | 'buy' = this.purchaseMode): void {
    this.purchaseMode = mode;
    this.prdManageService.getProductIdBySizeAndColor();
    const err = this.prdManageService.validateSelection(this.product);
    if (err) {
      this.prdManageService.isRequiredAttr = err;
      return;
    }
    if (this.isSoldOutForAction) {
      this.showSoldOutToast();
      return;
    }

    this.executePurchase();
  }

  private executePurchase(): void {
    this.prdManageService.addToCart(this.purchaseMode === 'buy');
    if (this.purchaseMode === 'cart') {
      this.notifyService.success('Thêm sản phẩm thành công!');
    }
    this.showPurchaseSheet = false;
  }

  shareProduct(): void {
    if (!this.product) return;

    openShareSheet({
      type: 'zmp_deep_link',
      data: {
        title: this.product.name,
        thumbnail: productImageThumbPath(this.product.imageThumb) || this.currentImage,
        path: `${uriFeConst.product.detail}?id=${this.product.id}`,
      },
    }).catch(() => {
      this.notifyService.error('Không thể chia sẻ. Vui lòng thử lại.');
    });
  }

  openQuickBuy(product: IResProductInList): void {
    this.quickBuyProductId = product.id;
  }

  closeQuickBuy(): void {
    this.quickBuyProductId = null;
  }

  async openSupportChat(): Promise<void> {
    const oaId = environment.OAId;
    if (!oaId) {
      this.notifyService.warning('Có lỗi xảy ra');
      return;
    }

    try {
      await openChat({type: 'oa', id: oaId, message: 'Xin chào'});
    } catch {
      this.notifyService.error('Không thể mở chat hỗ trợ, vui lòng thử lại');
    }
  }

  formatPrice(value: number): string {
    return `${Number(value || 0).toLocaleString('vi-VN')} VND`;
  }

  otherProductPrice(product: IResProductInList): number {
    return productDisplayPrice(product);
  }

  otherProductOriginalPrice(product: IResProductInList): number {
    return productOriginalPrice(product);
  }

  otherProductImage(product: IResProductInList): string {
    return productImageThumbPath(product.imageThumb) || product.image || 'assets/img/no-image.png';
  }

  discountLabel(product: IResProductInList): string {
    const percent = Number(product.discountPercent || 0);
    return percent > 0 ? `-${percent}%` : '';
  }

  private uniqueVariantValues(key: 'color' | 'size', product = this.product): string[] {
    const values = (product?.childs ?? [])
      .map(child => child[key])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map(value => value.trim());
    return [...new Set(values)];
  }

  private sameVariantValue(a?: string | null, b?: string | null): boolean {
    return (a ?? '').trim() === (b ?? '').trim();
  }

  colorName(color: ProductColorOption | string): string {
    return typeof color === 'string' ? color : color.name;
  }

  colorStyle(color: ProductColorOption | string): string {
    const code = typeof color === 'string'
      ? this.findColorCodeByName(color)
      : color.code || this.findColorCodeByName(color.name);
    return this.normalizeColorCode(code) || '#e5e7eb';
  }

  private normalizeColorOptions(
    colors: IResProductDetail['availableColors'],
    product = this.product
  ): ProductColorOption[] {
    const options = colors
      .map(color => {
        const name = typeof color === 'string' ? color.trim() : (color.name ?? '').trim();
        if (!name) return null;
        const code = typeof color === 'string'
          ? this.findColorCodeByName(name, product)
          : (color.code ?? '').trim() || this.findColorCodeByName(name, product);
        return {name, code};
      })
      .filter((color): color is ProductColorOption => !!color);

    return this.uniqueColorsByName(options);
  }

  private findColorCodeByName(name: string, product = this.product): string {
    const color = (product?.childs ?? []).find(child => this.sameVariantValue(child.color, name));
    return color?.colorCode?.trim() || '';
  }

  private uniqueColorsByName(colors: ProductColorOption[]): ProductColorOption[] {
    const result: ProductColorOption[] = [];
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

    const selectedId = this.prdManageService.objPro?.id;
    if (selectedId) {
      const variantById = childs.find(child => child.id === selectedId);
      if (variantById) return variantById;
    }

    const color = this.prdManageService.objPro?.color;
    const size = this.prdManageService.objPro?.size;
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

    const color = this.prdManageService.objPro?.color;
    const size = this.prdManageService.objPro?.size;
    const hasColors = this.availableColors().length > 0;
    const hasSizes = this.availableSizes().length > 0;

    if (hasColors && !color) return undefined;
    if (hasSizes && !size) return undefined;

    return childs.find(child =>
      (!hasColors || this.sameVariantValue(child.color, color)) &&
      (!hasSizes || this.sameVariantValue(child.size, size))
    );
  }

  showSoldOutToast(): void {
    this.notifyService.warning('sản phẩm hiện đã hết hàng');
  }

  private clampQuantityToInventory(): void {
    this.prdManageService.objPro.quantity = Math.min(
      Math.max(1, this.prdManageService.objPro.quantity),
      this.maxQuantity
    );
  }

  private syncSelectionSignals(): void {
    // ProductManageService mutates objPro directly, so mirror the current values into signals after each selection.
    this.selectedColorSignal.set(this.prdManageService.objPro?.color ?? '');
    this.selectedSizeSignal.set(this.prdManageService.objPro?.size ?? '');
  }

  private loadOtherProducts(detail: IResProductDetail): void {
    const params: ISearchProductParams = {
      productId: detail.id,
      page: 1,
      pageSize: 8,
      loadAttr: false,
    };

    if (detail.category?.id) {
      params.categoryId = detail.category.id;
    }

    this.isLoadingOtherProducts = true;
    this.productApi.searchProductRelated(params)
      .pipe(finalize(() => (this.isLoadingOtherProducts = false)))
      .subscribe({
        next: (res) => {
          const products = res.data?.result ?? [];
          this.otherProducts = products
            .filter(item => item.id !== detail.id)
            .slice(0, 8);
        },
        error: () => {
          this.otherProducts = [];
        }
      });
  }
}
