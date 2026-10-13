import {Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {NgClass} from '@angular/common';
import {CheckoutManageService} from '@shared/services/global/checkout/checkout-manage.service';
import {IGroupLocation, LocationDynamicComponent} from '../../location-group';
import {IAddress, IAddressForm} from '../../../models/global';
import {CustomerManageService} from '../../../services/global';

@Component({
  selector: 'app-create-address',
  templateUrl: 'create-address-modal.component.html',
  styles: [`
    .sheet-body {
      height: 500px;
    }

    .btn-create__address {
      background-color: var(--brand-color);
      border-color: var(--brand-color);
    }
  `],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgClass,
    FormsModule,
    LocationDynamicComponent
  ]
})

export class CreateAddressModalComponent implements OnInit {
  @Input() initial?: IAddress;
  submitted = false;
  errors: Record<'name' | 'mobile' | 'location' | 'address', string> = {
    name: '', mobile: '', location: '', address: ''
  };

  form!: IAddressForm;
  selectedCityId?: number;
  selectedDistrictId?: number;
  selectedWardId?: number;
  isTwoLevelAddress = false;

  constructor(
    private fb: FormBuilder,
    private customerSer: CustomerManageService,
    public checkoutSer: CheckoutManageService,
    public active: NgbActiveOffcanvas,
  ) {
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
      mobile: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\d{9,11}$/)]),
      address: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
      isDefault: this.fb.nonNullable.control(false),
      location: this.fb.group({
        cityId: this.fb.control<number | null>(null, { validators: Validators.required }),
        districtId: this.fb.control<number | null>(null, { validators: Validators.required }),
        wardId: this.fb.control<number | null>(null, {validators: Validators.required}),
        cityName: this.fb.nonNullable.control(''),
        districtName: this.fb.nonNullable.control(''),
        wardName: this.fb.nonNullable.control(''),
      })
    }) as IAddressForm;

    if (this.initial) {
      this.selectedCityId = this.initial.location?.cityId ?? undefined;
      this.selectedDistrictId = this.initial.location?.districtId ?? undefined;
      this.selectedWardId = this.initial.location?.wardId ?? undefined;

      this.form.patchValue({
        name: this.initial.name ?? '',
        mobile: this.initial.mobile ?? '',
        address: this.initial.address ?? '',
        isDefault: !!this.initial.isDefault,
        location: {
          cityId: this.initial.location?.cityId ?? null,
          districtId: this.initial.location?.districtId ?? null,
          wardId: this.initial.location?.wardId ?? null,
          cityName: this.initial.location?.cityName ?? '',
          districtName: this.initial.location?.districtName ?? '',
          wardName: this.initial.location?.wardName ?? '',
        }
      });
    }
  }

  onLocationPicked(val: IGroupLocation): void {
    this.isTwoLevelAddress =
      !!val.isTwoLevel;
    this.form.controls.location.patchValue({
      cityId: val.cityId || null,
      districtId: val.districtId || null,
      wardId: val.wardId || null,
      cityName: val.cityName,
      districtName: val.districtName,
      wardName: val.wardName,
    });

    this.updateLocationValidators();

    this.checkoutSer.setLocationValue(val);
  }

  private updateLocationValidators(): void {

    const districtCtrl =
      this.form.get('location.districtId');

    const wardCtrl =
      this.form.get('location.wardId');

    // nếu chưa chọn district
    // coi là mode 2 cấp

    if (this.isTwoLevelAddress) {

      districtCtrl?.clearValidators();

    } else {

      districtCtrl?.setValidators([
        Validators.required
      ]);

    }

    wardCtrl?.setValidators([
      Validators.required
    ]);

    districtCtrl?.updateValueAndValidity({
      emitEvent: false
    });

    wardCtrl?.updateValueAndValidity({
      emitEvent: false
    });
  }

  showError(ctrlPath: string): boolean {
    const c = this.form.get(ctrlPath);
    return !!(c && c.invalid && this.submitted);
  }


  errorMsg(ctrlPath: string): string {
    const c = this.form.get(ctrlPath);
    if (!c?.errors) return '';
    if (c.errors['required']) return 'Bạn chưa điền đủ thông tin';
    if (c.errors['maxlength']) return 'Vượt quá độ dài cho phép';
    if (c.errors['pattern']) return 'Số điện thoại không hợp lệ';
    return 'Giá trị không hợp lệ';
  }

  get cityControl() {
    return this.form.get('location.cityId');
  }

  get districtControl() {
    return this.form.get('location.districtId');
  }

  get wardControl() {
    return this.form.get('location.wardId');
  }

  get locationErrorMessage(): string {

    if (!this.submitted) return '';

    if (this.cityControl?.invalid) {
      return 'Vui lòng chọn tỉnh/thành';
    }

    // mode 2 cấp
    if (this.isTwoLevelAddress) {

      if (this.wardControl?.invalid) {
        return 'Vui lòng chọn phường/xã';
      }

    }

    // mode 3 cấp
    else {

      if (this.districtControl?.invalid) {
        return 'Vui lòng chọn quận/huyện';
      }

      if (this.wardControl?.invalid) {
        return 'Vui lòng chọn phường/xã';
      }

    }

    return '';
  }

  // ----- getters tiện dùng trong template -----
  get name() {
    return this.form.get('name') as FormControl;
  }

  get mobile() {
    return this.form.get('mobile') as FormControl;
  }

  get address() {
    return this.form.get('address') as FormControl;
  }

  get locationGroup() {
    return this.form.get('location') as FormGroup;
  }

  get locationDisplay(): string {
    const v = this.locationGroup.value as IGroupLocation;
    const parts = [v?.wardName, v?.districtName, v?.cityName].filter(Boolean);
    return parts.join(', ');
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      (this.form.get('location') as FormGroup).markAllAsTouched();
      return;
    }
    const saved = this.initial?.id
      ? this.customerSer.update(this.initial.id, this.form)
      : this.customerSer.add(this.form);

    if (saved) {
      this.active.close(saved);
    }
  }

  onClose() {
    this.active?.dismiss('close');
  }
}
