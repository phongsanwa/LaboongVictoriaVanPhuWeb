import {inject, Injectable} from '@angular/core';
import {of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {AppService, UserService, ZmpService} from '@core/services';
import {IResUserInfo} from '@core/models/zmp.model';
import {ENVIRONMENT} from '@core/tokens/environment.token';

@Injectable({
  providedIn: 'root',
})
export class FollowOAService {
  private env   = inject(ENVIRONMENT);
  private oaId  = this.env.OAId;
  private readonly zmp = inject(ZmpService);
  private readonly users = inject(UserService);
  private readonly appService = inject(AppService);

  /**
   * - Hàm dùng để xử lý followOA
   */
  onFollowOA() {
    const stored = this.users.userInfoValue;
    if (stored?.followedOA) {
      return of('already');
    }

    return this.zmp.getUserInfo$().pipe(
      map((res: any) => (res?.userInfo ?? res) as Partial<IResUserInfo> | null),

      switchMap((sdkUser) => {
        const already = !!(sdkUser?.followedOA || stored?.followedOA);
        if (already) {
          if (stored && stored.followedOA !== true) {
            const merged: IResUserInfo = { ...stored, followedOA: true };
            return this.users.setUserInfo$(merged).pipe(map(() => 'already'));
          }
          return of('already');
        }

        return this.zmp.onFollowOA(this.oaId ?? '').pipe(
          switchMap(() => {
            const base: IResUserInfo = this.appService.getUserInfo ?? {
              id: '',
              idByOA: '',
              name: '',
              avatar: '',
              phoneNumber: '',
              isSensitive: false,
              followedOA: false,
            };

            const updated: IResUserInfo = {
              ...base,
              phoneNumber: base.phoneNumber,
              followedOA: true,
            };

            return this.users.setUserInfo$(updated).pipe(map(() => 'followed'));
          })
        );
      }),

      catchError((err) => of(err?.code === -201 ? 'denied' : 'error'))
    );
  }
}
