import {Component, Input, OnInit} from '@angular/core';
import {ProductManageService} from '@shared/services/global';
import {IResProductDetail} from '@shared/models/api';
import {NotifyService} from '@core/services';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';

export type IPSelectOption = {
  name: number | string,
  code: number | string
}

@Component({
  selector: 'app-add-to-cart',
  templateUrl: 'add-to-cart.component.html',
  styleUrls: ['add-to-cart.component.scss'],
  standalone: false
})


export class AddToCartComponent implements OnInit {
  @Input() prdService!: ProductManageService;
  // product!: IResProductDetail;
  @Input() product!: IResProductDetail;
  selectChilds: IPSelectOption[] = [];

  constructor(
    private notify: NotifyService,
    public active: NgbActiveOffcanvas,
  ){

  }

  ngOnInit() {
    this.product = this.prdService.value as IResProductDetail;
    if (!this.product) return;

    if (!this.prdService.objPro) this.prdService.createAllState();

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
    this.prdService.addToCart();
    this.active.close();
    this.notify.success('Thêm sản phẩm thành công!')
  }

}
