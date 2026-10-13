import { Injectable } from '@angular/core';
import { ApiService } from '@core/services';
import { IResponseApi } from '@core/models';
import {uriApiConst} from '../../../constants';

export interface IZmaInitLoginParams {
  accessToken: string;
  businessId?: number;
}

export interface IZmaCompleteLoginParams {
  webAppId: string;
  accessToken: string;
  phoneGranted: number;
  phoneToken: string;
  businessId?: number;
}

export interface IZmaInitLoginResponse {
  webAppId: number;
  businessId: number;
  webAppUserId: string;
  name?: string | null;
  avatar?: string | null;
  needPhonePermission: boolean;
}

export interface IZmaCompleteLoginContext {
  type: string;
  webAppId: number;
  businessId: number;
  webAppUserId: string;
  phone: string;
}

export interface IZmaCompleteLoginResponse {
  token: string;
  expiresIn: number;
  context: IZmaCompleteLoginContext;
}

@Injectable({ providedIn: 'root' })
export class ZmaAuthApiService extends ApiService {
  initLogin(params: IZmaInitLoginParams) {
    return this.post<IResponseApi<IZmaInitLoginResponse>>(
      uriApiConst.zmaAuth.initLogin,
      params
    );
  }

  completeLogin(params: IZmaCompleteLoginParams) {
    return this.post<IResponseApi<IZmaCompleteLoginResponse>>(
      uriApiConst.zmaAuth.completeLogin,
      params
    );
  }

  logout() {
    return this.post<IResponseApi<any>>(uriApiConst.zmaAuth.logout, {});
  }
}
