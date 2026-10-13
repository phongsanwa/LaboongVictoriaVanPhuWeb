import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IResProduct, IResProductInList} from '@shared/models/api';
import {ModalCustomService} from '@shared/services/global';
import {
  AddFavoriteModalComponent,
} from '../modals/modal-add-favorite/add-favorite-modal.component';
import {ZmaNativeStorageService, ZmpService} from '@core/services';
import {catchError, of, take} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {
  FAV_KEY,
  IFavoriteList,
  IFavoriteProduct
} from '@shared/models/feature-specific';
import {normalizeProductItem, productImageThumbPath} from '@shared/utils';

@Component({
  selector: 'app-favorite-list-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './favorite-products-modal.component.html',
  styleUrls: ['./favorite-products-modal.component.scss']
})
export class FavoriteListSheetComponent implements OnInit {
  private _uid = 'guest';
  private selectedIds: Set<string> = new Set<string>();

  @Input() items!: IResProductInList | IResProduct
  @Input() lists: IFavoriteList[] = [];

  @Input() searchPlaceholder = 'Tìm kiếm';
  @Input() title = 'Danh sách yêu thích';

  @Input() query = '';
  @Output() queryChange = new EventEmitter<string>();

  constructor(
    private offcanvas: NgbActiveOffcanvas,
    private modalService: ModalCustomService,
    private storage: ZmaNativeStorageService,
    private zmp: ZmpService
  ) {
  }

  ngOnInit() {
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
          const fixed = saved.map(it => {
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

  onInput(ev: Event): void {
    const value = (ev.target as HTMLInputElement | null)?.value ?? '';
    const next = value.trim();
    this.query = next;
    this.queryChange.emit(next);
  }

  filtered(): IFavoriteList[] {
    const q = (this.query || '').toLowerCase();
    if (!q) return this.lists;
    return this.lists.filter(l => l.name.toLowerCase().includes(q));
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  toggle(id: string, checked: boolean): void {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
  }

  allSelected(): boolean {
    const visible = this.filtered();
    return !!visible.length && visible.every(l => this.selectedIds.has(l.id));
  }

  toggleAll(checked: boolean): void {
    const visible = this.filtered();
    if (checked) {
      visible.forEach(l => this.selectedIds.add(l.id));
    } else {
      visible.forEach(l => this.selectedIds.delete(l.id));
    }
  }

  addFavorite(): void {
    const ref = this.modalService.openDefault(AddFavoriteModalComponent, { size: 'md', centered: true });
    ref.dismissed.subscribe({
      next: (rs: IFavoriteList) => {
        if (rs && rs.id && rs.name) {
          const newList: IFavoriteList = {
            id: rs.id,
            name: rs.name,
            createdAt: rs.createdAt ?? Date.now()
          };
          this.lists = [newList, ...(this.lists ?? [])];
          this.selectedIds.add(newList.id);

          const key = FAV_KEY(this._uid);
          this.storage.set(key, this.lists);
        }
      }
    });
  }

  private toFavItem(product: IResProductInList | IResProduct): IFavoriteProduct {
    const p = normalizeProductItem(product);
    return {
      id: Number(p.id),
      name: p.name ?? '',
      image: productImageThumbPath(p.imageThumb),
      price: p.price ? p.price : null,
      addedAt: Date.now()
    };
  }

  private upsertProduct(list: IFavoriteList, item: IFavoriteProduct): IFavoriteList {
    const exists = (list.data || []).some(x => String(x.id) === String(item.id));
    if (exists) return list;
    return { ...list, data: [item, ...(list.data || [])] };
  }

  onDone(): void {
    const chosen = Array.from(this.selectedIds);
    if (this.items && chosen.length) {
      const favItem = this.toFavItem(this.items);

      this.lists = this.lists.map(l =>
        chosen.includes(l.id) ? this.upsertProduct(l, favItem) : l
      );
      const key = FAV_KEY(this._uid);
      this.storage.set(key, this.lists);
    }

    this.offcanvas.dismiss();
  }

  close() { this.offcanvas.dismiss(); }
}
