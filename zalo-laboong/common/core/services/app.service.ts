import { Injectable, inject } from '@angular/core';
import { Subject, Observable, of, defer, from } from 'rxjs';
import { catchError, map, shareReplay, switchMap, take, tap } from 'rxjs/operators';
import { closeLoading } from 'zmp-sdk/apis';
import {AppConfigService} from './app-config.service';
import {UserService} from './user.service';
import {IResUserInfo} from '../models/zmp.model';

const SPLASH_FLAG = 'zmp.splash.closed';

@Injectable({ providedIn: 'root' })
export class AppService {
  private _cfg = inject(AppConfigService);
  private userService = inject(UserService);
  private dataTemp: Record<string, any> = {};

  private _closeOnce$?: Observable<void>;

  getTemp(name: string) {
    if (this.dataTemp?.[name]) {
      return this.dataTemp[name]
    }
    return null;
  }

  setTemp(name: string, value: any) {
    this.dataTemp[name] = value
    return this.dataTemp[name]
  }

  getTemps<T = any>(name: string): T | null {
    return (this.dataTemp && name in this.dataTemp) ? this.dataTemp[name] : null;
  }
  setTemps<T = any>(name: string, value: T): T {
    this.dataTemp[name] = value;
    return value;
  }

  get getUserInfo(): IResUserInfo | null {
    return this.userService.userInfoValue;
  }

  /** ----------------------------------------------------
   * Common
   * ---------------------------------------------------*/

  /** ----------------------------------------------------
   * Đóng Splash đúng 1 lần trên 1 phiên
   * - Dựa trên:
   *   + app-config.app.selfControlLoading === true
   *   + cờ sessionStorage (và dataTemp) để không gọi lại
   * ---------------------------------------------------*/
  closeSplashOnce$(): Observable<void> {
    if (this._closeOnce$) return this._closeOnce$;

    this._closeOnce$ = this._buildCloseOnce$().pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );
    return this._closeOnce$;
  }

  private _buildCloseOnce$(): Observable<void> {
    return this._cfg.waitUntilLoaded$().pipe(
      take(1),
      switchMap(cfg => {
        const selfControl = !!cfg.app?.selfControlLoading;
        if (!selfControl) return of(void 0);

        const closedSession = sessionStorage.getItem(SPLASH_FLAG) === '1';
        const closedRam     = !!this.getTemps<boolean>(SPLASH_FLAG);
        if (closedSession || closedRam) return of(void 0);

        return defer(() => from(closeLoading())).pipe(
          catchError(() => of(void 0)),
          tap(() => {
            sessionStorage.setItem(SPLASH_FLAG, '1');
            this.setTemps(SPLASH_FLAG, true);
          }),
          map(() => void 0)
        );
      })
    );
  }
}
