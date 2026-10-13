import {Component, DestroyRef, inject, OnInit, signal, ViewEncapsulation} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter, map, of, switchMap} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {isAndroid} from '@core/utils/app.utils';
import {AnalyticsService} from '@core/services';
import {AppConfigService} from '@core/services/app-config.service';
import {WebAppExpiryService} from './services/webapp-expiry.service';

type AppGateState = 'loading' | 'ready' | 'expired' | 'error';

@Component({
  selector: '[id=app]',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {
  title = 'fashion-app-1';
  readonly gateState = signal<AppGateState>('loading');
  readonly expiredDate = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private navigationStarted = false;

  constructor(
    private router: Router,
    private analytics: AnalyticsService,
    private appConfig: AppConfigService,
    private webAppExpiry: WebAppExpiryService,
  ) {}

  ngOnInit() {
    this.router.events.pipe(
      // đây là type-predicate: tells TS “nếu true thì evt is NavigationEnd”
      filter((evt): evt is NavigationEnd => evt instanceof NavigationEnd)
    ).subscribe(evt => {
      // TS now knows evt is NavigationEnd
      console.log('Navigated to:', evt.urlAfterRedirects);
      // Track page_view theo route vì GA không tự bắt đủ điều hướng trong Angular SPA.
      this.analytics.trackPageView(evt.urlAfterRedirects);
    });

    // Nếu Android, cộng thêm 6px
    document.documentElement.style.setProperty(
      '--zaui-safe-extra-top',
      isAndroid() ? '6px' : '0px'
    );

    this.checkExpiry();
  }

  checkExpiry(): void {
    this.gateState.set('loading');

    this.webAppExpiry.check$().pipe(
      switchMap(result => {
        if (result.status === 'expired') {
          this.expiredDate.set(this.formatExpiredAt(result.expiredAt));
          return of<AppGateState>('expired');
        }

        return this.appConfig.load$().pipe(map(() => 'ready' as AppGateState));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: state => {
        this.gateState.set(state);
        if (state === 'ready' && !this.navigationStarted) {
          this.navigationStarted = true;
          this.router.initialNavigation();
        }
      },
      error: () => this.gateState.set('error'),
    });
  }

  scrollToSupport(element: HTMLElement): void {
    element.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  private formatExpiredAt(expiredAt: number | null): string | null {
    if (expiredAt === null) return null;

    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(expiredAt * 1000));
  }
}
