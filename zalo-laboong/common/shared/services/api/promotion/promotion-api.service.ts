import {Injectable} from '@angular/core';
import {ApiService} from '@core/services';
import {IInfoGameParams, IPromotionEvaluateData, IPromotionEvaluateParams, IResInfoGame} from '@shared/models/api';
import {IResponseApi} from '@core/models';
import {uriApiConst} from '@shared/constants';

@Injectable({
  providedIn: 'any',
})
export class PromotionApiService extends ApiService {
  getGameInfo(params: IInfoGameParams) {
    return this.post<IResponseApi<IResInfoGame>>(uriApiConst.game.gameInfo, params);
  }

  evaluate(params: IPromotionEvaluateParams) {
    return this.post<IResponseApi<IPromotionEvaluateData>>(uriApiConst.promotion.evaluate, params);
  }
}
