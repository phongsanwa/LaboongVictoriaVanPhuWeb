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
import {IResProductDetail, IResProductInList} from '@shared/models/api';
import {ShortNumberPipe, ProductPriceHtmlPipe} from '@shared/pipes/global';
import {NgbOffcanvasOptions} from '@ng-bootstrap/ng-bootstrap';
import {AddToCartComponent} from '../../actions/add-to-cart/add-to-cart.component';
import {OffcanvasCustomService, ProductManageService} from '@shared/services/global';
import {OpenFavoriteSheetDirective} from '@shared/directives/favorite-products/open-favorite-sheet.directive';
import {FavoriteActiveDirective} from '@shared/directives';
import {uriFeConst} from '@shared/constants';
import {ProductApiService} from '@shared/services/api';

@Component({
  selector: 'app-product-item',
  standalone: true,
  imports: [CommonModule, RouterModule, OpenFavoriteSheetDirective, FavoriteActiveDirective, ShortNumberPipe, ProductPriceHtmlPipe],
  templateUrl: './product-item.component.html',
  styleUrls: ['./product-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductItemComponent implements OnInit {
  soldCount = 0;
  @Input({required: true}) productInList!: IResProductInList;
  @Output() addToCart = new EventEmitter<IResProductInList>();
  fallbackImage = 'https://dummyimage.com/300x300/163645/fff';

  constructor(
    private offcanvasSvc: OffcanvasCustomService,
    private prdService: ProductManageService,
    private productApi: ProductApiService
  ) {
  }

  ngOnInit(): void {
    this.soldCount = this.randomSold();
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

    const id = this.productInList.id;
    this.productApi.getProductDetail({ id }).subscribe({
      next: res => {
        if (!res.data) return;
        const detail: IResProductDetail = res.data;
        this.prdService.set(detail);
        const ref = this.offcanvasSvc.open(AddToCartComponent, opts);
        ref.componentInstance.prdService = this.prdService;
        ref.dismissed.subscribe(() => {
          this.prdService.clear();
        });
      }
    });
  }

  onImgError(ev: Event) {
    const el = ev.target as HTMLImageElement;
    if (el && el.src !== this.fallbackImage) el.src = this.fallbackImage;
  }

  // Hiện tại api chưa có sold, nên cần fake để hiển thị UI
  randomSold(): number {
    return Math.floor(Math.random() * 3999) + 1;
  }

  protected readonly Math = Math;
  protected readonly uriFeConst = uriFeConst;
}
