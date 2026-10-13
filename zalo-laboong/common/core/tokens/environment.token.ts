import { InjectionToken } from '@angular/core';

export interface IEnvironment {
  production: boolean;
  showTemplateFallbacks?: boolean;
  zaloBaseHref: string;
  apiUrl: string;
  apiConfig: {
    webAppId: string;
    [key: string]: unknown;
  };
  ga?: {
    /** Bật/tắt Google Analytics cho từng môi trường/app. */
    enabled: boolean;
    /** GA4 Measurement ID của Web stream, dạng G-XXXXXXXXXX. */
    measurementId: string;
    /** Bật debug_mode để event hiện trong GA4 DebugView khi test local/dev. */
    debugMode?: boolean;
  };
  OAId?: string;
  language?: {
    code: string;
    availableLangs: Array<{ id: string; label: string; [key: string]: unknown }>;
    [key: string]: unknown;
  };
  /** Config chỉ dùng cho LOCAL dev (browser). Không có ở production build. */
  localDev?: {
    fakeZalo: {
      accessToken: string;
      phoneToken: string;
      userInfo: { id: string; name: string; avatar: string; [key: string]: unknown };
      phoneNumber: string;
    };
  };
  [key: string]: unknown;
}

export const ENVIRONMENT = new InjectionToken<IEnvironment>('ENVIRONMENT');
