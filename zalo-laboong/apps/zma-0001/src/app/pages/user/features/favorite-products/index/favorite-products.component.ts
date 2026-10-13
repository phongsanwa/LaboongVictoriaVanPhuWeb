import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {FAV_KEY, IFavoriteList} from '@shared/models/feature-specific';
import {ZmaNativeStorageService, ZmpService} from '@core/services';
import {catchError, filter, map, of, take} from 'rxjs';
import {tap} from 'rxjs/operators';
import {AddFavoriteModalComponent} from '@shared/components/modals/modal-add-favorite/add-favorite-modal.component';
import {ModalCustomService} from '@shared/services/global';
import {uriFeConst} from "@shared/constants";

@Component({
  selector: 'app-favorite-products',
  templateUrl: 'favorite-products.component.html',
  styleUrls: ['favorite-products.component.scss'],
  standalone: false
})

export class FavoriteProductsComponent extends AppCommonComponent implements OnInit, OnDestroy {
  private _uid = 'guest';
  lists: IFavoriteList[] = [];

  constructor(
    private zmp: ZmpService,
    private storage: ZmaNativeStorageService,
    private modalService: ModalCustomService
  ) {
    super();
  }

  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Danh sách sản phẩm yêu thích'});
    this.setFooter({variant: 'tabs', show: false});

    // Load theo UID
    this.zmp.getUserId$()
      .pipe(
        take(1),
        catchError(() => of('guest')),
        map(uid => String(uid || 'guest')),
        tap(uid => {
          this._uid = uid;
          const key = FAV_KEY(uid);
          const saved = this.storage.get<IFavoriteList[]>(key, []);

          const seen = new Set<string>();
          let mutated = false;
          const fixed = (Array.isArray(saved) ? saved : []).map(it => {
            let id = it.id;
            if (!id || seen.has(id)) {
              id = `${uid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
              mutated = true;
            }
            seen.add(id);
            return {...it, id};
          });

          if (mutated) this.storage.set(key, fixed);
          this.lists = fixed;
        })
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  renameList(list: IFavoriteList) {
    const ref = this.modalService.openDefault(AddFavoriteModalComponent, {size: 'md', centered: true});

    ref.componentInstance.data = {
      name: list.name
    }
    ref.dismissed.subscribe({
      next: (rs: IFavoriteList) => {
        const nextName = (rs?.name || '').trim();
        if (!nextName) return;
        const exists = this.lists.some(x =>
          x.id !== list.id && x.name.trim().toLowerCase() === nextName.toLowerCase()
        );
        if (exists) {
          this.notifyService.error('Tên danh sách đã tồn tại.');
          return;
        }

        list.name = nextName;
        this.persist();
      }
    });
  }

  shareList(list: IFavoriteList) {
    // Sẽ xử lý tiếp khi có logic affiliate
  }

  deleteList(list: IFavoriteList): void {
    this.notifyService
      .dialogConfirmDelete({size: 'sm', title: 'Xoá danh sách', content: `Xoá "${list.name}"?`, variant: 'modern'})
      .pipe(
        take(1),
        map((res: { confirmDelete?: boolean } | undefined) => !!res?.confirmDelete),
        filter(Boolean),

        tap(() => {
          const key = FAV_KEY(this._uid);
          const current = this.storage.get<IFavoriteList[]>(key, []);

          const updated = (Array.isArray(current) ? current : []).filter(
            (l) => String(l.id) !== String(list.id)
          );

          this.storage.set(key, updated);
          this.lists = updated;
          this.notifyService.success('Đã xoá danh sách.');
        })
      )
      .subscribe();
  }

  private persist(): void {
    const key = FAV_KEY(this._uid);
    this.storage.set(key, this.lists);
  }

  protected readonly uriFeConst = uriFeConst;
}
