import {envbase} from './env.const';

export const environment = {
  ...envbase,
  production: true,
  showTemplateFallbacks: false,
  zaloBaseHref: '__ZALO_BASE_HREF__',
  apiUrl: '__API_URL__',
  apiConfig: {
    webAppId: '__WEB_APP_ID__'
  },
  // Config GA khi build/deploy production cho zma-0002.
  ga: {
    // Bật true sau khi xác nhận Measurement ID production.
    enabled: false,
    // Thay bằng Measurement ID thật, ví dụ G-BSTQTFMSB2.
    measurementId: 'G-XXXXXXXXXX',
    // Production nên để false để không đánh dấu event là debug.
    debugMode: false,
  },
  OAId: '__OA_ID__',
};
