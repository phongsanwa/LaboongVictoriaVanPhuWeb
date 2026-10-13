import {Injectable} from '@angular/core';
import {ApiService} from '@core/services';
import {uriApiConst} from '@shared/constants';
import {IResponseApi} from '@core/models';
import {IResBanner} from '@shared/models/api';
import {BannerCode} from '../../../models/api';
@Injectable({
  providedIn: 'any',
})
export class BannerApiService extends ApiService {
  searchBanner(param: { positionCode?: BannerCode }) {
    return this.post<IResponseApi<IResBanner[]>>(uriApiConst.store.banner, param);
  }
}
