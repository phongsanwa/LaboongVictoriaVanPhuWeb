import {inject, Injectable} from '@angular/core';
import {BehaviorSubject, catchError, from, Observable, of} from 'rxjs';
import {getSetting, getUserInfo} from 'zmp-sdk/apis';
import { STORAGE_KEYS } from '../models/storage.model';
import { IResUserInfo } from '../models/zmp.model';
import {map, shareReplay} from 'rxjs/operators';
import {ZmaNativeStorageService} from './storage.service';
import {ENVIRONMENT} from '../tokens/environment.token';

export type TTokenType = 'zaloMiniApp' | 'website' | 'landingPage' | 'momoMiniApp';

export interface IInternalAuthContext {
  type: TTokenType;
  webAppId: number;
  businessId: number;
  webAppUserId: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private _userInfo$ = new BehaviorSubject<IResUserInfo | null>(null);
  readonly userInfo$: Observable<IResUserInfo | null> = this._userInfo$.asObservable();
  private _internalJwt$ = new BehaviorSubject<string | null>(null);
  private _internalAuthContext$ = new BehaviorSubject<IInternalAuthContext | null>(null);
  private zmaStorage = inject(ZmaNativeStorageService);
  private env = inject(ENVIRONMENT);

  private _grantedScopes: Set<string> = new Set();

  constructor() {
    this.checkAndLoadCache();
  }

  get internalJwt(): string | null {
    return this._internalJwt$.value;
  }

  get internalAuthContext(): IInternalAuthContext | null {
    return this._internalAuthContext$.value;
  }

  get webAppUserId(): string {
    return this._internalAuthContext$.value?.webAppUserId ?? '';
  }

  /**
   * Kiểm tra quyền người dùng + load dữ liệu cache (nếu còn hợp lệ).
   * Local dev: bỏ qua getSetting() (Zalo SDK không hoạt động ngoài Zalo app) —
   * load thẳng từ storage, không xóa cache khi SDK throw.
   */
  private async checkAndLoadCache(): Promise<void> {
    // Restore JWT trước — không phụ thuộc ZMP SDK
    this.restoreJwtFromStorage();

    // Local dev: getSetting() sẽ throw -2000 → không gọi, load thẳng từ storage
    if (!this.env.production) {
      const storedScopes = this.zmaStorage.get<string[]>(STORAGE_KEYS.GRANTED_SCOPES, []);
      storedScopes.forEach(s => this._grantedScopes.add(s));
      const info = this.zmaStorage.get<IResUserInfo | null>(STORAGE_KEYS.USER_INFO, null);
      if (info) {
        this._userInfo$.next(info);
      }
      return;
    }

    try {
      const settings = await getSetting({});
      const authSetting = settings.authSetting as Record<string, boolean>;

      const storedScopes = this.zmaStorage.get<string[]>(STORAGE_KEYS.GRANTED_SCOPES, []);

      // Nếu scope nào bị thu hồi → xóa toàn bộ cache
      const revoked = storedScopes.filter(scope => !authSetting[scope]);
      if (revoked.length > 0) {
        this.clearCache();
        return;
      }

      storedScopes.forEach(s => this._grantedScopes.add(s));

      const info = this.zmaStorage.get<IResUserInfo | null>(STORAGE_KEYS.USER_INFO, null);
      if (info) {
        this._userInfo$.next(info);
      }
    } catch (e) {
      console.error('UserService.checkAndLoadCache failed', e);
      this.clearCache();
    }
  }

  /**
   * Restore JWT từ nativeStorage vào BehaviorSubject khi app khởi động.
   * Gọi trước bất kỳ lời gọi ZMP SDK nào để đảm bảo JWT luôn được nạp,
   * kể cả khi getSetting() throw (môi trường local/non-Zalo).
   */
  private restoreJwtFromStorage(): void {
    const jwt = this.zmaStorage.getPure(STORAGE_KEYS.INTERNAL_JWT);
    const expireAt = this.zmaStorage.getPure(STORAGE_KEYS.INTERNAL_JWT_EXPIRE);

    const neverExpires = !expireAt || expireAt === '0';
    const stillValid   = neverExpires || Date.now() < Number(expireAt);

    if (jwt && stillValid) {
      this._internalJwt$.next(jwt);
      const context = this.zmaStorage.get<IInternalAuthContext | null>(
        STORAGE_KEYS.INTERNAL_AUTH_CONTEXT,
        null
      );
      this._internalAuthContext$.next(context);
    } else if (jwt) {
      // JWT hết hạn → dọn dẹp storage
      this.clearInternalAuth();
    }
  }

  /**
   * Lưu granted scopes và user info vào bộ nhớ thiết bị + BehaviorSubject
   */
  saveGrantAndUser(granted: Record<string, boolean>, info: IResUserInfo): void {
    const scopes = Object.keys(granted).filter(s => granted[s]);
    this.zmaStorage.set(STORAGE_KEYS.GRANTED_SCOPES, scopes);
    this._grantedScopes = new Set(scopes);

    this.zmaStorage.set(STORAGE_KEYS.USER_INFO, info);
    this._userInfo$.next(info);
  }

  saveInternalAuth(token: string, expiresIn: number, context: IInternalAuthContext): void {
    const expireAt = expiresIn > 0 ? String(Date.now() + expiresIn * 1000) : '0';
    this.zmaStorage.setPure(STORAGE_KEYS.INTERNAL_JWT, token);
    this.zmaStorage.setPure(STORAGE_KEYS.INTERNAL_JWT_EXPIRE, expireAt);
    this.zmaStorage.set(STORAGE_KEYS.INTERNAL_AUTH_CONTEXT, context);
    this._internalJwt$.next(token);
    this._internalAuthContext$.next(context);
  }

  clearInternalAuth(): void {
    this.zmaStorage.remove(STORAGE_KEYS.INTERNAL_JWT);
    this.zmaStorage.remove(STORAGE_KEYS.INTERNAL_JWT_EXPIRE);
    this.zmaStorage.remove(STORAGE_KEYS.INTERNAL_AUTH_CONTEXT);
    this._internalJwt$.next(null);
    this._internalAuthContext$.next(null);
  }

  /**
   * Xóa cache khi người dùng logout hoặc thu hồi quyền
   */
  clearCache(): void {
    this.zmaStorage.remove(STORAGE_KEYS.GRANTED_SCOPES);
    this.zmaStorage.remove(STORAGE_KEYS.USER_INFO);
    this._grantedScopes.clear();
    this._userInfo$.next(null);
  }

  /**
   * Lấy danh sách scopes đã được cấp quyền
   */
  getGrantedScopes(): string[] {
    return Array.from(this._grantedScopes);
  }

  /** @deprecated use userInfoValue instead */
  getDataUser(): Promise<string | null> {
    const val = this.zmaStorage.getPure(STORAGE_KEYS.USER_INFO);
    return Promise.resolve(val || null);
  }

  get userInfoValue(): IResUserInfo | null {
    return this._userInfo$.value;
  }

  hydrateFromStorage$() {
    // Local dev: getUserInfo() throw -2000 — dùng thẳng data trong storage
    if (!this.env.production) {
      const stored = this.zmaStorage.get<IResUserInfo | null>(STORAGE_KEYS.USER_INFO, null);
      this._userInfo$.next(stored);
      return of(stored).pipe(shareReplay(1));
    }

    const latest$ = from(getUserInfo()).pipe(
      map((res: any) => (res?.userInfo ?? res) as Partial<IResUserInfo> | null),
      catchError(() => of(null))
    );

    return latest$.pipe(
      map((latest) => {
        const stored = this.zmaStorage.get<IResUserInfo | null>(STORAGE_KEYS.USER_INFO, null);
        const merged = this.mergeKeepingPhone(stored, latest);
        const changed = !this.shallowEqual(stored, merged);
        if (changed && merged) {
          this.zmaStorage.set(STORAGE_KEYS.USER_INFO, merged);
        }
        this._userInfo$.next(merged);
        return merged;
      }),
      catchError(() => {
        this._userInfo$.next(null);
        return of(null);
      }),
      shareReplay(1)
    );
  }

  /** Gộp dữ liệu, không ghi đè phoneNumber từ storage */
  private mergeKeepingPhone(
    stored: IResUserInfo | null,
    latest: Partial<IResUserInfo> | null
  ): IResUserInfo | null {
    if (!stored && !latest) return null;
    const keepPhone = stored?.phoneNumber;

    const cleanedLatest = latest
      ? Object.fromEntries(Object.entries(latest).filter(([, v]) => v !== undefined))
      : {};

    const merged = { ...(stored ?? {}), ...(cleanedLatest as object) } as IResUserInfo;
    if (keepPhone != null) merged.phoneNumber = keepPhone;
    return merged;
  }

  private shallowEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
      if (a[k] !== b[k]) return false;
    }
    return true;
  }

  setUserInfo$(info: IResUserInfo | null) {
    if (info) {
      this.zmaStorage.set(STORAGE_KEYS.USER_INFO, info);
    } else {
      this.zmaStorage.remove(STORAGE_KEYS.USER_INFO);
    }
    this._userInfo$.next(info);
    return of(void 0);
  }

  /**
   * Hàm dùng để update lại isHaveFollow
   */
  updateIsHaveFollow(flag: boolean): void {
    const cur = this._userInfo$.value;
    this.zmaStorage.set(STORAGE_KEYS.USER_INFO, { ...cur, isHaveFollow: flag });
  }
}
