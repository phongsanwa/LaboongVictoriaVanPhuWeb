import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {catchError, map, Observable, of, throwError} from 'rxjs';
import {ENVIRONMENT} from '@core/tokens/environment.token';

interface WebAppExpiryResponse {
  code?: number;
  errorCode?: string | null;
  messages?: string[];
  data?: {
    expiredAt?: number | null;
  };
}

export type WebAppExpiryResult =
  | {status: 'active'}
  | {status: 'expired'; expiredAt: number | null};

@Injectable({providedIn: 'root'})
export class WebAppExpiryService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(ENVIRONMENT);

  check$(): Observable<WebAppExpiryResult> {
    const apiBase = (this.environment.apiUrl ?? '').replace(/\/+$/, '');
    const webAppId = String(this.environment.apiConfig?.webAppId ?? '').trim();

    if (!apiBase || !webAppId) {
      return throwError(() => new Error('Thiếu cấu hình WebApp để kiểm tra hạn sử dụng.'));
    }

    return this.http.post<WebAppExpiryResponse>(
      `${apiBase}/webapptpl/setting/expiry`,
      {webAppId},
    ).pipe(
      map(response => this.toResult(response)),
      catchError((error: HttpErrorResponse | Error) => {
        const response = error instanceof HttpErrorResponse
          ? error.error as WebAppExpiryResponse | undefined
          : undefined;

        if (response?.errorCode === 'ERR_EXPIRED') {
          return of(this.toResult(response));
        }

        return throwError(() => new Error('Không thể kiểm tra hạn sử dụng. Vui lòng thử lại.'));
      }),
    );
  }

  private toResult(response: WebAppExpiryResponse): WebAppExpiryResult {
    if (response?.errorCode === 'ERR_EXPIRED') {
      const expiredAt = response.data?.expiredAt;
      return {
        status: 'expired',
        expiredAt: typeof expiredAt === 'number' ? expiredAt : null,
      };
    }

    if (response?.code === 1) {
      return {status: 'active'};
    }

    throw new Error('Expiry API returned an unexpected response.');
  }
}
