import { Injectable, inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import {UserService} from '../services';
import {ENVIRONMENT} from '../tokens/environment.token';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  private userService = inject(UserService);
  private env = inject(ENVIRONMENT);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const started = Date.now();

    let request = req;

    const token = this.userService.internalJwt;
    const isZmaPrivateApi = this.isZmaPrivateApi(req.url);

    // Thêm header môi trường khi chạy local (không có Zalo SDK)
    if (!this.env.production) {
      request = request.clone({
        setHeaders: {
          'X-App-Environment': 'local'
        }
      });
    }

    if (token && isZmaPrivateApi) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      tap({
        error: (err) => {
          if (err instanceof HttpErrorResponse) {
            const isBlob = err.error instanceof Blob;
            const safeHeaders = request.headers.keys()
              .filter(k => k.toLowerCase() !== 'authorization');

            console.error('[API] HTTP ERROR', {
              method: request.method,
              url: err.url ?? request.urlWithParams,
              status: err.status,
              statusText: err.statusText,
              message: err.message,
              error: isBlob ? {
                blob: true,
                type: err.error.type,
                size: err.error.size
              } : err.error,
              requestHeaders: safeHeaders,
            });
          } else {
            console.error('[API] UNKNOWN ERROR', err);
          }
        }
      }),
      catchError(err => throwError(() => err)),
      finalize(() => {
        const elapsed = Date.now() - started;
        // console.debug(`[API] ${request.method} ${request.urlWithParams} - ${elapsed}ms`);
      })
    );
  }

  private isZmaPrivateApi(url: string): boolean {
    const normalized = url.toLowerCase();

    // Chỉ gắn JWT cho private API của zma
    if (!normalized.includes('/webapptpl/')) {
      return false;
    }

    // Không gắn cho auth public
    if (
      normalized.includes('/webapptpl/auth/initlogin') ||
      normalized.includes('/webapptpl/auth/completelogin') ||
      normalized.includes('/webapptpl/auth/logout')
    ) {
      return false;
    }

    return true;
  }
}
