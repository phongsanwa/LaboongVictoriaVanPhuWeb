import { Component, Input, OnDestroy, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {IAddress, IAddressForm} from '@shared/models/global';
import {IGroupLocation} from '@shared/components';
import {CheckoutManageService, CustomerManageService} from '@shared/services/global';
import {Router} from '@angular/router';


@Component({
  selector: 'app-address-add',
  templateUrl: './address-add.component.html',
  styleUrls: [`./address-add.component.scss`],
  standalone: false,

})

export class AddressAddComponent extends AppCommonComponent implements OnInit, OnDestroy {
  @Input() initial?: IAddress;
  submitted = false;
  errors: Record<'name' | 'mobile' | 'location' | 'address', string> = {
    name: '', mobile: '', location: '', address: ''
  };
  form!: IAddressForm;
  constructor(
    private fb: FormBuilder,
    public checkoutSer: CheckoutManageService,
    private customerSer: CustomerManageService,
    private router: Router,
  ) {
    super();
  }



  ngOnInit() {
    this.setHeader({ variant: 'title', show: true, back: true, title: 'Thêm địa chỉ nhận hàng' });
    this.setFooter({ variant: 'tabs', show: false });

    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      mobile: ['', [Validators.required, Validators.pattern(/^\d{9,11}$/)]],
      address: ['', [Validators.required, Validators.maxLength(255)]],
      isDefault: [false],
      location: this.fb.group({
        cityId: [null, Validators.required],
        districtId: [null, Validators.required],
        wardId: [null, Validators.required],
        cityName: [''],
        districtName: [''],
        wardName: [''],
      })
    }) as IAddressForm;

    const id = String(this.navService.getParam('id') ?? '');

    if (id) {
      const found = this.customerSer.getById(id);
      if (found) {
        this.initial = found;
        this.form.patchValue(found);
        this.setHeader({ variant: 'title', show: true, back: true, title: 'Sửa địa chỉ' });
      }
    }
  }

  ngOnDestroy() {
    this.getDestroySubs();
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
    if (c.errors['pattern']) return 'Số điện thoại không hợp lệ';
    return 'Giá trị không hợp lệ';
  }


  showLocationError(): boolean {
    const city = this.form.get('location.cityId');
    const dist = this.form.get('location.districtId');
    const ward = this.form.get('location.wardId');
    const touched = (city?.touched || city?.dirty || dist?.touched || dist?.dirty || ward?.touched || ward?.dirty);
    const invalid = city?.invalid || dist?.invalid || ward?.invalid;
    return !!(touched && invalid);
  }

  get cityId(): number | undefined {
    const v = this.form?.get('location.cityId')?.value;
    return v == null ? undefined : v;
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



  onSubmit() {
    this.submitted = true;
    if (this.form.invalid || this.locationInvalid) {
      this.form.markAllAsTouched();
      return;
    }

    const data = this.form;
    const saved = this.initial?.id
      ? this.customerSer.update(this.initial.id, data)
      : this.customerSer.add(data);

    if (saved) {
      this.router.navigate(['/user/address']);
    }
  }

}
