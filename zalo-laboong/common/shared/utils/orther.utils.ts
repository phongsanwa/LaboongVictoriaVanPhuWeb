import {IAddressLocation} from '../models/global';
import {IResProduct, IResProductDetail} from '../models/api';
import {normalizeProductDetail} from './product.utils';


// Dùng để nối xã, quận(huyện), tỉnh -> full address
export function fullAddress(item: { address?: string; location?: IAddressLocation }): string {
  const parts: string[] = [];

  const addr = (item.address || '').trim();
  if (addr) parts.push(addr);

  const loc = item.location || {} as IAddressLocation;
  const locParts = [
    (loc.wardName || '').trim(),
    (loc.districtName || '').trim(),
    (loc.cityName || '').trim()
  ].filter(s => !!s);

  if (locParts.length) parts.push(locParts.join(', '));

  return parts.join(', ');
}

export function toProductDetail(product: IResProduct): IResProductDetail {
  return normalizeProductDetail(product);
}
