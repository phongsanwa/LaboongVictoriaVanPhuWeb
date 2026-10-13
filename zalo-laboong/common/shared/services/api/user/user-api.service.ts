import {Injectable} from '@angular/core';
import {ApiService} from '@core/services';
import {
  IResPhoneNumber,
  ISendMessageZmaParams,
  IUserFeedBackRequestParams,
  IUserPhoneRequestParams
} from '../../../models/global';
import {IResponseApi} from '@core/models';
import {uriApiConst} from '../../../constants';

@Injectable({providedIn: 'root'})
export class UserApiService extends ApiService {

  getPhoneNumber = (params: IUserPhoneRequestParams) => {
    return this.post<IResponseApi<IResPhoneNumber>>(uriApiConst.user.phone, {...params});
  };

  sendFeedback = (params: IUserFeedBackRequestParams) => {
    return this.post<IResponseApi>(uriApiConst.user.feedback, params)
  }
}
