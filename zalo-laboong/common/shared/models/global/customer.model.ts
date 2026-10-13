import {FormControl, FormGroup} from '@angular/forms';

export interface IAddressLocation {
  cityId: number;
  districtId: number;
  wardId: number;
  cityName: string;
  districtName: string;
  wardName: string;
}

export interface IAddress {
  id: string;
  name: string;
  mobile: string;
  address: string;
  isDefault: boolean;
  location: IAddressLocation;
  createdAt: number;
  updatedAt: number;
}

export type IAddressForm = FormGroup<{
  name: FormControl<string>;
  mobile: FormControl<string>;
  address: FormControl<string>;
  isDefault: FormControl<boolean>;
  location: FormGroup<{
    cityId: FormControl<number | null>;
    districtId: FormControl<number | null>;
    wardId: FormControl<number | null>;
    cityName?: FormControl<string>;
    districtName?: FormControl<string>;
    wardName?: FormControl<string>;
  }>;
}>;
