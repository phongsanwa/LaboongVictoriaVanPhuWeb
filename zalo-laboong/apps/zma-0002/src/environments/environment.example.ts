import {envbase} from './env.const';

/**
 * - Đây là file ENV mẫu để nhân bản chạy local, tránh tình trạng mọi người cần config riêng ở local đang bị ghi đè nhau
 * - Dev local và production sẽ copy từ file này
 *
 * - Steps:
 *    + Step 1: nhân bản file này => đổi tên sang "environment.ts"
 *    + Step 2: environment.apiUrl: điền link dev muốn call api tới
 *      + production: false
 *      + zaloBaseHref: '/'
 * - Steps Production:
 *    + Step 1: nhân bản file này => đổi tên sang "environment.prod.ts"
 *    + Step 2: environment.apiUrl: điền link dev muốn call api tới
 *      + production: true
 *      + zaloBaseHref: '/zapps/app-id/'
 * */
export const environment = {
  ...envbase,
  production: true,
  showTemplateFallbacks: false,
  zaloBaseHref: '',
  apiUrl: 'https://tunglxbe.webapp.nhanhdev.com',
  apiConfig: {
    webAppId: '2925298306504468674'
  },
  ga: {
    enabled: false, // Đổi thành true khi cần test GA trên zma-tpl.local.
    measurementId: 'G-XXXXXXXXXX', // Measurement ID của Web stream GA4 đang dùng để test mini app.
    debugMode: false, // Bật true khi muốn event hiện trong DebugView; tắt để test giống production.
  }
};
