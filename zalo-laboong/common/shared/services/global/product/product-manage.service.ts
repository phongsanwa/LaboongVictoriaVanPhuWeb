import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {IResProductChild, IResProductDetail} from '@shared/models/api';
import {CartManageService} from '../cart/cart-manage.service';
import {Router} from '@angular/router';
import {ICartItem} from '../../../models/feature-specific';
import {productDisplayPrice, productImageThumbPath, productOriginalPrice} from '../../../utils';

export interface IObjPro {
  id: number,
  name: string,
  parentId: number,
  quantity: number,
  price: number,
  oldPrice: number,
  priceOld: number,
  image: string,
  size: string,
  color: string,
  priceAfterDiscount: number;
  contactPrice: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductManageService {
  private readonly productSubject = new BehaviorSubject<IResProductDetail | null>(null);
  readonly product$: Observable<IResProductDetail | null> = this.productSubject.asObservable();
  public readonly placeOrderRequested$ = new Subject<void>();
  objPro!: IObjPro;
  product!: IResProductDetail;
  isRequiredAttr!: string
  isRequiredChild!: string
  selectChildColor: Record<string, string[]> = {};
  availableSizes: string[] = []
  selectedVariant: IResProductChild | null = null;

  constructor(
    private cartManageService: CartManageService,
    private router: Router
  ) {
  }

  // Khởi tạo dữ liệu cho AddToCart
  initForAddToCart(product: IResProductDetail) {
    if (!this.objPro) this.createAllState();
    this.objPro.image ||= productImageThumbPath(product.imageThumb);
    this.objPro.price ||= productDisplayPrice(product);
    this.objPro.oldPrice ||= productOriginalPrice(product);
    this.objPro.priceOld = this.objPro.oldPrice;
    this.objPro.name ||= product.name ?? '';
    this.objPro.parentId = product.id;

    this.availableSizes = this.getAvailableSizes(product);

    this.buildVariantIndexes(product);

    const childs = Array.isArray(product.childs) ? product.childs : [];
    const hasColors = (Array.isArray(product.availableColors) && product.availableColors.length > 0) ||
      childs.some(child => !!child.color);
    const hasSizes = this.availableSizes.length > 0;

    if (!hasColors && !hasSizes && childs.length > 0 && !this.objPro.id) {
      this.objPro.id = childs[0].id;
    }

    const onlyColor = hasColors && !hasSizes && childs.length > 0;
    if (onlyColor && hasColors && !this.objPro.id) {
      this.getProductIdBySizeAndColor();
    }
  }

  private buildVariantIndexes(product: IResProductDetail) {
    this.selectChildColor = {};
    const childs = Array.isArray(product.childs) ? product.childs : [];
    for (const p of childs) {
      const colorKey = p?.color ?? '';
      if (!colorKey) continue;
      const arr = this.selectChildColor[colorKey] ?? [];
      if (p?.size) arr.push(p.size);
      this.selectChildColor[colorKey] = arr;
    }
  }

  /**
   * STATE & PRODUCT LIFECYCLE
   */
  get value(): IResProductDetail | null {
    return this.productSubject.value;
  }

  set(product: IResProductDetail) {
    this.productSubject.next(product);
    this.product = product;

    if (!this.objPro) this.createAllState();
    if (!this.objPro.name) this.objPro.name = product.name;
    if (!this.objPro.image) this.objPro.image = productImageThumbPath(product.imageThumb);
    if (!this.objPro.price) this.objPro.price = productDisplayPrice(product);
    const originalPrice = productOriginalPrice(product);
    if (!this.objPro.oldPrice && originalPrice) {
      this.objPro.oldPrice = originalPrice;
    }
    this.objPro.priceOld = this.objPro.oldPrice;

    if (!Array.isArray(product.childs) || product.childs.length === 0) {
      this.objPro.id = product.id;
    }
  }

  clear() {
    this.productSubject.next(null);
    this.createAllState();
  }

  /**
   * USER SELECTION HANDLERS
   */

  onColorChange(color: string) {
    this.objPro.color = color;

    this.availableSizes = this.getAvailableSizes(this.product);

    this.getProductIdBySizeAndColor();
  }

  onSizeChange(size: string) {
    this.objPro.size = size;
    this.getProductIdBySizeAndColor();
  }

  /**
   *  VARIANT RESOLUTION
   */

  /** Tìm id biến thể tương ứng với lựa chọn hiện tại (bao quát mọi case) */
  getProductIdBySizeAndColor() {
    this.resetError();
    if (!this.product) return;

    const {hasChilds, hasColor, hasSize, childs} = this.detectDims();

    // Không có biến thể -> dùng id cha
    if (!hasChilds) {
      this.selectedVariant = null;
      this.objPro.id = this.product.id;
      this.updatePreviewFromSelection();
      return this.product;
    }

    const size = (this.objPro.size || '').trim();
    const color = (this.objPro.color || '').trim();

    let variant: IResProductChild | undefined;

    if (hasColor && hasSize) {
      // Cần đủ cả 2 thuộc tính
      if (color && size) {
        variant = childs.find(c =>
          this.sameVariantValue(c.color, color) &&
          this.sameVariantValue(c.size, size)
        );
        this.objPro.id = variant?.id ?? 0;
      } else {
        this.objPro.id = 0;
      }
    } else if (hasColor && !hasSize) {
      // Chỉ có màu
      if (color) {
        variant = childs.find(c => this.sameVariantValue(c.color, color));
        this.objPro.id = variant?.id ?? 0;
      } else {
        this.objPro.id = 0;
      }
    } else if (!hasColor && hasSize) {
      // Chỉ có size
      if (size) {
        variant = childs.find(c => this.sameVariantValue(c.size, size));
        this.objPro.id = variant?.id ?? 0;
      } else {
        this.objPro.id = 0;
      }
    } else {
      // Có child nhưng không có thuộc tính
      if (!this.objPro.id && childs[0]) {
        this.objPro.id = childs[0].id;
        variant = childs[0];
      }
    }

    this.selectedVariant = variant ?? null;
    this.updatePreviewFromSelection(variant);
    return variant ?? this.product;
  }

  /**
   *  PRESENTATION / PREVIEW
   */

  /** Cập nhật preview ảnh/giá dựa vào lựa chọn hiện tại */
  private updatePreviewFromSelection(preselected?: IResProductChild | null) {
    if (!this.product) return;

    let variant = preselected ?? null;
    const {hasChilds, childs} = this.detectDims();

    if (!variant && hasChilds) {
      const color = (this.objPro.color || '').trim();
      const size = (this.objPro.size || '').trim();

      // Ưu tiên match đủ
      if (color && size) {
        variant = childs.find(c =>
          this.sameVariantValue(c.color, color) &&
          this.sameVariantValue(c.size, size)
        ) || null;
      }
      // Nếu chỉ có color/size thì vẫn dùng để đổi ảnh/giá preview
      if (!variant && color) {
        variant = childs.find(c => this.sameVariantValue(c.color, color)) || null;
      }
      if (!variant && size) {
        variant = childs.find(c => this.sameVariantValue(c.size, size)) || null;
      }
    }

    this.objPro.image = productImageThumbPath(variant?.imageThumb) || productImageThumbPath(this.product.imageThumb);
    this.objPro.price = variant ? productDisplayPrice(variant) : productDisplayPrice(this.product);
    this.objPro.oldPrice = variant ? productOriginalPrice(variant) : productOriginalPrice(this.product);
    this.objPro.priceOld = this.objPro.oldPrice;
  }

  /**
   *  Validate
   */
  validateSelection(product: IResProductDetail): string | null {
    if (this.objPro.id) return null;

    const hasChilds = Array.isArray(product.childs) && product.childs.length > 0;
    const childs = Array.isArray(product.childs) ? product.childs : [];
    const hasColors = (Array.isArray(product.availableColors) && product.availableColors.length > 0) ||
      childs.some(child => !!child.color);
    const hasSizes = (Array.isArray(product.availableSizes) && product.availableSizes.length > 0) ||
      childs.some(child => !!child.size);

    if (hasChilds && !hasColors && !hasSizes) {
      return 'Vui lòng chọn ít nhất một sản phẩm';
    }
    return 'Vui lòng chọn màu sắc/kích thước!';
  }

  /**
   *  CART ACTIONS
   */

  addToCart(buyNow?: boolean) {
    const cartItem: ICartItem = {
      productId: this.objPro.id,
      productParentId: null,
      name: this.objPro.name,
      quantity: this.objPro.quantity,
      sizeChecked: this.objPro.size,
      colorChecked: this.objPro.color,
      isChecked: true,
      price: this.objPro.price,
      priceOld: this.objPro.oldPrice,
      image: this.objPro.image
    };

    this.cartManageService.addCartItem(cartItem);

    if (buyNow) {
      this.router.navigate(['/checkout']);
    }
  }

  /**
   *  INTERNAL UTILS
   */
  private detectDims() {
    const childs = Array.isArray(this.product?.childs)
      ? [...this.product.childs].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      : [];
    const hasChilds = childs.length > 0;
    const hasColor = hasChilds && (
      (Array.isArray(this.product.availableColors) && this.product.availableColors.length > 0) ||
      childs.some(c => !!c.color)
    );
    const hasSize = hasChilds && (
      (Array.isArray(this.product.availableSizes) && this.product.availableSizes.length > 0) ||
      childs.some(c => !!c.size)
    );
    return {hasChilds, hasColor, hasSize, childs};
  }

  createAllState() {
    this.objPro = {
      id: 0,
      name: '',
      parentId: 0,
      quantity: 1,
      price: 0,
      oldPrice: 0,
      priceOld: 0,
      image: '',
      size: '',
      color: '',
      priceAfterDiscount: 0,
      contactPrice: 0,
    }
    this.selectedVariant = null;
    this.detectDims();
    this.resetError();
  }

  private resetError() {
    this.isRequiredAttr = '';
    this.isRequiredChild = '';
  }

  private sameVariantValue(a?: string | null, b?: string | null): boolean {
    return (a ?? '').trim() === (b ?? '').trim();
  }

  private getAvailableSizes(product?: IResProductDetail | null): string[] {
    if (Array.isArray(product?.availableSizes) && product.availableSizes.length) {
      return product.availableSizes;
    }

    const sizes = (product?.childs ?? [])
      .map(child => child.size)
      .filter((size): size is string => typeof size === 'string' && size.trim().length > 0)
      .map(size => size.trim());

    return [...new Set(sizes)];
  }

  public requestPlaceOrder() {
    this.placeOrderRequested$.next();
  }
}
