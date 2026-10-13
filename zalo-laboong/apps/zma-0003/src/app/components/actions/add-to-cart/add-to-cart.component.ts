import {Component, Input, OnInit} from '@angular/core';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {IResProductDetail} from '@shared/models/api';
import {ProductManageService} from '@shared/services/global';
import {NotifyService} from '@core/services';
import {IPSelectOption} from '../../../pages/products/features/detail/product-detail.component';

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
  selectChilds: IPSelectOption[] = [];

  constructor(
    public active: NgbActiveOffcanvas,
    private notify: NotifyService
  ) {
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
    if (!this.prdService.objPro.id) {
      if (this.selectChilds.length) {
        this.prdService.isRequiredChild = 'Vui lòng chọn ít nhất một sản phẩme';
        return;
      }

      this.prdService.isRequiredAttr = 'Vui lòng chọn màu sắc/kích thước!';
      return
    }

    this.prdService.addToCart(this.type === 'buyNow');

    this.active.close();
    this.notify.success('Thêm sản phẩm thành công!')
  }
}
