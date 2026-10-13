import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {IResProduct} from '@shared/models/api';
import {I18nFormatCurrencyAmountPipe} from '@shared/pipes/global';
import {NgbOffcanvasOptions} from '@ng-bootstrap/ng-bootstrap';
import {OffcanvasCustomService, ProductManageService} from '@shared/services/global';
import {toProductDetail} from '@shared/utils';
import {uriFeConst} from '@shared/constants';
import {AddToCartComponent} from '../../action/add-to-cart/add-to-cart.component';

@Component({
  selector: 'app-product-item',
  standalone: true,
  imports: [CommonModule, RouterModule, I18nFormatCurrencyAmountPipe],
  templateUrl: './product-item.component.html',
  styleUrls: ['./product-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductItemComponent implements OnInit {
  @Input({required: true}) product!: IResProduct;
  @Output() addToCart = new EventEmitter<IResProduct>();

  constructor(
    private offcanvasSvc: OffcanvasCustomService,
    private prdService: ProductManageService,
  ) {
  }

  ngOnInit(): void {

  }

  onAddToCartClick(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    const opts: NgbOffcanvasOptions = {
      position: 'bottom',
      backdrop: true,
      keyboard: true,
      scroll: false,
      container: 'body',
      panelClass: 'offcanvas-bottom-sheet',
    };

    const detail = toProductDetail(this.product);

    this.prdService.clear();
    this.prdService.set(detail);

    const ref = this.offcanvasSvc.open(AddToCartComponent, opts);

    ref.componentInstance.product = detail;
    ref.componentInstance.prdService = this.prdService;

    ref.closed.subscribe(() => this.prdService.clear());
    ref.dismissed.subscribe(() => this.prdService.clear());
  }


  protected readonly Math = Math;
  protected readonly uriFeConst = uriFeConst;
}
