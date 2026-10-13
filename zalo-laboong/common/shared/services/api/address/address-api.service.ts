import {Injectable} from '@angular/core';
import {ApiService} from '@core/services';
import {IResponseApi} from '@core/models';
import {uriApiConst} from '@shared/constants';
import {
  IAddressItem,
  IAddressVersion,
  ICreateAddressParams,
  IUpdateAddressParams,
  IDeleteAddressParams,
  ISetDefaultAddressParams,
} from '@shared/models/api';

@Injectable({
  providedIn: 'any',
})
export class AddressApiService extends ApiService {
  // Danh sách địa chỉ
  addressList = () => {
  return this.post<IResponseApi<IAddressItem[]>>(uriApiConst.address.list, {});
}

addressVersion = (params: {deviceId?: string} = {}) => {
  return this.post<IResponseApi<IAddressVersion>>(uriApiConst.address.version, params);
}

  // Thêm địa chỉ mới
  addressCreate = (params: ICreateAddressParams) => {
    return this.post<IResponseApi<IAddressItem>>(uriApiConst.address.create, params);
  }

  // Sửa địa chỉ
  addressUpdate = (params: IUpdateAddressParams) => {
    return this.post<IResponseApi<IAddressItem>>(uriApiConst.address.update, params);
  }

  // Xóa (ẩn) địa chỉ
  addressDelete = (params: IDeleteAddressParams) => {
    return this.post<IResponseApi<null>>(uriApiConst.address.delete, params);
  }

  // Đặt địa chỉ làm mặc định
  addressSetDefault = (params: ISetDefaultAddressParams) => {
    return this.post<IResponseApi<null>>(uriApiConst.address.setdefault, params);
  }
}