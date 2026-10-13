import { Injectable } from '@angular/core';
import { defer, from, Observable, of, share, tap, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import {
  getAppInfo,
  getUserInfo,
  authorize,
  getSetting,
  openPermissionSetting,
  Payment,
  getSystemInfo,
  nativeStorage,
  getPhoneNumber,
  getAccessToken,
  createShortcut,
  saveImageToGallery,
  openShareSheet,
  getUserID,
  followOA,
  EventName,
  events,
  CheckoutSDK,
} from 'zmp-sdk/apis';
import { GetSettingReturn } from 'zmp-sdk';
import { NotifyService } from '@core/services';
import { ShareZaloMiniAppParams } from '@core/models/zmp.model';
import {AllScope, IZmaGetPhoneNumberReturns} from '../../../shared/models/global';
import {UserApiService} from '../../../shared/services/api/user/user-api.service';

export interface PaymentChannel {
  method: string;
  subMethod?: string;
  subInfo?: string;
}

/** Cấu hình đầu vào cho selectPaymentMethod */
export interface SelectPaymentConfig {
  channels?: PaymentChannel[];
  selectedMethod?: { method: string; subMethod?: string };
}

/** Kết quả trả về từ selectPaymentMethod */
export type SelectPaymentMethodResult = {
  method: string;
  subMethod?: string;
  subInfo?: string;
} & Record<string, any>;

export interface SystemInfo {
  version: string;
  apiVersion: string;
  zaloVersion: string;
  platform: 'android' | 'iOS' | 'wp' | 'unknown' | '';
  language: string;
  zaloLanguage: string;
  zaloTheme: string;
}

export type TxnResult = { resultCode: number; msg?: string; [k: string]: any };
export type CreateOrderParams = {
  amount: number;
  item: Array<Record<string, any>>;
  desc: string;
  extradata?: string;
  method?: string;
  mac: string;
};

@Injectable({ providedIn: 'root' })
export class ZmpService {
  /** Key storage systemInfor */
  private STORAGE_SYSTEM_INFOR_KEY = 'SystemInfo';
  constructor(
    private userApi: UserApiService,
    private notify: NotifyService
  ) {}

  /** Lấy user Id Observable */
  getUserId$(): Observable<any> {
    return from(getUserID({}));
  }

  /** Lấy thông tin app dưới dạng Observable */
  getAppInfo$(): Observable<any> {
    return from(getAppInfo({}));
  }

  /** Lấy thông tin user dưới dạng Observable */
  getUserInfo$(): Observable<any> {
    return from(getUserInfo());
  }


  /** Lấy thông tin system dưới dạng Observable */
  getSystemInfo$(): Observable<SystemInfo> {
    return from(Promise.resolve(getSystemInfo()));
  }
  /** Lấy trạng thái cấp quyền hiện tại */
  getPermissionSettings$(): Observable<GetSettingReturn> {
    return from(getSetting({}));
  }

  /** Mở giao diện cài đặt quyền cho user */
  openPermissionSetting$(): Observable<any> {
    return from(openPermissionSetting({} as any));
  }

  /** Mở giao diện xin cấp quyền phone number */
  getPhoneNumber(): Observable<IZmaGetPhoneNumberReturns> {
    return from(getPhoneNumber({} as any)).pipe(
      map((res: { token?: string } | null | undefined) => {
        const token = res?.token;
        if (typeof token !== 'string' || !token) {
          throw new Error('getPhoneNumber() không trả về token hợp lệ');
        }
        return { token };
      })
    );
  }

  /** Lấy thông tin Access Token */
  getAccessToken$(): Observable<any> {
    return from(getAccessToken({}));
  }

  /** Mở giao diện xin cấp quyền sử dụng API */
  getAuthorize(scopes?: AllScope[]): Observable<Partial<Record<AllScope, boolean>>> {
    const args = scopes && scopes.length ? { scopes } : ({} as any);
    return from(authorize(args));
  }

  /** Mở giao diện Follow OA */
  onFollowOA(oaId: string): Observable<void> {
    return from(followOA({ id: oaId }));
  }

  /** Đồng bộ systemInfor */
  private fetchSystemInfo$(): Observable<SystemInfo> {
    try {
      const info = getSystemInfo();
      if (info instanceof Promise) {
        return from(info);
      }
      return of(info as SystemInfo);
    } catch (error) {
      console.error('Failed to get system info:', error);
      return of({} as SystemInfo);
    }
  }

  /** Lưu systemInfor vào storage */
  private saveSystemInfo$(info: SystemInfo) {
    return defer(() => {
      nativeStorage.setItem(this.STORAGE_SYSTEM_INFOR_KEY, JSON.stringify(info));
      return of(true);
    });
  }


  /** Lấy systemInfor từ storage */
  getStoredSystemInfo$(): Observable<SystemInfo | null> {
    return defer(() => {
      try {
        const value = nativeStorage.getItem(this.STORAGE_SYSTEM_INFOR_KEY);
        if (value) {
          const parsed = JSON.parse(value) as SystemInfo;
          return of(parsed);
        }
        return of(null);
      } catch (error) {
        console.warn('Failed to get system info from storage:', error);
        return of(null);
      }
    });
  }

  /** Update lại nếu có SystemInfor thay đổi */
  updateSystemInfoIfChanged$(): Observable<SystemInfo | null> {
    return this.fetchSystemInfo$().pipe(
      switchMap(newInfo =>
        this.getStoredSystemInfo$().pipe(
          switchMap(oldInfo => {
            if (!oldInfo || JSON.stringify(oldInfo) !== JSON.stringify(newInfo)) {
              return this.saveSystemInfo$(newInfo).pipe(switchMap(() => of(newInfo)));
            }
            return of(oldInfo);
          })
        )
      )
    );
  }

  /** Khởi tạo để gọi ra AppComponent khi chạy app */
  initSystemInfo$(): Observable<SystemInfo | null> {
    return this.getStoredSystemInfo$().pipe(
      switchMap(info => {
        if (!info) {
          return this.fetchSystemInfo$().pipe(
            switchMap(newInfo =>
              this.saveSystemInfo$(newInfo).pipe(switchMap(() => of(newInfo)))
            )
          );
        } else {
          return this.updateSystemInfoIfChanged$();
        }
      }),
      tap(info => console.log('System info here:', info))
    );
  }


  /**
   * Xin các scope cần thiết và trả về map scope=>granted
   * Áp dụng Best Practices:
   * 1) Dùng getSetting() để kiểm tra trước
   * 2) Chỉ request các scope thiếu, giải thích rõ lý do
   * 3) Bắt lỗi code -201 khi user từ chối
   * @param scopes Mảng các scope thuộc AllScope
   */
  authorizeScopes$(
    scopes: AllScope[]
  ): Observable<Record<AllScope, boolean>> {
    return from(getSetting({})).pipe(
      switchMap((settings: GetSettingReturn) => {
        // Cast authSetting thành kiểu mở rộng
        const authSetting = settings.authSetting as Partial<Record<AllScope, boolean>>;
        // Lọc các scope chưa được cấp
        const toRequest = scopes.filter(scope => !authSetting[scope]);
        if (!toRequest.length) {
          // Đã có đủ quyền
          return of(authSetting as Record<AllScope, boolean>);
        }
        // Yêu cầu cấp quyền cho các scope thiếu
        return from(authorize({ scopes: toRequest as AllScope[] })).pipe(
          map((result) => ({ ...authSetting, ...result } as Record<AllScope, boolean>)),
          catchError((error: any) => {
            const code = error.code;
            if (code === -201) {
              console.warn('Người dùng đã từ chối cấp quyền cho', toRequest);
            } else {
              console.error('Lỗi khi yêu cầu cấp quyền', error);
            }
            // Trả về authSetting cũ nếu lỗi
            return of(authSetting as Record<AllScope, boolean>);
          })
        );
      })
    );
  }

  authorizeAndFetchUser$(
    scopes: AllScope[]
  ): Observable<{
    perms: Record<AllScope, boolean>;
    userInfo: any | null;
  }> {
    return this.authorizeScopes$(scopes).pipe(
      switchMap(perms => {
        const allGranted = scopes.every(s => perms[s]);
        if (!allGranted) {
          // nếu thiếu thì thôi, trả về luôn
          return of({ perms, userInfo: null });
        }
        // nếu đã được cấp hết, gọi getUserInfo()
        return from(getUserInfo()).pipe(
          map(res => ({
            perms,
            userInfo: res.userInfo
          })),
          catchError(err => {
            console.error('Lỗi getUserInfo()', err);
            return of({ perms, userInfo: null });
          })
        );
      })
    );
  }

  /** Lấy danh sách method */
  selectMethod$(config?: SelectPaymentConfig): Observable<SelectPaymentMethodResult> {
    const args = this.normalizeConfig(config);
    return from(Payment.selectPaymentMethod(args as any)).pipe(
      catchError(err => throwError(() => err))
    );
  }

  /** Tạo order thanh toán qua Checkout SDK */
  createOrder$(params: CreateOrderParams): Observable<any> {
    return from(Payment.createOrder(params as any)).pipe(
      catchError(err => throwError(() => err))
    );
  }

  // Chuẩn hoá tham số cho SDK
  private normalizeConfig(config?: SelectPaymentConfig) {
    if (!config) return {};
    const args: any = {};
    if (config.channels?.length) {
      args.channels = config.channels.map(c => ({
        method: String(c.method),
        ...(c.subMethod ? { subMethod: String(c.subMethod) } : {}),
        ...(c.subInfo   ? { subInfo:   String(c.subInfo)   } : {}),
      }));
    }
    if (config.selectedMethod) {
      args.selectedMethod = {
        method: String(config.selectedMethod.method),
        ...(config.selectedMethod.subMethod ? { subMethod: String(config.selectedMethod.subMethod) } : {}),
      };
    }
    return args;
  }

  //tạo shortcut lên màn hình điện thoại
  createShortcut$(params?: Record<string, string>) {
    return from(createShortcut()).pipe(
      tap(() => this.notify.success('Shortcut đã được tạo thành công!')),
      catchError(err => {
        this.notify.error('Đã xảy ra lỗi khi tạo shortcut. Vui lòng thử lại.');
        return throwError(() => err);
      })
    );
  }

  //tải ảnh về máy
  downloadImageToGallery$(imageUrl: string) {
    return from(
      saveImageToGallery({
        imageUrl,
      })
    ).pipe(
      tap(() => {
        this.notify.success("Tải ảnh thành công");
      }),
      catchError((error) => {
        this.notify.error("Lỗi tải về. Vui lòng thử lại.");
        return throwError(() => error);
      })
    );
  }

  //chia sẻ app cho bạn bè
  shareZaloMiniApp$(params: ShareZaloMiniAppParams) {
    return from(
      openShareSheet({
        type: 'zmp',
        data: {
          title: params.title,
          description: params.description ?? '',
          thumbnail: params.thumbnail ?? '',
        },
      })
    ).pipe(
      tap(() => {
        this.notify.success('Chia sẻ Mini App thành công!');
      }),
      catchError((error) => {
        this.notify.error('Không thể chia sẻ. Vui lòng thử lại.');
        return throwError(() => error);
      })
    );
  }

  // Nhận trạng thái thanh toán
  readonly paymentDone$: Observable<any> = defer(() =>
    new Observable<any>((subscriber) => {
      const handler = (data: any) => subscriber.next(data);
      events.on(EventName.PaymentDone, handler);
      return () => events.off(EventName.PaymentDone, handler);
    })
  ).pipe(share());

  checkTransaction$(data: any): Observable<TxnResult> {
    return from(CheckoutSDK.checkTransaction({ data })) as Observable<TxnResult>;
  }

  purchaseAndCheck$(params: {
    desc: string;
    amount: number;
    method: string;
  }): Observable<TxnResult> {
    return new Observable<TxnResult>((observer) => {

      try {
        CheckoutSDK.purchase({
          desc: params.desc,
          amount: params.amount,
          method: params.method,
          success: (data: any) => {

            CheckoutSDK.checkTransaction({ data })
              .then((result: TxnResult) => {
                observer.next(result);
                observer.complete();
              })
              .catch((err: any) => {
                observer.error(err);
              });
          },
          fail: (err: any) => {
            observer.next({
              resultCode: -1,
              msg: 'Thanh toán thất bại hoặc bị hủy',
            } as TxnResult);
            observer.complete();
          },
        });
      } catch (e) {
        observer.next({
          resultCode: -1,
          msg: 'Không thể mở màn hình thanh toán',
        } as TxnResult);
        observer.complete();
      }

      return () => {
        console.log('[purchaseAndCheck$] unsubscribe / teardown');
      };
    });
  }
}
