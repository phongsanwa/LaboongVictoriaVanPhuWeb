import {Injectable} from '@angular/core';
import {ApiService} from '@core/services';
import {IPaymentMethod} from '@shared/models/api';
import {IResponseApi} from '@core/models';
import {uriApiConst} from '@shared/constants';

@Injectable({
  providedIn: 'any',
})
export class PaymentApiService extends ApiService {
  getPaymentMethods$() {
    return this.post<IResponseApi<IPaymentMethod[]>>(uriApiConst.payment.index, {});
  }
}
