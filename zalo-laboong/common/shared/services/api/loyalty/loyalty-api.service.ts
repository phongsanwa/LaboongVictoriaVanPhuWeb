import {Injectable} from '@angular/core';
import {IResponseApi} from '@core/models';
import {ApiService} from '@core/services';
import {uriApiConst} from '@shared/constants';
import {ILoyaltyMe, ILoyaltyTiersRes, IPointHistoryRes, IPointSettings} from '@shared/models/api';

@Injectable({providedIn: 'root'})
export class LoyaltyApiService extends ApiService {
  getMyLoyalty = () => {
    return this.post<IResponseApi<ILoyaltyMe>>(uriApiConst.loyalty.me, {});
  };

  getTiers = () => {
    return this.post<IResponseApi<ILoyaltyTiersRes>>(uriApiConst.loyalty.tiers, {});
  };

  getPointSettings = () => {
    return this.post<IResponseApi<IPointSettings>>(uriApiConst.loyalty.settings, {});
  };

  getPointHistory = (page = 1, limit = 15) => {
    return this.post<IResponseApi<IPointHistoryRes>>(uriApiConst.loyalty.history, {page, limit});
  };
}
