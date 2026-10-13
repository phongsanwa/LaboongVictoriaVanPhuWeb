export const envbase = {
  language: {
    code: 'vi-VN',
    name: 'Vietnamese',
    availableLangs: [
      {
        id: 'vi-VN',
        label: 'Vietnamese'
      },
      {
        id: 'en-US',
        label: 'English'
      }
    ],
  },

  // ------------------------------------------------------------------------------------------------------------------
  // Các config có thể thay đổi trong các môi trường ------------------------------------------------------------------
  // ------------------------------------------------------------------------------------------------------------------
  production: false,
  zaloBaseHref: '/',
  apiUrl: 'https://tunglxbe.webapp.nhanhdev.com',
  apiConfig: {
    webAppId: '2925298306504468674'
  }
};
