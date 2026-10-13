import {AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {IGroupLocation} from '@shared/components';
import {CheckoutManageService} from '@shared/services/global';
import {AddressCacheService} from '@shared/services/api';
import {IAddressItem, ICreateAddressParams, IUpdateAddressParams, ADDRESS_TYPE, ADDRESS_TYPE_OPTIONS, AddressType} from '@shared/models/api';
import {Router} from '@angular/router';
import {uriFeConst} from '@shared/constants';

/**
 * Form nội bộ — phần `location` giữ nguyên shape IGroupLocation (cityId/districtId/
 * wardId/cityName/districtName/wardName) để tái sử dụng <app-location-dynamic>
 * không đổi. Khi submit sẽ map sang field API (shipTo*LocationId + province/
 * district/wardName).
 */
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
  selector: 'app-address-add',
  templateUrl: './address-add.component.html',
  styleUrls: [`./address-add.component.scss`],
  standalone: false,
})

export class AddressAddComponent extends AppCommonComponent implements OnInit, OnDestroy, AfterViewInit {
  submitted = false;
  addressId = 0;
  isEditMode = false;
  initial?: IAddressItem;
  form!: IAddressFormGroup;
  readonly ADDRESS_TYPE = ADDRESS_TYPE;
  readonly addressTypeOptions = ADDRESS_TYPE_OPTIONS;
  isCurrentDefault = false;

  setType(value: AddressType): void {
    this.form.controls.type.setValue(value);
  }

  errors: Record<'name' | 'mobile' | 'location' | 'address', string> = {
    name: '', mobile: '', location: '', address: ''
  };

  constructor(
    private fb: FormBuilder,
    private checkoutSer: CheckoutManageService,
    private addressCacheSer: AddressCacheService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {
    super();
  }

  ngAfterViewInit() {
    this.cdr.detectChanges(); // ✅ đảm bảo Angular re-check CSS + DOM ngay sau render
  }

  ngOnInit() {
    const idParam = this.navService.getParam('id');
    this.addressId = idParam ? Number(idParam) : 0;
    this.isEditMode = !!this.addressId;

    this.setHeader({variant: 'title', show: true, back: true, title: this.isEditMode ? 'Sửa địa chỉ' : 'Địa chỉ mới'});
    this.setFooter({variant: 'tabs', show: false});

    this.buildForm();

    if (this.isEditMode) {
      this.loadInitial(); 
    }
  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      recipientName: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
      recipientPhone: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\d{9,11}$/)]),
      address: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
      isDefault: this.fb.nonNullable.control(false),
      type: this.fb.nonNullable.control<AddressType>(ADDRESS_TYPE.HOME),
      location: this.fb.group({
        cityId: this.fb.control<number | null>(null, {validators: Validators.required}),
        districtId: this.fb.control<number | null>(null, {validators: Validators.required}),
        wardId: this.fb.control<number | null>(null, {validators: Validators.required}),
        cityName: this.fb.nonNullable.control(''),
        districtName: this.fb.nonNullable.control(''),
        wardName: this.fb.nonNullable.control(''),
      }),
    }) as IAddressFormGroup;
  }

  /** Sửa địa chỉ: lấy từ cache/list theo id rồi đổ vào form */
  private loadInitial(): void {
    this.addressCacheSer.getAddressList().subscribe((list: IAddressItem[]) => {
      this.initial = list.find(a => a.id === this.addressId);
      if (this.initial) {
        this.patchForm(this.initial);
      }
    });
  }

  private patchForm(item: IAddressItem): void {
    this.isCurrentDefault = item.isDefault === 1;
    this.form.patchValue({
      recipientName: item.recipientName ?? '',
      recipientPhone: item.recipientPhone ?? '',
      address: item.address ?? '',
      isDefault: item.isDefault === 1,
      type: item.type ?? ADDRESS_TYPE.HOME,
      location: {
        cityId: item.shipToCityLocationId ?? null,
        districtId: item.shipToDistrictLocationId ?? null,
        wardId: item.shipToWardLocationId ?? null,
        cityName: item.provinceName ?? '',
        districtName: item.districtName ?? '',
        wardName: item.wardName ?? '',
      },
    });
    if (this.isCurrentDefault) {
      this.form.controls.isDefault.disable();
    }
  }

  onLocationPicked(val: IGroupLocation): void {
    this.form.controls.location.patchValue({
      cityId: val.cityId,
      districtId: val.districtId,
      wardId: val.wardId,
      cityName: val.cityName,
      districtName: val.districtName,
      wardName: val.wardName,
    });
    this.locationGroup.markAsDirty();

    this.checkoutSer.setLocationValue(val);
  }

  showError(ctrlPath: string): boolean {
    const c = this.form.get(ctrlPath);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  errorMsg(ctrlPath: string): string {
    const c = this.form.get(ctrlPath);
    if (!c?.errors) return '';
    if (c.errors['required']) return 'Bạn chưa điền đủ thông tin';
    if (c.errors['maxlength']) return 'Vượt quá độ dài cho phép';
    if (c.errors['pattern']) return 'Vui lòng nhập số điện thoại hợp lệ và không có khoảng trống';
    return 'Giá trị không hợp lệ';
  }

  showLocationError(): boolean {
    const touched = this.submitted || this.locationGroup.touched || this.locationGroup.dirty;
    return touched && this.locationInvalid;
  }

  get cityId(): number | undefined {
    const v = this.form?.get('location.cityId')?.value;
    return v == null ? undefined : v; // chuyển null -> undefined
  }

  get districtId(): number | undefined {
    const v = this.form?.get('location.districtId')?.value;
    return v == null ? undefined : v;
  }

  get wardId(): number | undefined {
    const v = this.form?.get('location.wardId')?.value;
    return v == null ? undefined : v;
  }

  get locationGroup() {
    return this.form.get('location') as FormGroup;
  }

  get locationInvalid(): boolean {
    const v = this.locationGroup.value as IGroupLocation;
    return !(v?.cityId && v?.districtId && v?.wardId);
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid || this.locationInvalid) {
      this.form.markAllAsTouched();
      this.locationGroup.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const payload: ICreateAddressParams = {
      recipientName: raw.recipientName,
      recipientPhone: raw.recipientPhone,
      address: raw.address,
      isDefault: raw.isDefault ? 1 : 0,
      type: raw.type,
      // map location picker (cityId/cityName...) -> field API (shipTo*LocationId + provinceName...)
      shipToCityLocationId: raw.location.cityId ?? undefined,
      shipToDistrictLocationId: raw.location.districtId ?? undefined,
      shipToWardLocationId: raw.location.wardId ?? undefined,
      provinceName: raw.location.cityName,
      districtName: raw.location.districtName,
      wardName: raw.location.wardName,
    };

    const request$ = this.isEditMode
      ? this.addressCacheSer.updateAddress({...payload, id: this.addressId} as IUpdateAddressParams)
      : this.addressCacheSer.createAddress(payload);

    request$.subscribe({
      next: () => {
        this.notifyService.success(this.isEditMode ? 'Cập nhật địa chỉ thành công' : 'Thêm địa chỉ thành công');
        this.router.navigate([uriFeConst.user.address]);
      },
      error: () => {
        this.notifyService.error('Có lỗi xảy ra, vui lòng thử lại');
      },
    });
  }

  onDelete(): void {
    if (!this.addressId) return;

    const confirmDelete = confirm('Bạn có chắc muốn xoá địa chỉ này không?');
    if (!confirmDelete) return;

    this.addressCacheSer.deleteAddress({id: this.addressId}).subscribe(() => {
      this.router.navigate([uriFeConst.user.address]);
    });
  }

}