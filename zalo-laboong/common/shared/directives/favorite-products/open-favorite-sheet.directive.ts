import {Directive, Input, inject, HostListener} from '@angular/core';
import {NgbOffcanvasOptions} from '@ng-bootstrap/ng-bootstrap';
import {OffcanvasCustomService} from '../../services/global';
import {FavoriteListSheetComponent} from '../../components/favorite-products/favorite-products-modal.component';
import {IResProduct, IResProductInList} from '../../models/api';
import {FavoriteStateService} from '../../services/global/favorite-product/favorite-state.service';

@Directive({
  selector: '[appOpenFavoriteSheet]',
  standalone: true,
})
export class OpenFavoriteSheetDirective {
  private offcanvas = inject(OffcanvasCustomService);
  private favState = inject(FavoriteStateService);

  @Input() product!: IResProductInList | IResProduct
  @Input() favOptions: NgbOffcanvasOptions = {
    position: 'bottom',
    backdrop: true,
    keyboard: true,
    scroll: false,
    container: 'body',
    panelClass: 'offcanvas-bottom-sheet'
  };

  @HostListener('click')
  open() {
    const ref = this.offcanvas.open(FavoriteListSheetComponent, this.favOptions);
    ref.componentInstance.items = this.product;

    ref.closed.subscribe(() => this.favState.notifyChanged());
    ref.dismissed.subscribe(() => this.favState.notifyChanged());
  }
}
