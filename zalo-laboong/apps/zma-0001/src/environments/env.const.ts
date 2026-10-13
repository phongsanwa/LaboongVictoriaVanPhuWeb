export const envbase = {
  features: {
    v2: false,   // Tính năng version 2 — mặc định tắt, bật khi app được nâng cấp lên v2
  },

  // ------------------------------------------------------------------------------------------------------------------
  // Config LOCAL dev — chỉ dùng khi production = false (chạy browser, không có Zalo SDK).
  // Các giá trị fake_* PHẢI khớp với 'local_dev' block trong web-app-be/config/autoload/web.development.php.
  // ------------------------------------------------------------------------------------------------------------------
  localDev: {
    fakeZalo: {
      accessToken: 'b2ffee72824adc7636590bf14b8ab2784bfa9f8a38456fbd2e5030fe83b75a26',
      phoneToken:  '8bba3d5d7be0f081764fc7939a93d89723a8c9dd06bd7d16be2295d6f38168b6',
      userInfo:    { id: 'local_dev_user_001', name: 'Dev User', avatar: '' },
      phoneNumber: '0900000000',
    },
  },

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
