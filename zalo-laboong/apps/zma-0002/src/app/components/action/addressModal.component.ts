import {Component, inject, Input, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {IGroupLocation} from '@shared/components';
import {IAddress, IAddressForm} from '@shared/models/global';
import {CheckoutManageService, CustomerManageService} from '@shared/services/global';
import {fullAddress} from '@shared/utils';

type AddressModalScreen = 'list' | 'form' | 'delete-confirm';

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
          @if (addresses.length > 0) {
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
                        {{ addr.name }}
                        <span>{{ addr.mobile }}</span>
                      </span>
                      <span class="address-card__detail">{{ getFullAddress(addr) }}</span>
                      @if (addr.isDefault) {
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
                  formControlName="name"
                  placeholder="Nhập họ tên"
                  [class.field__control--error]="showError('name')"
                />
                @if (showError('name')) {
                  <small>{{ errorMsg('name') }}</small>
                }
              </label>

              <label class="field">
                <span>Số điện thoại</span>
                <input
                  type="tel"
                  formControlName="mobile"
                  inputmode="numeric"
                  maxlength="11"
                  autocomplete="tel"
                  placeholder="Nhập số điện thoại"
                  [class.field__control--error]="showError('mobile')"
                />
                @if (showError('mobile')) {
                  <small>{{ errorMsg('mobile') }}</small>
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
                  <small>Vui lòng chọn địa chỉ</small>
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

            <button class="default-row" type="button" (click)="toggleDefault()">
              <span>
                <strong>Đặt làm địa chỉ mặc định</strong>
                <small>Ưu tiên dùng địa chỉ này khi thanh toán</small>
              </span>
              <span class="switch" [class.switch--on]="form.controls.isDefault.value">
                <span></span>
              </span>
            </button>
          </main>

          <footer class="address-sheet__footer">
            <button class="primary-button" type="submit">
              {{ editingAddress ? 'Lưu thay đổi' : 'Hoàn thành' }}
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
            <p>Bạn có chắc chắn muốn xóa địa chỉ của {{ deleteTarget.name }} không?</p>
            <div class="delete-dialog__actions">
              <button type="button" class="ghost-button" (click)="cancelDelete()">Hủy</button>
              <button type="button" class="danger-button" (click)="confirmDelete()">Xóa</button>
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
      background: var(--brand-color, #0068ff);
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
    .location-field--error ::ng-deep .location-group__input,
    .location-field--error ::ng-deep input {
      border-color: #e53935 !important;
    }

    .field small,
    .location-field small {
      color: #e53935;
      font-size: 12px;
      line-height: 16px;
    }

    .location-field {
      position: relative;
    }

    .location-field app-location-dynamic {
      display: block;
      position: relative;
    }

    .location-field app-location-dynamic::after {
      content: '\\f078';
      font-family: "Font Awesome 6 Pro";
      font-weight: 900;
      position: absolute;
      right: 14px;
      top: 22px;
      color: #9ca3af;
      pointer-events: none;
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
  private readonly customerSer = inject(CustomerManageService);
  private readonly checkoutSvc = inject(CheckoutManageService);
  private readonly activeOffcanvas = inject(NgbActiveOffcanvas);

  @Input() addresses: IAddress[] = [];
  @Input() activeId: string | number | null = null;

  screen: AddressModalScreen = 'list';
  editingAddress: IAddress | null = null;
  deleteTarget: IAddress | null = null;
  submitted = false;
  form!: IAddressForm;
  readonly locationPickerStyles = {'min-width': '100%', 'max-width': '100%'};

  ngOnInit(): void {
    if (!this.addresses || this.addresses.length === 0) {
      this.addresses = this.customerSer.getAll() || [];
    }

    this.activeId = this.activeId != null ? String(this.activeId) : null;
    this.ensureActiveAddress();
    this.buildForm();
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
    return !(value?.cityId && value?.districtId && value?.wardId);
  }

  back(): void {
    if (this.screen !== 'list') {
      this.screen = 'list';
      this.deleteTarget = null;
      this.editingAddress = null;
      this.submitted = false;
      return;
    }

    this.activeOffcanvas.dismiss('cancel');
  }

  openAdd(): void {
    this.editingAddress = null;
    this.submitted = false;
    this.buildForm();
    this.screen = 'form';
  }

  openEdit(addr: IAddress, event?: Event): void {
    event?.stopPropagation();
    this.editingAddress = addr;
    this.submitted = false;
    this.buildForm(addr);
    this.screen = 'form';
  }

  requestDelete(addr: IAddress, event?: Event): void {
    event?.stopPropagation();
    this.deleteTarget = addr;
    this.screen = 'delete-confirm';
  }

  cancelDelete(): void {
    this.deleteTarget = null;
    this.screen = 'list';
  }

  confirmDelete(): void {
    if (!this.deleteTarget?.id) return;

    const removedActive = this.isActive(this.deleteTarget);
    this.customerSer.remove(this.deleteTarget.id);
    this.refreshAddresses();

    if (this.addresses.length > 0 && !this.addresses.some(addr => addr.isDefault)) {
      this.customerSer.setDefault(this.addresses[0].id);
      this.refreshAddresses();
    }

    const nextDefault = this.customerSer.getDefault() || this.addresses[0];
    this.activeId = nextDefault?.id ?? null;

    if (removedActive && nextDefault) {
      this.applyAddressToCheckout(nextDefault);
    }

    this.deleteTarget = null;
    this.screen = 'list';
  }

  isActive(addr: IAddress): boolean {
    return String(addr.id) === String(this.activeId);
  }

  getFullAddress(addr: IAddress): string {
    return fullAddress({address: addr.address, location: addr.location});
  }

  onSelect(addr: IAddress, event?: Event): void {
    event?.stopPropagation();
    this.activeId = addr.id;
    this.customerSer.setDefault(addr.id);
    this.applyAddressToCheckout(addr);
    this.activeOffcanvas.close(addr);
  }

  onLocationPicked(value: IGroupLocation): void {
    this.form.controls.location.patchValue({
      cityId: value.cityId,
      districtId: value.districtId,
      wardId: value.wardId,
      cityName: value.cityName,
      districtName: value.districtName,
      wardName: value.wardName,
    });

    if (typeof (this.checkoutSvc as any).setLocationValue === 'function') {
      (this.checkoutSvc as any).setLocationValue(value);
    }
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
    if (control.errors['pattern']) return 'Số điện thoại không hợp lệ';
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

    if (this.form.invalid || this.locationInvalid) {
      this.form.markAllAsTouched();
      return;
    }

    const saved = this.editingAddress?.id
      ? this.customerSer.update(this.editingAddress.id, this.form)
      : this.customerSer.add(this.form);

    if (!saved) return;

    this.customerSer.setDefault(saved.id);
    this.refreshAddresses();
    this.activeId = saved.id;
    this.applyAddressToCheckout(saved);
    this.activeOffcanvas.close(saved);
  }

  private buildForm(initial?: IAddress): void {
    this.form = this.fb.group({
      name: this.fb.nonNullable.control(initial?.name ?? '', [Validators.required, Validators.maxLength(100)]),
      mobile: this.fb.nonNullable.control(initial?.mobile ?? '', [Validators.required, Validators.pattern(/^\d{9,11}$/)]),
      address: this.fb.nonNullable.control(initial?.address ?? '', [Validators.required, Validators.maxLength(255)]),
      isDefault: this.fb.nonNullable.control(initial?.isDefault ?? !this.addresses.length),
      location: this.fb.group({
        cityId: this.fb.control<number | null>(initial?.location?.cityId ?? null, {validators: Validators.required}),
        districtId: this.fb.control<number | null>(initial?.location?.districtId ?? null, {validators: Validators.required}),
        wardId: this.fb.control<number | null>(initial?.location?.wardId ?? null, {validators: Validators.required}),
        cityName: this.fb.nonNullable.control(initial?.location?.cityName ?? ''),
        districtName: this.fb.nonNullable.control(initial?.location?.districtName ?? ''),
        wardName: this.fb.nonNullable.control(initial?.location?.wardName ?? ''),
      })
    }) as IAddressForm;
  }

  private ensureActiveAddress(): void {
    if (this.activeId && this.addresses.some(addr => String(addr.id) === String(this.activeId))) {
      return;
    }

    const def = this.customerSer.getDefault();
    if (def?.id) {
      this.activeId = def.id;
      return;
    }

    this.activeId = this.addresses[0]?.id ?? null;
  }

  private refreshAddresses(): void {
    this.addresses = this.customerSer.getAll() || [];
  }

  private applyAddressToCheckout(addr: IAddress): void {
    this.checkoutSvc.setCustomer({
      name: addr.name,
      mobile: addr.mobile,
      address: this.getFullAddress(addr),
    });

    this.checkoutSvc.setLocation(addr.location);
  }
}
