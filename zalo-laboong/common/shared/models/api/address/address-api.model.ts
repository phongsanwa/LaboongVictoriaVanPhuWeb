export const ADDRESS_TYPE = {
  HOME:   1,
  OFFICE: 2,
} as const;

export type AddressType = typeof ADDRESS_TYPE[keyof typeof ADDRESS_TYPE];

export const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  [ADDRESS_TYPE.HOME]:   'Nhà Riêng',
  [ADDRESS_TYPE.OFFICE]: 'Văn Phòng',
};

export const ADDRESS_TYPE_ICONS: Record<AddressType, string> = {
  [ADDRESS_TYPE.HOME]:   'ph-light ph-house',
  [ADDRESS_TYPE.OFFICE]: 'ph-light ph-buildings',
};

export const ADDRESS_TYPE_OPTIONS: { value: AddressType; label: string; icon: string }[] = [
  { value: ADDRESS_TYPE.OFFICE, label: ADDRESS_TYPE_LABELS[ADDRESS_TYPE.OFFICE], icon: ADDRESS_TYPE_ICONS[ADDRESS_TYPE.OFFICE] },
  { value: ADDRESS_TYPE.HOME,   label: ADDRESS_TYPE_LABELS[ADDRESS_TYPE.HOME],   icon: ADDRESS_TYPE_ICONS[ADDRESS_TYPE.HOME] },
];

export interface IAddressItem {
  id: number;
  recipientName: string;
  recipientPhone: string;
  shipToCityLocationId?: number;
  shipToDistrictLocationId?: number;
  shipToWardLocationId?: number;
  provinceName?: string;
  districtName?: string;
  wardName?: string;
  address?: string;
  locationVer?: string;
  type?: AddressType;
  isDefault: 0 | 1;
  note?: string;
  status: 0 | 1;
  createdAt: number;
  updatedAt: number;
}

export interface IAddressVersion {
  maxUpdatedAt: number;
  total: number;
}

export interface ICreateAddressParams {
  recipientName: string;
  recipientPhone: string;
  shipToCityLocationId?: number;
  shipToDistrictLocationId?: number;
  shipToWardLocationId?: number;
  provinceName?: string;
  districtName?: string;
  wardName?: string;
  address?: string;
  locationVer?: string;
  type?: AddressType;
  isDefault?: 0 | 1;
  note?: string;
}

export interface IUpdateAddressParams extends ICreateAddressParams {
  id: number;
}

export interface IDeleteAddressParams {
  id: number;
}

export interface ISetDefaultAddressParams {
  id: number;
}