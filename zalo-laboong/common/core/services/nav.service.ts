import { Injectable } from "@angular/core";
import { ActivatedRoute, NavigationExtras, Params, QueryParamsHandling, Router } from "@angular/router";

@Injectable({
  providedIn: 'root',
})
export class NavService {
  constructor(
    private _router: Router,
    private _activatedRoute: ActivatedRoute
  ) {
  }

  subQueryParams() {
    return this._activatedRoute.queryParams;
  }

  getParam(param: string) {
    return this._activatedRoute.snapshot.queryParams[param]
  }

  getParams() {
    return this._activatedRoute.snapshot.queryParams;
  }

  private getParamsTrack(params: any) {
    for (const param in this._activatedRoute.snapshot.queryParams) {
      if (this._activatedRoute.snapshot.queryParams[param])
        if (params[param]) {
          params[param] = this._activatedRoute.snapshot.queryParams[param];
        }
    }
  }

  /**
   * Thay thế lại toàn bộ params
   * */
  setParams(params = {}, paramsHandling: QueryParamsHandling = '', fromPage?: any) {
    this._router.navigate([], {
      relativeTo: this._activatedRoute,
      queryParams: params,
      queryParamsHandling: paramsHandling,
      replaceUrl: true
    }).catch(() => {
    });
  }

  /**
   * Thêm hoặc sửa nhiều param
   * */
  addParams(params: Params) {
    const currentParams = this.getParams();
    this.setParams({...currentParams,...params})
  }

  /**
   * Xóa params khỏi url
   * */
  removeParams(params: string[]) {
    if (!params || !params.length){
      return;
    }

    const urlTree = this._router.parseUrl(this._router.url);
    const queryParams = this._activatedRoute.snapshot.queryParams;
    const newParams = {...queryParams};
    for (const par of params){
      if (newParams[par]){
        delete urlTree.queryParams[par];
      }
    }

    this._router.navigateByUrl(urlTree.toString()).catch(() => {
      // Xử lý lỗi nếu có
    });
  }

  /**
   * Điều hướng đến một route theo mảng commands và các tuỳ chọn NavigationExtras.
   *
   * @param commands   - Mảng segments xác định route (có thể là absolute ['/a','b'] hoặc relative ['../','c'])
   * @param extras     - Các tuỳ chọn như:
   *                     • queryParams: object của query string
   *                     • queryParamsHandling: 'merge' | 'preserve' | ''
   *                     • replaceUrl: true để thay thế history thay vì push
   *                     • skipLocationChange: true để không thay đổi URL trên trình duyệt
   */
  redirect(commands: any[], extras?: NavigationExtras) {
    this._router.navigate(commands, extras).then();
  }

  /**
   * Điều hướng trực tiếp đến một URL đầy đủ (string), bao gồm cả path và query params.
   *
   * @param routerUrl  - Chuỗi URL tuyệt đối hoặc tương đối, ví dụ '/orders/123?foo=bar'
   */
  redirectByUrl(routerUrl: string) {
    this._router.navigateByUrl(routerUrl.toString()).then()
  }

  get currentUri(): string {
    return this._router.url;
  }
}
