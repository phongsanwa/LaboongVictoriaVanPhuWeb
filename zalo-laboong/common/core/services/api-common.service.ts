import { inject, Injectable } from '@angular/core';
import {
  HttpClient, HttpErrorResponse, HttpHeaders, HttpParams,
} from '@angular/common/http';
import {Observable, tap, throwError} from 'rxjs';
import { catchError } from 'rxjs/operators';
import {IResponseApi} from '../models';
import {parseParams} from '../utils/app.utils';
import {UserService} from './user.service';
import {ENVIRONMENT} from '../tokens/environment.token';

interface ApiOptions {
  includeAppId?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly env     = inject(ENVIRONMENT);
  private readonly baseUrl = (this.env.apiUrl ?? '').replace(/\/+$/, '');
  private readonly headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  private readonly webAppId: number = Number(this.env.apiConfig?.webAppId ?? 0);

  constructor(private http: HttpClient, private userService: UserService) {}

  /** GET chung */
  get<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    { includeAppId = true }: ApiOptions = {}
  ): Observable<T> {
    const url = this.buildUrl(endpoint, includeAppId);
    return this.http.get<T>(url, { params: this.toHttpParams(params), headers: this.buildHeaders() })
      .pipe(catchError(this.handleError));
  }

  /** POST chung (body = JSON). webAppId luôn được gộp vào body thay vì query param. */
  post<T>(
    endpoint: string,
    body?: unknown,
    { includeAppId = true }: ApiOptions = {}
  ): Observable<T> {
    const url   = this.buildUrl(endpoint, false);
    const merged = this.mergeWebAppId(body, includeAppId);
    return this.http.post<T>(url, merged, { headers: this.buildHeaders() })
      .pipe(catchError(this.handleError));
  }

  /** Gộp webAppId vào body nếu body là object và includeAppId = true */
  private mergeWebAppId(body: unknown, includeAppId: boolean): unknown {
    if (!includeAppId || !this.webAppId) return body;
    if (body && typeof body === 'object' && !Array.isArray(body) && !(body instanceof FormData)) {
      const b = body as Record<string, unknown>;
      if (!('webAppId' in b)) {
        return { ...b, webAppId: this.webAppId };
      }
    }
    return body;
  }

  private buildHeaders(useAuth: boolean = false): HttpHeaders {
    const token = this.userService.internalJwt;

    const headerConfig: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (useAuth && token) {
      headerConfig['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headerConfig);
  }
  /**
   * Dùng cho các API POST dành cho GUEST có thể xem được
   * */
  postGuestRequest<T = IResponseApi>(endpoint: string, params = {}, resType = 'json'): Observable<T> {
    params = parseParams(params);
    const merged = this.mergeWebAppId(params, true);
    const options = {
      responseType: resType
    }

    return this.http.post<T>(this.getBaseUrlApi(endpoint, false), merged, { headers: this.headers }).pipe(
      this.handleTapRes(),
    )
  }

  private handleTapRes(): any {
    // return this.handleTapDebug();
    return tap({
      next: (res: IResponseApi) => {
        if (res.errorCode == 'ERR_PAGE_401') {
          // Something code handle
        }
      },
      error: err => {
        // console.error('handleTapRes', err)
      }
    });
  }

  private handleTapDebug(): any {
    return tap({
      next: (resp: any) => {
        console.log('Content-Type:', resp.headers.get('content-type'));
        console.log('Raw body >>>', resp.body);          // xem thực sự BE trả gì
        try {
          const json = JSON.parse(resp.body);
          // TODO: dùng json
        } catch {
          console.warn('Không phải JSON, xử lý khác hoặc báo lỗi BE');
        }
      },
      error: err => console.error('HTTP error', err)
      // error: err => {
      //    console.error('handleTapRes', err)
      // }
    });
  }

  /** Nếu cần lấy URL đầy đủ */
  getBaseUrlApi(endpoint: string, withAppId: boolean = false): string {
    return this.buildUrl(endpoint, withAppId);
  }

  /** Ghép base + endpoint và (tuỳ chọn) gắn webAppId vào query */
  private buildUrl(endpoint: string, withAppId: boolean): string {
    const path = (endpoint ?? '').startsWith('/') ? endpoint : `/${endpoint ?? ''}`;
    let url = `${this.baseUrl}${path}`;
    if (withAppId) url = this.appendWebAppId(url);
    return url;
  }

  private appendWebAppId(url: string): string {
    if (!this.webAppId || /[?&]webAppId=/.test(url)) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}webAppId=${encodeURIComponent(this.webAppId)}`;
  }

  /** Chuyển object -> HttpParams */
  private toHttpParams(params?: Record<string, unknown>): HttpParams {
    if (!params) return new HttpParams();
    let hp = new HttpParams();
    for (const [k, v] of Object.entries(params)) {
      if (v == null) continue;
      if (Array.isArray(v)) v.forEach(x => x != null && (hp = hp.append(k, String(x))));
      else hp = hp.set(k, String(v));
    }
    return hp;
  }

  /** Lỗi chung */
  private handleError(error: HttpErrorResponse) {
    const message = error?.error?.message || error?.message || 'Có lỗi từ máy chủ, vui lòng thử lại sau.';
    return throwError(() => new Error(message));
  }
}
