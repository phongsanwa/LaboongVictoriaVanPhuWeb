import {Injectable} from '@angular/core';

/**
 * Shape của response từ API settings (khi BE hỗ trợ).
 * Tất cả field đều optional — API chưa trả về field nào thì giữ default.
 */
export interface IShopSettingsApiResponse {
  /**
   * Cho phép user mua hàng kể cả khi sản phẩm hết tồn.
   * true  = cho phép mua (default)
   * false = chặn mua khi hết hàng
   */
  allowBuyWhenSoldOut?: boolean | null;
}

/**
 * Service lưu trữ các setting nghiệp vụ của shop (tách biệt với AppConfigStateService).
 *
 * Cách dùng:
 *  - Inject và đọc getter trực tiếp (sync, không cần Observable).
 *  - Khi API settings BE sẵn sàng: gọi setFromApiResponse(data) tại điểm bootstrap
 *    (app initializer hoặc ngOnInit của root component) để nạp giá trị thực.
 *  - Khi chưa có API: tất cả getter trả về giá trị mặc định (permissive).
 */
@Injectable({providedIn: 'root'})
export class AppShopSettingsService {

  /**
   * true  = cho phép mua hàng kể cả khi hết tồn (default — không chặn)
   * false = chặn mua khi sản phẩm hết tồn
   */
  private _allowBuyWhenSoldOut: boolean = true;

  /**
   * Nạp settings từ API response.
   * Chỉ ghi đè field nào API trả về (non-null); các field null/undefined giữ nguyên default.
   */
  setFromApiResponse(data: IShopSettingsApiResponse): void {
    if (data.allowBuyWhenSoldOut != null) {
      this._allowBuyWhenSoldOut = data.allowBuyWhenSoldOut;
    }
  }

  /**
   * true  = cho phép mua hàng kể cả khi hết tồn (default)
   * false = chặn mua khi sản phẩm hết tồn
   */
  get allowBuyWhenSoldOut(): boolean {
    return this._allowBuyWhenSoldOut;
  }
}
