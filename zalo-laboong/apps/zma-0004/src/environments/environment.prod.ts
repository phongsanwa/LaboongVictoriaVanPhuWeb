import {envbase} from './env.const';

export const environment = {
  ...envbase,
  production: true,
  zaloBaseHref: '__ZALO_BASE_HREF__',
  apiUrl: '__API_URL__',
  apiConfig: {
    webAppId: '__WEB_APP_ID__'
  },
  OAId: '__OA_ID__',
};
