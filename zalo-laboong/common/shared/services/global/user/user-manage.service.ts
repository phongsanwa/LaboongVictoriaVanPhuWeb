import {inject, Injectable} from '@angular/core';
import {ZmpService} from '@core/services';
import {AllScope, IResPhoneNumber, IUserPhoneRequestParams} from '../../../models/global';
import {catchError, from, Observable, of} from 'rxjs';
import {getAccessToken, getPhoneNumber, getSetting, getUserInfo} from 'zmp-sdk/apis';
import {map, switchMap} from 'rxjs/operators';
import {GetSettingReturn} from 'zmp-sdk/';
import {IResponseApi} from '@core/models';
import {UserApiService} from '../../api/user/user-api.service';
import {ZmaAuthApiService} from '../../api/zma/zma-api.service';
import {ENVIRONMENT} from '@core/tokens/environment.token';

@Injectable({providedIn: 'root'})
export class UserManageService {
  private zmaService = inject(ZmpService);
  private userApi = inject(UserApiService);
  private zmaAuthApi = inject(ZmaAuthApiService);
  private env = inject(ENVIRONMENT);

  private readonly webAppId = String(this.env.apiConfig?.webAppId ?? '');

  /**
   * Xin các scope cần thiết và trả về map scope=>granted
   * Áp dụng Best Practices:
   * 1) Dùng getSetting() để kiểm tra trước
   * 2) Chỉ request các scope thiếu, giải thích rõ lý do
   * 3) Bắt lỗi code -201 khi user từ chối
   * @param scopes Mảng các scope thuộc AllScope
   */
  authorizeScopes$(scopes: AllScope[]): Observable<Record<AllScope, boolean>> {
    return from(getSetting({} as any)).pipe(
      switchMap((settings: GetSettingReturn) => {
        const authSetting = (settings?.authSetting ?? {}) as Partial<Record<AllScope, boolean>>;
        const toRequest = scopes.filter((s) => !authSetting[s]);

        if (!toRequest.length) {
          return of(authSetting as Record<AllScope, boolean>);
        }

        return this.zmaService.getAuthorize(toRequest as AllScope[]).pipe(
          map((result) => ({...authSetting, ...result} as Record<AllScope, boolean>)),

          switchMap(() => from(getSetting({} as any))),
          map((re) => (re?.authSetting ?? {}) as Record<AllScope, boolean>),

          catchError((error: any) => {
            const code = error?.code;
            if (code === -201) {
              console.warn('[authorizeScopes$] User từ chối cấp quyền cho:', toRequest);
            } else {
              console.error('[authorizeScopes$] Lỗi authorize()', error);
            }
            return of(authSetting as Record<AllScope, boolean>);
          })
        );
      })
    );
  }

  authorizeAndFetchUser$(scopes: AllScope[]): Observable<{
    perms: Record<AllScope, boolean>;
    userInfo: any | null;
  }> {
    return this.authorizeScopes$(scopes).pipe(
      switchMap((perms) => {
        const allGranted = scopes.every((s) => !!perms[s]);
        if (!allGranted) {
          return of({perms, userInfo: null});
        }
        return from(getUserInfo({ autoRequestPermission: true })).pipe(
          map((res: any) => {
            console.log('[authorizeAndFetchUser$] getUserInfo raw response:', JSON.stringify(res));
            return {perms, userInfo: res?.userInfo ?? null};
          }),
          catchError((err) => {
            console.error('[authorizeAndFetchUser$] getUserInfo error:', err);
            return of({perms, userInfo: null});
          })
        );
      })
    );
  }

  /**
   * authorize & getUserInfo
   * nếu có scope.userPhonenumber → mở getPhoneNumber, lấy code
   * lấy access_token, build payload ký HMAC
   * gọi BE để đổi ra phoneNumber, merge vào userInfo
   */
  grantPermissionAndFetchUser$(scopes: AllScope[]) {
    return this.authorizeAndFetchUser$(scopes).pipe(
      switchMap(({perms, userInfo}) => {
        if (!userInfo) {
          return of({perms, userInfo: null});
        }

        return this.zmaService.getPhoneNumber().pipe(
          switchMap(({token}) =>
            from(getAccessToken()).pipe(
              switchMap((accessToken: string) =>
                this.userApi
                  .getPhoneNumber({access_token: accessToken, code: token} as IUserPhoneRequestParams)
                  .pipe(
                    map((res: IResponseApi<IResPhoneNumber>) => {
                      if (!res?.code) return {perms, userInfo};
                      const phone = res?.data?.phone;
                      if (!phone) return {perms, userInfo};
                      const updatedUser = {...userInfo, phoneNumber: phone};
                      return {perms, userInfo: updatedUser};
                    })
                  )
              )
            )
          ),
          catchError(() => of({perms, userInfo}))
        );
      }),
      catchError(() => of(null))
    );
  }

  /**
   * LOCAL dev flow: thay vì gọi Zalo SDK, dùng pre-shared fake tokens từ env.localDev.fakeZalo
   * để gọi BE initLogin + completeLogin thật → nhận JWT thật.
   * Fake tokens phải khớp với 'local_dev' block trong web-app-be/config/autoload/web.development.php.
   */
  private grantPermissionAndLoginLocal$(): Observable<{
    perms: Record<AllScope, boolean>;
    userInfo: any | null;
    token: string | null;
    authContext: any | null;
  }> {
    const localDev = this.env.localDev;
    const mockPerms = {'scope.userInfo': true, 'scope.userPhonenumber': true} as Record<AllScope, boolean>;

    if (!localDev?.fakeZalo?.accessToken) {
      console.error('[UserManageService][LOCAL] env.localDev.fakeZalo chưa được config');
      return of({perms: mockPerms, userInfo: null, token: null, authContext: null});
    }

    const fakeAccessToken = localDev.fakeZalo.accessToken;
    const fakePhoneToken  = localDev.fakeZalo.phoneToken;
    const mockUserInfo    = {...localDev.fakeZalo.userInfo, phoneNumber: localDev.fakeZalo.phoneNumber};

    console.info('[UserManageService][LOCAL] Gọi BE với fake tokens (bỏ qua Zalo SDK)');

    return this.zmaAuthApi.initLogin({accessToken: fakeAccessToken}).pipe(
      switchMap((initRes) => {
        if (!initRes?.code || !initRes.data) {
          console.warn('[UserManageService][LOCAL] initLogin failed', initRes);
          return of({perms: mockPerms, userInfo: mockUserInfo, token: null, authContext: null});
        }

        return this.zmaAuthApi.completeLogin({
          webAppId: this.webAppId,
          accessToken: fakeAccessToken,
          phoneGranted: 1,
          phoneToken: fakePhoneToken,
        }).pipe(
          map((loginRes) => {
            if (!loginRes?.code || !loginRes.data?.token) {
              console.warn('[UserManageService][LOCAL] completeLogin failed', loginRes);
              return {perms: mockPerms, userInfo: mockUserInfo, token: null, authContext: null};
            }

            const raw = loginRes.data.context ?? null;
            const authContext = raw ? {
              type: raw.type as any,
              webAppId: raw.webAppId,
              businessId: raw.businessId,
              webAppUserId: raw.webAppUserId,
            } : null;

            console.info('[UserManageService][LOCAL] Login thành công — JWT thật nhận được');
            return {
              perms: mockPerms,
              userInfo: {...mockUserInfo, phoneNumber: raw?.phone ?? localDev.fakeZalo.phoneNumber},
              token: loginRes.data.token,
              authContext,
            };
          }),
          catchError((err) => {
            console.error('[UserManageService][LOCAL] completeLogin error', err);
            return of({perms: mockPerms, userInfo: mockUserInfo, token: null, authContext: null});
          })
        );
      }),
      catchError((err) => {
        console.error('[UserManageService][LOCAL] initLogin error', err);
        return of({perms: mockPerms, userInfo: mockUserInfo, token: null, authContext: null});
      })
    );
  }

  grantPermissionAndLogin$(scopes: AllScope[]): Observable<{
    perms: Record<AllScope, boolean>;
    userInfo: any | null;
    token: string | null;
    authContext: any | null;
  }> {
    // Local dev: skip Zalo SDK (không hoạt động ngoài môi trường Zalo thật)
    if (!this.env.production) {
      return this.grantPermissionAndLoginLocal$();
    }

    return this.authorizeAndFetchUser$(scopes).pipe(
      switchMap(({perms, userInfo}) => {
        if (!userInfo) {
          return of({
            perms,
            userInfo: null,
            token: null,
            authContext: null,
          });
        }

        return from(getAccessToken()).pipe(
          switchMap((accessToken: string) => {
              return this.zmaAuthApi.initLogin({
                accessToken,
              }).pipe(
                switchMap((initLoginRes) => {
                  console.log('[UserManageService] initLogin response:', JSON.stringify(initLoginRes));
                  if (!initLoginRes?.code || !initLoginRes.data) {
                    console.warn('[UserManageService] initLogin failed — code:', initLoginRes?.code, 'data:', initLoginRes?.data);
                    return of({
                      perms,
                      userInfo,
                      token: null,
                      authContext: null,
                    });
                  }
                  console.log('[UserManageService] initLogin success, calling getPhoneNumber...');
                  return from(getPhoneNumber({} as any)).pipe(
                    map((res: { token?: string } | null | undefined) => {
                      const phoneToken = res?.token;
                      if (!phoneToken) {
                        throw new Error('getPhoneNumber() không trả về token hợp lệ');
                      }
                      return phoneToken;
                    }),
                    switchMap((phoneToken: string) => {
                      console.log('[UserManageService] getPhoneNumber OK, phoneToken length:', phoneToken?.length);
                      console.log('[UserManageService] Calling completeLogin with:', {
                        webAppId: this.webAppId,
                        phoneGranted: 1,
                        phoneToken: phoneToken?.substring(0, 20) + '...'
                      });
                      return this.zmaAuthApi.completeLogin({
                        webAppId: this.webAppId,
                        accessToken,
                        phoneGranted: 1,
                        phoneToken,
                      }).pipe(
                        map((loginRes) => {
                          console.log('[UserManageService] completeLogin response:', JSON.stringify(loginRes));
                          if (!loginRes?.code || !loginRes.data?.token) {
                            console.warn('[UserManageService] completeLogin failed — code:', loginRes?.code, 'hasToken:', !!loginRes?.data?.token);
                            return {
                              perms,
                              userInfo,
                              token: null,
                              authContext: null,
                            };
                          }

                          const raw = loginRes.data.context ?? null;
                          const phone = raw?.phone ?? null;
                          console.log('[UserManageService] completeLogin success — phone:', phone, 'context:', raw);

                          const authContext = raw ? {
                            type: raw.type as any,
                            webAppId: raw.webAppId,
                            businessId: raw.businessId,
                            webAppUserId: raw.webAppUserId,
                          } : null;

                          const updatedUserInfo = phone
                            ? {...userInfo, phoneNumber: phone}
                            : userInfo;
                          console.log('[UserManageService] updatedUserInfo:', updatedUserInfo);

                          return {
                            perms,
                            userInfo: updatedUserInfo,
                            token: loginRes.data.token,
                            authContext,
                          };
                        })
                      );
                    })
                  );
                })
              )
            }
          ),
          catchError((err) => {
            return of({
              perms,
              userInfo,
              token: null,
              authContext: null,
            });
          })
        );
      }),
      catchError((err) => {
        return of({
          perms: {} as Record<AllScope, boolean>,
          userInfo: null,
          token: null,
          authContext: null,
        });
      })
    );
  }

  /**
   * Dùng để dubug trên app production
   */

  // grantPermissionAndFetchUser$(scopes: AllScope[]) {
  //   console.log('[UserMS] grantPermissionAndFetchUser$ start', { scopes });
  //
  //   return this.authorizeAndFetchUser$(scopes).pipe(
  //     tap(({ perms, userInfo }) => {
  //       console.log('[UserMS] authorizeAndFetchUser$ ->', {
  //         perms,
  //         hasUserInfo: !!userInfo
  //       });
  //     }),
  //
  //     switchMap(({ perms, userInfo }) => {
  //       if (!userInfo) {
  //         console.warn('[UserMS] No userInfo after authorize; skip phone enrichment');
  //         return of({ perms, userInfo: null });
  //       }
  //
  //       // Lấy token phone từ ZMP
  //       return this.zmaService.getPhoneNumber().pipe(
  //         tap(({ token }) => {
  //           const head = token ? token.slice(0, 4) : '';
  //           console.log('[UserMS] getPhoneNumber() token received', {
  //             length: token?.length ?? 0,
  //             preview: token ? `${head}…` : '(empty)'
  //           });
  //         }),
  //
  //         switchMap(({ token }) =>
  //           // Có thể dùng: this.zmaService.getAccessToken$()
  //           from(getAccessToken()).pipe(
  //             tap((accessToken: string) =>
  //               console.log('[UserMS] getAccessToken() OK', {
  //                 length: accessToken?.length ?? 0
  //               })
  //             ),
  //
  //             switchMap((accessToken: string) =>
  //               this.userSpecificService
  //                 .getPhoneNumber({ access_token: accessToken, code: token } as IUserPhoneRequestParams)
  //                 .pipe(
  //                   tap((res) => {
  //                     console.log('[UserMS] server getPhoneNumber() response', res);
  //                   }),
  //
  //                   map((res: IResponseApi<IResPhoneNumber>) => {
  //                     if (!res?.code) {
  //                       console.warn('[UserMS] server getPhoneNumber() code != 1 (or falsy)', res);
  //                       // Giữ nguyên userInfo nếu BE trả về lỗi
  //                       return { perms, userInfo };
  //                     }
  //
  //                     const phone = res?.data?.phone;
  //                     if (!phone) {
  //                       console.warn('[UserMS] server getPhoneNumber() missing data.phone');
  //                       return { perms, userInfo };
  //                     }
  //
  //                     const updatedUser = { ...userInfo, phoneNumber: phone, name: phone };
  //                     console.log('[UserMS] user enriched with phone', { phonePreview: `${phone.slice(0,3)}****` });
  //                     return { perms, userInfo: updatedUser };
  //                   })
  //                 )
  //             )
  //           )
  //         ),
  //
  //         catchError((err) => {
  //           console.error('[UserMS] Phone enrichment error', err);
  //           // Không “văng” lỗi ra ngoài, trả về userInfo hiện có
  //           return of({ perms, userInfo });
  //         })
  //       );
  //     }),
  //
  //     tap((out) => {
  //       console.log('[UserMS] grantPermissionAndFetchUser$ output', out);
  //     }),
  //
  //     catchError((err) => {
  //       console.error('[UserMS] grantPermissionAndFetchUser$ fatal error', err);
  //       return of(null);
  //     }),
  //
  //     finalize(() => {
  //       console.log('[UserMS] grantPermissionAndFetchUser$ complete');
  //     })
  //   );
  // }
}
