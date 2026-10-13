import {Component, OnDestroy, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {ZmaNativeStorageService, ZmpService} from '@core/services';
import {FAV_KEY, IFavoriteList, IFavoriteProduct} from '@shared/models/feature-specific';
import {catchError, filter, map, of, take, takeUntil} from 'rxjs';
import {tap} from 'rxjs/operators';
import {OffcanvasCustomService, ProductManageService} from '@shared/services/global';
import {AddToCartComponent} from '../../../../../components/actions/add-to-cart/add-to-cart.component';
import {NgbOffcanvasOptions} from '@ng-bootstrap/ng-bootstrap';
import {ProductRepoService} from '@shared/services/repository';

@Component({
  selector: 'app-favorite-product-detail',
  templateUrl: 'favorite-product-detail.component.html',
  styles: [`
    .cart-item {
      background-color: #ffffff;
      border-radius: 8px;
      padding: .75rem;
    }

    .cart-item-image {
      width: 150px;
      height: 120px;
      flex-shrink: 0;
    }

    .cart-item-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #eee;
    }

    .cart-item-info {
      font-weight: 500;
      color: #212529;
      font-size: 1rem;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }

    .price-line {
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .price-line.main-price {
      color: #212529;
      font-weight: 500;
    }

    .price-line .price-value {
      margin-left: 0.25rem;
    }

    .btn-delete-icon {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background-color: #ffffff;
      border: none;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .btn-delete-icon .ph-trash {
      font-size: 14px;
      color: var(--brand-color);
    }

    .btn-delete-icon:hover {
      background-color: #f0f0f0;
    }

    .align-self-end {
      position: absolute;
      bottom: 6px;
      left: 17%;
      transform: translateX(-50%);
    }

    .align-self {
      display: flex;
      align-items: flex-end;

      .add-btn {
        width: 30px;
        height: 30px;
        border-radius: 6px;
        border: 0;
        background: var(--brand-color);
        color: #fff;

        & i {
          font-size: 16px;
        }
      }
    }

  `],
  standalone: false
})
export class FavoriteProductDetailComponent extends AppCommonComponent implements OnInit, OnDestroy {
  private _uid = 'guest';
  lists: IFavoriteList[] = [];
  currentList: IFavoriteList | null = null;
  products: IFavoriteProduct[] = [];
  constructor(
    private zmp: ZmpService,
    private storage: ZmaNativeStorageService,
    private prdService: ProductManageService,
    private offcanvasSvc: OffcanvasCustomService,
    private productRepo: ProductRepoService
  ) {
    super();
  }

  ngOnInit() {
    this.setHeader({ variant: 'title', show: true, back: true, title: `Danh sách yêu thích` });
    this.setFooter({ variant: 'tabs', show: false });

    this.zmp.getUserId$()
      .pipe(
        take(1),
        catchError(() => of('guest')),
        map(uid => String(uid || 'guest')),
        tap(uid => {
          this._uid = uid;

          const listId = String(this.navService.getParam('id') || '');

          this.applyListById(listId);
        }),
        takeUntil(this.destroyed)
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  onAddToCartClick(id: number) {
    this.productRepo.getDetailOnce(id).subscribe({
      next: (detail) => {
        this.prdService.createAllState();
        this.prdService.set(detail);

        const opts: NgbOffcanvasOptions = {
          position: 'bottom',
          backdrop: true,
          keyboard: true,
          scroll: false,
          container: 'body',
          panelClass: 'offcanvas-bottom-sheet',
        };

        const ref = this.offcanvasSvc.open(AddToCartComponent, opts);
        ref.componentInstance.prdService = this.prdService;
      }
    });
  }

  private applyListById(listId: string): void {
    const key = FAV_KEY(this._uid);
    const saved = this.storage.get<IFavoriteList[]>(key, []);

    const seen = new Set<string>();
    let mutated = false;
    const fixed = (Array.isArray(saved) ? saved : []).map(it => {
      let id = it.id;
      if (!id || seen.has(id)) {
        id = `${this._uid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        mutated = true;
      }
      seen.add(id);
      return { ...it, id };
    });
    if (mutated) this.storage.set(key, fixed);

    this.lists = fixed;
    this.currentList = fixed.find(l => String(l.id) === listId) || null;

    const title = this.currentList ? `Danh sách yêu thích: ${this.currentList.name}` : 'Danh sách yêu thích';
    this.setHeader({ variant: 'title', show: true, back: true, title, className: 'header-color' });

    this.products = (this.currentList?.data ?? [])
      .slice()
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }

  removeProduct(productId: number) {
    this.notifyService
      .dialogConfirmDelete({
        size: 'sm',
        title: 'Xoá sản phẩm',
        content: 'Bạn có chắc muốn xoá sản phẩm này khỏi danh sách?',
        variant: 'modern'
      })
      .pipe(
        take(1),
        map((res: { confirmDelete?: boolean } | undefined) => !!res?.confirmDelete),
        filter(Boolean),
        tap(() => {
          const key = FAV_KEY(this._uid);
          const lists = this.storage.get<IFavoriteList[]>(key, []);
          const listIdx = lists.findIndex(l => String(l.id) === String(this.currentList?.id));
          if (listIdx === -1) return;

          const current = lists[listIdx];
          const updatedData = (current.data ?? []).filter(p => String(p.id) !== String(productId));
          const updatedList: IFavoriteList = { ...current, data: updatedData };

          const updatedLists = [...lists];
          updatedLists[listIdx] = updatedList;

          this.storage.set(key, updatedLists);

          this.currentList = updatedList;
          this.products = updatedData;

          this.notifyService.success('Đã xoá sản phẩm thành công.');
        })
      )
      .subscribe();
  }
}
