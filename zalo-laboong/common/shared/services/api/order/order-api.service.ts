import {Injectable} from '@angular/core';
import {ApiService} from '@core/services';
import {
  ICalculateFeeParams, ICheckVoucherParams,
  IPaymentHMACParams,
  IResCalculateFee, IResCheckVoucher, IResOrderList,
  ISaveOrderV2Params
} from '@shared/models/api';
import {IResDataDefault, IResponseApi} from '@core/models';
import {uriApiConst} from '@shared/constants';
import {
  IResOrderTracking, IResStatusTrackingOrder,
  IStatusTrackingOrderParams,
  ITrackingOrderDetailParams,
  ITrackingOrderParams
} from '@shared/models/api';

@Injectable({
  providedIn: 'any',
})
export class OrderApiService extends ApiService {
  /**
   * Calculate fee Nhanh
   * */
  calculateFee(params: ICalculateFeeParams) {
    return this.post<IResponseApi<IResCalculateFee[]>>(uriApiConst.order.calculateShipFee, params);
  }

  /**
   * Tạo đơn hàng
   * */
  saveOrder(params: ISaveOrderV2Params) {
    return this.post<IResponseApi<any>>(uriApiConst.order.saveOrder, params);
  }

  /**
   * Đăng ký HmacSHA256
   * */

  hmacOrder(params: IPaymentHMACParams) {
    return this.post<IResponseApi<any>>(uriApiConst.order.hmacOrder, params);
  }

  checkVoucher = (params: ICheckVoucherParams) => {
    return this.post<IResponseApi<IResCheckVoucher>>(uriApiConst.order.checkVoucher, params)
  }

  getTrackingOrder = (params: ITrackingOrderParams) => {
    const payload: Record<string, any> = {};
    if (params.mobile) payload['mobile'] = params.mobile;
    if (typeof params.status === 'number') payload['status'] = params.status;

    return this.post<IResponseApi<{ items: IResOrderList[] }>>(uriApiConst.order.tracking, payload);
  };

  getTrackingOrderDetail = (params: ITrackingOrderDetailParams) => {
    return this.post<IResponseApi<IResOrderTracking>>(uriApiConst.order.view, params);
  };

  cancelOrder = (id: number) => {
    return this.post<IResponseApi<{ id: number }>>(uriApiConst.order.cancel, {id: id});
  };

  getStatusTracking = (params: IStatusTrackingOrderParams) => {
    return this.post<IResponseApi<IResStatusTrackingOrder[]>>(uriApiConst.order.tracking, {...params});
  }
}
