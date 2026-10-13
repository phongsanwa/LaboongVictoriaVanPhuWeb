import {Component, Input, OnInit} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {NgClass} from '@angular/common';
import {AppFormAddService} from '../../../services/global/app-form-add.service';
import {ModalCustomService} from '../../../services/global';
import {ZmaNativeStorageService, ZmpService} from '../../../../core/services';
import {catchError, of, take} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {FAV_KEY, IFavoriteList} from '../../../models/feature-specific';

export type IAddFavorite = FormGroup<{
  name: FormControl<string>;
}>

@Component({
  selector: 'app-add-favorite-modal',
  template: `
    <form class="sheet" [formGroup]="form">
      <div class="sheet-header d-flex align-items-center py-3 px-2">
        <h5 class="flex-1 text-center fw-semibold">Danh sách yêu thích mới</h5>
        <button type="button" class="btn btn-link text-dark px-2" (click)="onClose()">
          <i class="ph-light ph-x"></i>
        </button>
      </div>

      <div class="sheet-body p-2">
        <div class="form-floating form-control-feedback mb-3">
          <input
            type="text"
            class="form-control showPlaceholder"
            [ngClass]="{ 'ng-error': showError('name') }"
            formControlName="name"
            placeholder=""/>
          <label>Nhập tên danh sách <span class="text-danger">*</span></label>

          @if (showError('name')) {
            <small class="text-danger d-block mt-1">Bạn chưa điền đủ thông tin</small>
          }
        </div>
      </div>

      <div class="d-flex justify-content-center px-3 pb-3 pt-0">
        <button type="button" (click)="onSubmit()" class="btn created-button w-100 outline">
          Tạo
        </button>
      </div>
    </form>
  `,
  styles: [`
    .created-button {
      background-color: var(--brand-color);
      color: #ffffff;
    }
  `],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgClass,
    FormsModule,
  ]
})

export class AddFavoriteModalComponent implements OnInit {
  @Input() data!: { name: string }
  form!: IAddFavorite

  constructor(
    private appFm: AppFormAddService,
    public active: ModalCustomService,
    private storage: ZmaNativeStorageService,
    private zmp: ZmpService,
  ) {
  }

  ngOnInit() {
    this.form = this.appFm.createForm({
      name: ['', Validators.required]
    })

    if(this.data && this.data.name) {
      this.form.patchValue({
        name: this.data.name
      })
    }
  }

  onSubmit() {
    if (!this.appFm.submitFromHandle(this.form)) return;

    const ctrl = this.form.get('name');
    const rawName = String(ctrl?.value ?? '').trim();

    if (!rawName) {
      ctrl?.setErrors({ required: true });
      return;
    }

    this.zmp.getUserId$()
      .pipe(
        take(1),
        catchError(() => of('guest')),
        map(uid => String(uid || 'guest')),
        tap(uid => {
          const key = FAV_KEY(uid);
          const lists = this.storage.get<IFavoriteList[]>(key, []);

          // chống trùng tên (không phân biệt hoa/thường)
          const exists = lists.some(x => x.name.trim().toLowerCase() === rawName.toLowerCase());
          if (exists) {
            ctrl?.setErrors({ duplicate: true });
            ctrl?.markAsTouched();
            return;
          }

          const newItem: IFavoriteList = {
            id: this.genListId(uid),
            name: rawName,
            createdAt: Date.now()
          };

          this.storage.set(key, [newItem, ...lists]);
          this.active.dismissAll(newItem);
        })
      )
      .subscribe();
  }

  onClose() {
    this.active.dismissAll()
  }

  showError(ctrlPath: string): boolean {
    const c = this.form.get(ctrlPath);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  private genListId(uid: string): string {
    return `${uid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  }
}
