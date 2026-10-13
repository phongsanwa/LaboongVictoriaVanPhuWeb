import {Component, inject, Input, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {IGroupLocation} from '@shared/components';
import {CheckoutManageService} from '@shared/services/global';
import {AddressCacheService} from '@shared/services/api';
import {IAddressItem, ICreateAddressParams, IUpdateAddressParams, ADDRESS_TYPE, ADDRESS_TYPE_OPTIONS, AddressType,} from '@shared/models/api';
import {IResponseApi} from '@core/models';

type AddressModalScreen = 'list' | 'form' | 'delete-confirm';

type IAddressFormGroup = FormGroup<{
  recipientName: FormControl<string>;
  recipientPhone: FormControl<string>;
  address: FormControl<string>;
  isDefault: FormControl<boolean>;
  type: FormControl<AddressType>;
  location: FormGroup<{
    cityId: FormControl<number | null>;
    districtId: FormControl<number | null>;
    wardId: FormControl<number | null>;
    cityName: FormControl<string>;
    districtName: FormControl<string>;
    wardName: FormControl<string>;
  }>;
}>;

@Component({
  selector: 'app-infocus-modal',
  standalone: false,
  template: `
    <section class="address-sheet" [class.address-sheet--form]="screen === 'form'">
      <header class="address-sheet__header">
        <button class="address-sheet__back" type="button" (click)="back()" aria-label="Quay lại">
          <i class="ph" [class.ph-arrow-left]="screen !== 'list'" [class.ph-x]="screen === 'list'"></i>
        </button>
        <h2>{{ title }}</h2>
        <span class="address-sheet__spacer"></span>
      </header>

      @if (screen === 'list') {
        <main class="address-list-view">
          @if (loading) {
            <div class="address-loading">Đang tải địa chỉ...</div>
          } @else if (addresses.length > 0) {
            <div class="address-list">
              @for (addr of addresses; track addr.id) {
                <article class="address-card" [class.address-card--active]="isActive(addr)">
                  <button class="address-card__select" type="button" (click)="onSelect(addr, $event)">
                    <span class="radio-mark">
                      @if (isActive(addr)) {
                        <i class="ph-bold ph-check"></i>
                      }
                    </span>

                    <span class="address-card__body">
                      <span class="address-card__name">
                        {{ addr.recipientName }}
                        <span>{{ addr.recipientPhone }}</span>
                      </span>
                      <span class="address-card__detail">{{ getFullAddress(addr) }}</span>
                      @if (addr.isDefault === 1) {
                        <span class="address-card__default">Mặc định</span>
                      }
                    </span>
                  </button>

                  <div class="address-card__actions">
                    <button type="button" (click)="openEdit(addr, $event)" aria-label="Sửa địa chỉ">
                      <i class="ph-light ph-pencil-simple"></i>
                    </button>
                    <button type="button" (click)="requestDelete(addr, $event)" aria-label="Xóa địa chỉ">
                      <i class="ph-light ph-trash"></i>
                    </button>
                  </div>
                </article>
              }
            </div>
          } @else {
            <div class="address-empty">
              <span class="address-empty__icon">
                <i class="ph-light ph-map-pin"></i>
              </span>
              <strong>Chưa có địa chỉ nhận hàng</strong>
              <p>Thêm địa chỉ để đặt hàng nhanh hơn trong những lần sau.</p>
            </div>
          }

          <footer class="address-sheet__footer">
            <button class="primary-button" type="button" (click)="openAdd()">
              <i class="ph ph-plus"></i>
              Thêm địa chỉ mới
            </button>
          </footer>
        </main>
      }

      @if (screen === 'form' && form) {
        <form class="address-form-view" [formGroup]="form" (ngSubmit)="saveAddress()">
          <main class="address-form">
            <section class="form-section">
              <h3>Liên hệ</h3>

              <label class="field">
                <span>Người nhận</span>
                <input
                  type="text"
                  formControlName="recipientName"
                  placeholder="Nhập họ tên"
                  [class.field__control--error]="showError('recipientName')"
                />
                @if (showError('recipientName')) {
                  <small>{{ errorMsg('recipientName') }}</small>
                }
              </label>

              <label class="field">
                <span>Số điện thoại</span>
                <input
                  type="tel"
                  formControlName="recipientPhone"
                  inputmode="numeric"
                  maxlength="11"
                  autocomplete="tel"
                  placeholder="Nhập số điện thoại"
                  [class.field__control--error]="showError('recipientPhone')"
                />
                @if (showError('recipientPhone')) {
                  <small>{{ errorMsg('recipientPhone') }}</small>
                }
              </label>
            </section>

            <section class="form-section">
              <h3>Địa chỉ</h3>

              <div class="location-field" [class.location-field--error]="showLocationError()">
                <span>Tỉnh/Thành phố, Quận/Huyện, Phường/Xã</span>
                <app-location-dynamic
                  [config]="{ placeholderInput: 'Chọn khu vực nhận hàng' }"
                  [styles]="locationPickerStyles"
                  [cityId]="cityId"
                  [districtId]="districtId"
                  [wardId]="wardId"
                  (valueChange)="onLocationPicked($event)"
                />
                @if (showLocationError()) {
                  <small>{{ locationErrorMessage }}</small>
                }
              </div>

              <label class="field">
                <span>Tên đường / Tòa nhà / Số nhà</span>
                <input
                  type="text"
                  formControlName="address"
                  placeholder="Nhập địa chỉ cụ thể"
                  [class.field__control--error]="showError('address')"
                />
                @if (showError('address')) {
                  <small>{{ errorMsg('address') }}</small>
                }
              </label>
            </section>

            <div class="type-row">
              <span class="type-row__label">Loại địa chỉ:</span>
              <div class="type-segmented" role="group">
                <button
                  type="button"
                  class="type-btn"
                  [class.type-btn--active]="form.controls.type.value === 2"
                  (click)="setType(2)"
                >
                  <i class="ph-light ph-buildings"></i>
                  Văn Phòng
                </button>
                <button
                  type="button"
                  class="type-btn"
                  [class.type-btn--active]="form.controls.type.value === 1"
                  (click)="setType(1)"
                >
                  <i class="ph-light ph-house"></i>
                  Nhà Riêng
                </button>
              </div>
            </div>
            @if (!checkoutSelectionOnly) {
              <button class="default-row" type="button" (click)="toggleDefault()">
                <span>
                  <strong>Đặt làm địa chỉ mặc định</strong>
                  <small>Ưu tiên dùng địa chỉ này khi thanh toán</small>
                </span>
                <span class="switch" [class.switch--on]="form.controls.isDefault.value">
                  <span></span>
                </span>
              </button>
            }

            @if (submitError) {
              <p class="form-error">{{ submitError }}</p>
            }
          </main>

          <footer class="address-sheet__footer">
            <button class="primary-button" type="submit" [disabled]="saving">
              {{ saving ? 'Đang lưu...' : (editingAddress ? 'Lưu thay đổi' : 'Hoàn thành') }}
            </button>
          </footer>
        </form>
      }

      @if (screen === 'delete-confirm' && deleteTarget) {
        <main class="delete-confirm-view">
          <div class="delete-dialog">
            <span class="delete-dialog__icon">
              <i class="ph-light ph-trash"></i>
            </span>
            <h3>Xóa địa chỉ?</h3>
            <p>Bạn có chắc chắn muốn xóa địa chỉ của {{ deleteTarget.recipientName }} không?</p>
            @if (deleteError) {
              <p class="form-error">{{ deleteError }}</p>
            }
            <div class="delete-dialog__actions">
              <button type="button" class="ghost-button" (click)="cancelDelete()" [disabled]="deleting">Hủy</button>
              <button type="button" class="danger-button" (click)="confirmDelete()" [disabled]="deleting">
                {{ deleting ? 'Đang xóa...' : 'Xóa' }}
              </button>
            </div>
          </div>
        </main>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
      color: #0d0d0d;
      font-family: Roboto, Inter, Arial, sans-serif;
    }

    button,
    input {
      font: inherit;
    }

    button {
      appearance: none;
      border: 0;
      background: transparent;
      color: inherit;
      padding: 0;
    }

    button:disabled {
      opacity: 0.6;
    }

    .address-sheet {
      min-height: min(720px, 85vh);
      background: #f7f7f8;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .address-sheet--form {
      min-height: min(780px, 88vh);
    }

    .address-sheet__header {
      height: 52px;
      background: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 8px;
      border-bottom: 1px solid #eef0f2;
      flex: 0 0 auto;
    }

    .address-sheet__header h2 {
      flex: 1;
      margin: 0;
      font-size: 17px;
      line-height: 24px;
      font-weight: 600;
      text-align: center;
      letter-spacing: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .address-sheet__back,
    .address-sheet__spacer {
      width: 40px;
      height: 40px;
      flex: 0 0 40px;
    }

    .address-sheet__back {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: #141415;
    }

    .address-list-view,
    .address-form-view {
      min-height: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .address-list,
    .address-form {
      min-height: 0;
      flex: 1;
      overflow: auto;
      padding: 12px;
    }

    .address-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .address-loading {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
      color: #6f7071;
      font-size: 14px;
    }

    .address-card {
      background: #fff;
      border: 1px solid transparent;
      border-radius: 8px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 76px;
      gap: 8px;
      padding: 12px;
    }

    .address-card--active {
      border-color: rgba(0, 104, 255, 0.45);
      box-shadow: 0 1px 0 rgba(0, 104, 255, 0.05);
    }

    .address-card__select {
      min-width: 0;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      text-align: left;
    }

    .radio-mark {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 1.5px solid #cfd5dc;
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 22px;
      font-size: 10px;
      margin-top: 1px;
    }

    .address-card--active .radio-mark {
      background: #0068ff;
      border-color: #0068ff;
    }

    .address-card__body {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .address-card__name {
      color: #0d0d0d;
      font-size: 14px;
      line-height: 18px;
      font-weight: 700;
    }

    .address-card__name span {
      color: #6f7071;
      font-weight: 400;
      margin-left: 8px;
    }

    .address-card__detail {
      color: #6f7071;
      font-size: 13px;
      line-height: 18px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .address-card__default {
      width: fit-content;
      min-height: 22px;
      padding: 2px 8px;
      border-radius: 4px;
      background: #e8effc;
      color: #3459a7;
      font-size: 12px;
      line-height: 18px;
      font-weight: 600;
    }

    .address-card__actions {
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      gap: 4px;
    }

    .address-card__actions button {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      color: #6f7071;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
    }

    .address-card__actions button:active {
      background: #f2f3f5;
    }

    .address-empty {
      min-height: 280px;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      color: #6f7071;
    }

    .address-empty__icon {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: #fff;
      color: #a7a9ad;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      margin-bottom: 14px;
    }

    .address-empty strong {
      color: #0d0d0d;
      font-size: 16px;
      line-height: 22px;
      margin-bottom: 6px;
    }

    .address-empty p {
      max-width: 260px;
      margin: 0;
      font-size: 13px;
      line-height: 19px;
    }

    .address-sheet__footer {
      background: #fff;
      border-top: 1px solid #eef0f2;
      padding: 10px 12px max(10px, var(--zaui-safe-area-inset-bottom));
      flex: 0 0 auto;
    }

    .primary-button,
    .danger-button,
    .ghost-button {
      width: 100%;
      height: 44px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 15px;
      line-height: 20px;
      font-weight: 700;
    }

    .primary-button {
      background: #0068ff;
      color: #fff;
    }

    .danger-button {
      background: #e53935;
      color: #fff;
    }

    .ghost-button {
      border: 1px solid #dce1e5;
      background: #fff;
      color: #0d0d0d;
    }

    .address-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-bottom: 12px;
    }

    .form-section,
    .default-row {
      background: #fff;
      border-radius: 8px;
    }

    .form-section {
      padding: 14px 12px 4px;
    }

    .form-section h3 {
      margin: 0 0 12px;
      color: #0d0d0d;
      font-size: 14px;
      line-height: 18px;
      font-weight: 700;
    }

    .field,
    .location-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }

    .field span,
    .location-field > span {
      color: #6f7071;
      font-size: 12px;
      line-height: 16px;
      font-weight: 500;
    }

    .field input {
      width: 100%;
      height: 44px;
      border: 1px solid #e1e5ea;
      border-radius: 8px;
      background: #fff;
      padding: 0 12px;
      outline: 0;
      color: #0d0d0d;
      font-size: 14px;
    }

    .field input::placeholder {
      color: #a7a9ad;
    }

    .field input:focus {
      border-color: #0068ff;
    }

    .field__control--error,
    .location-field--error ::ng-deep,
    .location-field--error ::ng-deep input {
      border-color: #e53935 !important;
    }

    .field small,
    .location-field small {
      color: #e53935;
      font-size: 12px;
      line-height: 16px;
    }

    .form-error {
      margin: 4px 0 0;
      color: #e53935;
      font-size: 13px;
      line-height: 18px;
      text-align: center;
    }

    .location-field {
      position: relative;
    }

    .location-field app-location-dynamic {
      display: block;
      position: relative;
    }

    .location-field ::ng-deep app-location-dynamic .form-floating {
      height: 44px;
      margin: 0;
    }

    .location-field ::ng-deep app-location-dynamic .form-control {
      height: 44px;
      min-height: 44px;
      border: 1px solid #e1e5ea;
      border-radius: 8px;
      background: #fff;
      padding: 0 44px 0 12px !important;
      color: #0d0d0d;
      font-size: 14px;
      line-height: 44px;
      box-shadow: none;
    }

    .location-field ::ng-deep app-location-dynamic .form-control:focus {
      border-color: #0068ff;
      box-shadow: 0 0 0 2px rgba(0, 104, 255, 0.14);
    }

    .location-field ::ng-deep app-location-dynamic .form-control::placeholder {
      color: #a7a9ad;
      opacity: 1;
    }

    .location-field ::ng-deep app-location-dynamic .box_action_group {
      right: 14px;
      top: 50%;
      height: 20px;
      display: inline-flex;
      align-items: center;
      transform: translateY(-50%);
      color: #9ca3af;
      line-height: 1;
    }

    .location-field ::ng-deep app-location-dynamic .box_action_group i {
      color: #9ca3af;
      font-size: 16px;
      line-height: 1;
    }

    .location-field ::ng-deep app-location-dynamic .autoComplete_wrapper {
      position: relative;
    }

    .location-field ::ng-deep app-location-dynamic .group_header {
      margin-top: 4px;
      border-color: #e1e5ea !important;
      border-radius: 0 0 8px 8px;
      overflow: hidden;
      box-shadow: 0 8px 18px rgba(13, 13, 13, 0.08);
    }

    .location-field ::ng-deep app-location-dynamic .group_header .bg-light {
      background: #f7f8fa !important;
    }

    .location-field ::ng-deep app-location-dynamic .item-location {
      padding: 12px 20px !important;
      color: #0d0d0d;
      font-size: 14px;
      line-height: 20px;
    }

    .location-field ::ng-deep app-location-dynamic .box_displayList {
      height: 260px;
    }

    .default-row {
      min-height: 62px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      text-align: left;
    }

    .default-row strong,
    .default-row small {
      display: block;
    }

    .default-row strong {
      color: #0d0d0d;
      font-size: 14px;
      line-height: 18px;
      font-weight: 700;
    }

    .default-row small {
      margin-top: 2px;
      color: #6f7071;
      font-size: 12px;
      line-height: 16px;
    }

    .switch {
      width: 46px;
      height: 28px;
      border-radius: 999px;
      background: #dce1e5;
      padding: 3px;
      flex: 0 0 46px;
      transition: background 0.2s ease;
    }

    .switch span {
      display: block;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.16);
      transition: transform 0.2s ease;
    }

    .switch--on {
      background: #0068ff;
    }

    .switch--on span {
      transform: translateX(18px);
    }

    .delete-confirm-view {
      flex: 1;
      min-height: 320px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px 32px;
    }

    .delete-dialog {
      width: 100%;
      max-width: 320px;
      border-radius: 8px;
      background: #fff;
      padding: 24px 16px 16px;
      text-align: center;
      box-shadow: 0 12px 32px rgba(17, 24, 39, 0.14);
    }

    .delete-dialog__icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #ffeded;
      color: #e53935;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-bottom: 12px;
    }

    .delete-dialog h3 {
      margin: 0 0 8px;
      color: #0d0d0d;
      font-size: 18px;
      line-height: 24px;
      font-weight: 700;
    }

    .delete-dialog p {
      margin: 0 0 18px;
      color: #6f7071;
      font-size: 13px;
      line-height: 19px;
    }

    .delete-dialog__actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .type-row {
      background: #fff;
      border-radius: 8px;
      min-height: 56px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .type-row__label {
      color: #0d0d0d;
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
    }

    .type-segmented {
      display: flex;
      gap: 8px;
    }

    .type-btn {
      height: 34px;
      padding: 0 14px;
      border-radius: 6px;
      border: 1.5px solid #dce1e5;
      background: #fff;
      color: #6f7071;
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: border-color 0.15s, color 0.15s, background 0.15s;
      white-space: nowrap;
    }

    .type-btn i {
      font-size: 15px;
    }

    .type-btn--active {
      border-color: #0068ff;
      color: #0068ff;
      background: #e8effc;
    }

    .type-btn:active:not(.type-btn--active) {
      background: #f2f3f5;
    }

    @media (max-width: 360px) {
      .address-card {
        grid-template-columns: minmax(0, 1fr) 68px;
        padding: 10px;
      }

      .address-card__actions button {
        width: 31px;
      }
    }
  `]
})
export class AddressModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly addressCacheSer = inject(AddressCacheService);
  private readonly checkoutSvc = inject(CheckoutManageService);
  private readonly activeOffcanvas = inject(NgbActiveOffcanvas);

  /** id của địa chỉ đang được dùng cho đơn hàng hiện tại (nếu có) */
  @Input() activeId: number | null = null;
  @Input() checkoutSelectionOnly = false;

  addresses: IAddressItem[] = [];
  loading = false;
  saving = false;
  deleting = false;
  submitError = '';
  deleteError = '';

  screen: AddressModalScreen = 'list';
  editingAddress: IAddressItem | null = null;
  deleteTarget: IAddressItem | null = null;
  isTwoLevelAddress = false;
  submitted = false;
  form!: IAddressFormGroup;
  readonly locationPickerStyles = {'min-width': '100%', 'max-width': '100%'};

  ngOnInit(): void {
    this.loadAddresses(true);
  }

  get title(): string {
    if (this.screen === 'form') {
      return this.editingAddress ? 'Sửa địa chỉ' : 'Thêm địa chỉ nhận hàng';
    }
    if (this.screen === 'delete-confirm') return 'Xóa địa chỉ';
    return 'Chọn địa chỉ giao hàng';
  }

  get cityId(): number | undefined {
    const value = this.form?.get('location.cityId')?.value;
    return value == null ? undefined : value;
  }

  get districtId(): number | undefined {
    const value = this.form?.get('location.districtId')?.value;
    return value == null ? undefined : value;
  }

  get wardId(): number | undefined {
    const value = this.form?.get('location.wardId')?.value;
    return value == null ? undefined : value;
  }

  get locationGroup(): FormGroup {
    return this.form.get('location') as FormGroup;
  }

  get locationInvalid(): boolean {
    const value = this.locationGroup.value as IGroupLocation;
    if (this.isTwoLevelAddress) {
      return !(value?.cityId && value?.wardId);
    }
    return !(value?.cityId && value?.districtId && value?.wardId);
  }

  get locationErrorMessage(): string {
    if (!this.submitted) return '';

    const city = this.form.get('location.cityId');
    const district = this.form.get('location.districtId');
    const ward = this.form.get('location.wardId');

    if (city?.invalid) return 'Vui lòng chọn tỉnh/thành';
    if (!this.isTwoLevelAddress && district?.invalid) return 'Vui lòng chọn quận/huyện';
    if (ward?.invalid || this.locationInvalid) return 'Vui lòng chọn phường/xã';

    return 'Vui lòng chọn địa chỉ';
  }

  setType(value: AddressType): void {
    this.form.controls.type.setValue(value);
  }

  back(): void {
    if (this.screen !== 'list') {
      this.screen = 'list';
      this.deleteTarget = null;
      this.editingAddress = null;
      this.submitted = false;
      this.submitError = '';
      this.deleteError = '';
      return;
    }

    this.activeOffcanvas.dismiss('cancel');
  }

  openAdd(): void {
    this.editingAddress = null;
    this.submitted = false;
    this.submitError = '';
    this.buildForm();
    if (this.checkoutSelectionOnly) {
      this.form.controls.isDefault.setValue(false);
    }
    this.screen = 'form';
  }

  openEdit(addr: IAddressItem, event?: Event): void {
    event?.stopPropagation();
    this.editingAddress = addr;
    this.submitted = false;
    this.submitError = '';
    this.buildForm(addr);
    this.screen = 'form';
  }

  requestDelete(addr: IAddressItem, event?: Event): void {
    event?.stopPropagation();
    this.deleteTarget = addr;
    this.deleteError = '';
    this.screen = 'delete-confirm';
  }

  cancelDelete(): void {
    this.deleteTarget = null;
    this.deleteError = '';
    this.screen = 'list';
  }

  confirmDelete(): void {
    if (!this.deleteTarget?.id || this.deleting) return;

    const target = this.deleteTarget;
    const removedActive = this.isActive(target);

    this.deleting = true;
    this.deleteError = '';

    this.addressCacheSer.deleteAddress({id: target.id}).subscribe({
      next: () => {
        this.deleting = false;
        this.addresses = this.addresses.filter(a => a.id !== target.id);

        if (this.addresses.length > 0 && !this.addresses.some(a => a.isDefault === 1)) {
          const fallback = this.addresses[0];
          this.addressCacheSer.setDefaultAddress({id: fallback.id}).subscribe(() => {
            fallback.isDefault = 1;
          });
        }

        // Chỉ cần chọn lại địa chỉ khác cho checkout khi đúng địa chỉ đang dùng bị xoá.
        if (removedActive) {
          const nextDefault = this.addresses.find(a => a.isDefault === 1) ?? this.addresses[0] ?? null;
          this.activeId = nextDefault?.id ?? null;
          this.checkoutSvc.setSelectedAddressId(this.activeId);

          if (nextDefault) {
            this.applyAddressToCheckout(nextDefault);
          } else {
            this.checkoutSvc.clearCustomerAddress();
          }
        }

        this.deleteTarget = null;
        this.screen = 'list';
      },
      error: () => {
        this.deleting = false;
        this.deleteError = 'Xóa địa chỉ không thành công, vui lòng thử lại';
      },
    });
  }

  isActive(addr: IAddressItem): boolean {
    return this.activeId != null && addr.id === this.activeId;
  }

  getFullAddress(addr: IAddressItem): string {
    return [addr.address, addr.wardName, addr.districtName, addr.provinceName]
      .filter(Boolean)
      .join(', ');
  }

  onSelect(addr: IAddressItem, event?: Event): void {
    event?.stopPropagation();
    this.activeId = addr.id;
    this.checkoutSvc.setSelectedAddressId(addr.id);

    if (!this.checkoutSelectionOnly && addr.isDefault !== 1) {
      this.addressCacheSer.setDefaultAddress({id: addr.id}).subscribe();
    }
    this.applyAddressToCheckout(addr);
    this.activeOffcanvas.close(addr);
  }

  onLocationPicked(value: IGroupLocation): void {
    this.isTwoLevelAddress = !!value.isTwoLevel;
    this.form.controls.location.patchValue({
      cityId: value.cityId || null,
      districtId: value.districtId || null,
      wardId: value.wardId || null,
      cityName: value.cityName,
      districtName: value.districtName,
      wardName: value.wardName,
    });

    this.updateLocationValidators();
    this.checkoutSvc.setLocationValue(value);
  }

  toggleDefault(): void {
    this.form.controls.isDefault.setValue(!this.form.controls.isDefault.value);
  }

  showError(ctrlPath: string): boolean {
    const control = this.form.get(ctrlPath);
    return !!(control && control.invalid && (control.touched || control.dirty || this.submitted));
  }

  errorMsg(ctrlPath: string): string {
    const control = this.form.get(ctrlPath);
    if (!control?.errors) return '';
    if (control.errors['required']) return 'Bạn chưa điền đủ thông tin';
    if (control.errors['maxlength']) return 'Vượt quá độ dài cho phép';
    if (control.errors['pattern']) return 'Vui lòng nhập số điện thoại hợp lệ và không có khoảng trống';
    return 'Giá trị không hợp lệ';
  }

  showLocationError(): boolean {
    if (!this.form) return false;

    const city = this.form.get('location.cityId');
    const district = this.form.get('location.districtId');
    const ward = this.form.get('location.wardId');
    const interacted = this.submitted || city?.touched || city?.dirty || district?.touched || district?.dirty || ward?.touched || ward?.dirty;
    return !!(interacted && this.locationInvalid);
  }

  saveAddress(): void {
    this.submitted = true;
    this.submitError = '';

    if (this.form.invalid || this.locationInvalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.checkoutSelectionOnly && !this.editingAddress?.id) {
      this.form.controls.isDefault.setValue(false);
    }

    const raw = this.form.getRawValue();
    const payload: ICreateAddressParams = {
      recipientName: raw.recipientName,
      recipientPhone: raw.recipientPhone,
      address: raw.address,
      isDefault: raw.isDefault ? 1 : 0,
      type: raw.type,
      shipToCityLocationId: raw.location.cityId ?? undefined,
      shipToDistrictLocationId: raw.location.districtId ?? undefined,
      shipToWardLocationId: raw.location.wardId ?? undefined,
      provinceName: raw.location.cityName,
      districtName: raw.location.districtName,
      wardName: raw.location.wardName,
    };

    this.saving = true;

    const request$ = this.editingAddress?.id
      ? this.addressCacheSer.updateAddress({...payload, id: this.editingAddress.id} as IUpdateAddressParams)
      : this.addressCacheSer.createAddress(payload);

    request$.subscribe({
      next: (res: IResponseApi<IAddressItem>) => {
        this.saving = false;
        const saved = res.data;
        if (!saved) {
          this.submitError = 'Có lỗi xảy ra, vui lòng thử lại';
          return;
        }
        const appliedAddress: IAddressItem = {
          ...saved,
          recipientName: raw.recipientName,
          recipientPhone: raw.recipientPhone,
          address: raw.address,
          shipToCityLocationId: raw.location.cityId ?? saved.shipToCityLocationId,
          shipToDistrictLocationId: raw.location.districtId ?? saved.shipToDistrictLocationId,
          shipToWardLocationId: raw.location.wardId ?? saved.shipToWardLocationId,
          provinceName: raw.location.cityName || saved.provinceName,
          districtName: raw.location.districtName || saved.districtName,
          wardName: raw.location.wardName || saved.wardName,
          isDefault: saved.isDefault,
        };

        this.upsertLocalAddress(appliedAddress);

        // Chỉ đồng bộ vào checkout khi:
        // - địa chỉ này vừa trở thành địa chỉ MẶC ĐỊNH, hoặc
        // - đang sửa đúng địa chỉ hiện đang dùng cho đơn hàng, hoặc
        // - chưa có địa chỉ nào được chọn cho đơn hàng
        // => "thêm/sửa" một địa chỉ KHÁC không còn vô tình thay thế địa chỉ mặc định đang dùng để checkout.
        const shouldSyncToCheckout =
          appliedAddress.isDefault === 1 ||
          this.editingAddress?.id === this.activeId ||
          this.activeId == null;

        const defaultCheckoutAddress = this.addresses.find(a => a.isDefault === 1) ?? this.addresses[0] ?? null;

        if (shouldSyncToCheckout) {
          this.activeId = appliedAddress.id;
          this.checkoutSvc.setSelectedAddressId(appliedAddress.id);
          this.applyAddressToCheckout(appliedAddress);
          this.activeOffcanvas.close(appliedAddress);
          return;
        }

        if (this.checkoutSelectionOnly) {
          this.activeId = defaultCheckoutAddress?.id ?? null;
          this.checkoutSvc.setSelectedAddressId(this.activeId);
          if (defaultCheckoutAddress) {
            this.activeOffcanvas.close(defaultCheckoutAddress);
          } else {
            this.activeOffcanvas.close(null);
          }
          return;
        }

        this.activeOffcanvas.close(appliedAddress);
      },
      error: () => {
        this.saving = false;
        this.submitError = 'Có lỗi xảy ra, vui lòng thử lại';
      },
    });
  }

  private upsertLocalAddress(saved: IAddressItem): void {
    const idx = this.addresses.findIndex(a => a.id === saved.id);
    let next = idx >= 0
      ? this.addresses.map(a => (a.id === saved.id ? saved : a))
      : [...this.addresses, saved];

    if (saved.isDefault === 1) {
      next = next.map(a => (a.id === saved.id ? a : {...a, isDefault: 0 as const}));
    }

    this.addresses = next;
  }

  private loadAddresses(forceReload = false): void {
    this.loading = true;
    this.addressCacheSer.getAddressList(forceReload).subscribe({
      next: (list: IAddressItem[]) => {
        this.addresses = list;
        this.loading = false;
        this.ensureActiveAddress();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private buildForm(initial?: IAddressItem): void {
    this.isTwoLevelAddress = !!(initial?.shipToCityLocationId && !initial.shipToDistrictLocationId && initial.shipToWardLocationId);
    this.form = this.fb.group({
      recipientName: this.fb.nonNullable.control(initial?.recipientName ?? '', [Validators.required, Validators.maxLength(100)]),
      recipientPhone: this.fb.nonNullable.control(initial?.recipientPhone ?? '', [Validators.required, Validators.pattern(/^\d{9,11}$/)]),
      address: this.fb.nonNullable.control(initial?.address ?? '', [Validators.required, Validators.maxLength(255)]),
      isDefault: this.fb.nonNullable.control(initial ? initial.isDefault === 1 : !this.addresses.length),
      type: this.fb.nonNullable.control<AddressType>(initial?.type ?? ADDRESS_TYPE.HOME),
      location: this.fb.group({
        cityId: this.fb.control<number | null>(initial?.shipToCityLocationId ?? null, {validators: Validators.required}),
        districtId: this.fb.control<number | null>(initial?.shipToDistrictLocationId ?? null, {validators: Validators.required}),
        wardId: this.fb.control<number | null>(initial?.shipToWardLocationId ?? null, {validators: Validators.required}),
        cityName: this.fb.nonNullable.control(initial?.provinceName ?? ''),
        districtName: this.fb.nonNullable.control(initial?.districtName ?? ''),
        wardName: this.fb.nonNullable.control(initial?.wardName ?? ''),
      })
    }) as IAddressFormGroup;
    this.updateLocationValidators();
  }

  private updateLocationValidators(): void {
    const districtCtrl = this.form.get('location.districtId');
    const wardCtrl = this.form.get('location.wardId');

    if (this.isTwoLevelAddress) {
      districtCtrl?.clearValidators();
    } else {
      districtCtrl?.setValidators([Validators.required]);
    }
    wardCtrl?.setValidators([Validators.required]);

    districtCtrl?.updateValueAndValidity({emitEvent: false});
    wardCtrl?.updateValueAndValidity({emitEvent: false});
  }

  private ensureActiveAddress(): void {
    if (this.activeId != null && this.addresses.some(addr => addr.id === this.activeId)) {
      return;
    }

    const def = this.addresses.find(addr => addr.isDefault === 1);
    this.activeId = def?.id ?? this.addresses[0]?.id ?? null;
  }

  private applyAddressToCheckout(addr: IAddressItem): void {
    const address = this.getFullAddress(addr);
    const location: IGroupLocation = {
      cityId: addr.shipToCityLocationId ?? 0,
      districtId: addr.shipToDistrictLocationId ?? 0,
      wardId: addr.shipToWardLocationId ?? 0,
      cityName: addr.provinceName ?? '',
      districtName: addr.districtName ?? '',
      wardName: addr.wardName ?? '',
    };

    this.checkoutSvc.setCustomer({
      name: addr.recipientName,
      mobile: addr.recipientPhone,
      address,
    });

    this.checkoutSvc.setLocation(location);
    this.checkoutSvc.setLocationValue(location);
    this.checkoutSvc.setSelectedAddressId(addr.id);
    this.checkoutSvc.loadCarrier();
  }
}
