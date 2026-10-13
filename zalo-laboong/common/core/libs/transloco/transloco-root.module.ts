
import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, provideHttpClient } from "@angular/common/http";
import { provideTransloco, Translation, TranslocoLoader, TranslocoService } from "@jsverse/transloco";
import {AppUrlService} from '../../services/app-url.service';
import {Observable} from 'rxjs';

/** Cấu hình ngôn ngữ mặc định — giống nhau ở tất cả apps (từ envbase.language) */
const DEFAULT_LANG_CONFIG = {
  code: 'vi-VN',
  availableLangs: [
    { id: 'vi-VN', label: 'Vietnamese' },
    { id: 'en-US', label: 'English' },
  ],
};

/**
 * https://jsverse.github.io/transloco/docs/getting-started/installation
 * */
@Injectable({ providedIn: 'root' })
export class TransLocoHttpLoader implements TranslocoLoader {
   constructor(
     private http: HttpClient,
     private urlSvc: AppUrlService
   ) {
   }

  getTranslation(lang: string): Observable<Translation> {
    const url = this.urlSvc.buildAssetUrl(`assets/i18n/${lang}.json`);
    return this.http.get<Translation>(url);
  }
}

export const TransLocoProviders: any[] = [
   TranslocoService,
   provideHttpClient(),
   provideTransloco({
      config: {
         availableLangs: DEFAULT_LANG_CONFIG.availableLangs,
         defaultLang: DEFAULT_LANG_CONFIG.code,
         reRenderOnLangChange: true,
         prodMode: !isDevMode(),
      },
      loader: TransLocoHttpLoader,
   }),
]

