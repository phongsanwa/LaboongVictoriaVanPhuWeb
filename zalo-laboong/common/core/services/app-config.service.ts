import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, filter, map, shareReplay, switchMap, take, tap } from 'rxjs/operators';
import {AppUrlService} from './app-url.service';
import {AppConfigStateService} from './app-config-state.service';
import {ENVIRONMENT} from '../tokens/environment.token';
export interface AppConfig {
  app?: {
    title?: string;
    textColor?: string;
    headerColor?: string;
    statusBar?: 'normal' | 'light' | 'dark';
    actionBarHidden?: boolean;
    hideAndroidBottomNavigationBar?: boolean;
    hideIOSSafeAreaBottom?: boolean;
    selfControlLoading?: boolean;
  };
  listCSS?: string[];
  listSyncJS?: string[];
  listAsyncJS?: string[];
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private http        = inject(HttpClient);
  private urlSvc      = inject(AppUrlService);
  private configState = inject(AppConfigStateService);
  private env         = inject(ENVIRONMENT);

  private _config?: AppConfig;
  private _loaded$ = new BehaviorSubject<boolean>(false);

  /** Observable: emit true khi cấu hình đã được load */
  readonly loaded$ = this._loaded$.asObservable();

  get config(): AppConfig | undefined { return this._config; }

  private _load$?: Observable<void>;

  load$(): Observable<void> {
    if (this._load$) return this._load$;

    const cdnUrl   = this.urlSvc.buildAssetUrl('app-config.json');
    const webAppId = String(this.env.apiConfig?.webAppId ?? '');
    const apiBase   = (this.env.apiUrl ?? '').replace(/\/+$/, '');

    this._load$ = this.http.get<AppConfig>(cdnUrl, { observe: 'response' }).pipe(
      take(1),
      tap(res => {
        const body = res.body;
        if (!body || typeof body !== 'object') {
          throw new Error('Invalid app-config.json');
        }
        this._config = body;
      }),
      catchError(err => {
        console.warn('[AppConfig] load FAILED, using defaults', { cdnUrl, err });
        this._config = {
          app: {
            title: 'App',
            headerColor: '#0b2e69',
            textColor: '#000000',
            statusBar: 'normal',
            selfControlLoading: false
          },
          listCSS: [], listSyncJS: [], listAsyncJS: []
        };
        return of(this._config);
      }),
      tap(() => this.applyCssVars()),
      // Fetch runtime config từ BE để lấy businessId, zaloOaId, v.v.
      switchMap(() => {
        if (!webAppId || !apiBase) return of(null);
        const configUrl = `${apiBase}/webapptpl/zma-config/config?webAppId=${encodeURIComponent(webAppId)}`;
        return this.http.get<any>(configUrl).pipe(
          tap(res => {
            if (res?.code === 1 && res?.data) {
              this.configState.setFromApiResponse(res.data);
            }
          }),
          catchError(err => {
            console.warn('[AppConfig] BE config fetch failed', { configUrl, err });
            return of(null);
          })
        );
      }),
      tap(() => this._loaded$.next(true)),
      map(() => void 0),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    return this._load$;
  }
  waitUntilLoaded$(): Observable<AppConfig> {
    return this.loaded$.pipe(
      filter(Boolean),
      take(1),
      map(() => this._config!)
    );
  }

  /** Set CSS variables từ config */
  private applyCssVars(): void {
    const app = this._config?.app ?? {};
    const primary = app.headerColor ?? '#0b2e69';
    const text    = app.textColor   ?? '#000000';
    const root = document.documentElement;
    root.style.setProperty('--brand-color', primary);
    root.style.setProperty('--brand-text',  text);
  }
}
