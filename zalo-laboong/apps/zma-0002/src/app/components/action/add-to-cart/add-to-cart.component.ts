import {Component, DestroyRef, inject, Input, OnInit} from '@angular/core';
import {ProductManageService} from '@shared/services/global';
import {IProductAvailableColor, IResProductDetail} from '@shared/models/api';
import {NotifyService} from '@core/services';
import {SharedCommonModule} from '@shared/shared-common.module';
import {uriFeConst} from '@shared/constants';

export type IPSelectOption = {
  name: number | string,
  code: number | string
}

@Component({
  selector: 'app-add-to-cart',
  templateUrl: 'add-to-cart.component.html',
  imports: [
    SharedCommonModule
  ],
  standalone: true,
  styleUrls: ['add-to-cart.component.scss']
})


export class AddToCartComponent implements OnInit {
  @Input() prdService!: ProductManageService;
  product!: IResProductDetail;
  selectChilds: IPSelectOption[] = [];
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private notify: NotifyService
  ){

  }

  ngOnInit() {
    this.product = this.prdService.value as IResProductDetail;
    if (!this.product) return;

    this.prdService.initForAddToCart(this.product);

  }

  checkDisableSize(size: string) {
    if (!this.prdService.objPro.size) {
      return ''
    }
    const sizeOfColor = this.prdService.selectChildColor[this.prdService.objPro.color]
    if (!sizeOfColor) {
      return ''
    }

    return sizeOfColor.includes(size) ? '' : 'disabled';
  }

  colorName(color: IProductAvailableColor | string): string {
    return typeof color === 'string' ? color : color.name;
  }

  confirmOrder() {
    this.prdService.getProductIdBySizeAndColor();
    const err = this.prdService.validateSelection(this.product);
    if (err) {
      this.prdService.isRequiredAttr = err;
      return;
    }
    this.prdService.addToCart();

    this.notify.success('Thêm sản phẩm thành công!')
  }

  protected readonly uriFeConst = uriFeConst;
}
