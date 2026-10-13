import {Inject, Injectable} from '@angular/core';
import {ENVIRONMENT, IEnvironment} from '@core/tokens/environment.token';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

@Injectable({providedIn: 'root'})
export class AnalyticsService {
  private initialized = false;

  constructor(@Inject(ENVIRONMENT) private environment: IEnvironment) {
  }

  init(): boolean {
    const config = this.environment.ga;
    const measurementId = config?.measurementId?.trim();
    if (!config?.enabled || !measurementId || this.initialized || typeof window === 'undefined') {
      return this.initialized;
    }

    // Khởi tạo dataLayer/gtag theo chuẩn GA4 trước khi script tải xong.
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer?.push(arguments);
    };

    // Inject gtag.js bằng code để mỗi app/env có thể bật tắt qua environment.
    if (!document.querySelector(`script[data-ga-measurement-id="${measurementId}"]`)) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      script.dataset['gaMeasurementId'] = measurementId;
      document.head.appendChild(script);
    }

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      // Angular là SPA nên page_view được gửi thủ công theo Router NavigationEnd.
      send_page_view: false,
      debug_mode: !!config.debugMode,
    });

    this.initialized = true;
    return true;
  }

  trackPageView(path: string): void {
    const measurementId = this.environment.ga?.measurementId?.trim();
    if (!measurementId || !this.init()) return;

    // Gửi page_view thủ công để GA ghi nhận đúng route nội bộ của mini app.
    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_location: `${window.location.origin}${path}`,
      page_title: document.title,
      send_to: measurementId,
      debug_mode: !!this.environment.ga?.debugMode,
    });
  }

  trackEvent(name: string, params: Record<string, unknown> = {}): void {
    if (!name || !this.init()) return;

    // Wrapper chung cho các event thương mại như add_to_cart, begin_checkout, purchase.
    window.gtag?.('event', name, {
      ...params,
      debug_mode: !!this.environment.ga?.debugMode,
    });
  }
}
