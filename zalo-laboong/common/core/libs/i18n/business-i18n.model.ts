export const LOCALE_TO_MAPPING_SERVER: Record<string, string> = {
   'en': 'en-US',
   'vi': 'vi-VN',
   'ja': 'ja-JP',
   'fr': 'fr-FR',
   'es': 'es-ES',
   'de': 'de-DE',
   'zh-CN': 'zh-CN',
   'zh-TW': 'zh-TW',
   'pt': 'pt-PT',
   'pt-BR': 'pt-BR',
   'ru': 'ru-RU',
   'ar': 'ar-SA',
   'es-MX': 'es-MX'
};


export type LANGUAGE_ITEM = {
   id: string,
   label: string
}
export const LOCALE_TO_CURRENCY = {
   'en-US': 'USD', // Dollar Mỹ
   'vi-VN': 'VND', // Đồng Việt Nam
   'ja-JP': 'JPY', // Yên Nhật
   'fr-FR': 'EUR', // Euro
} as const;

export const PERCENT_DECIMAL_DEFAULT = 2;

export type LOCALE_CODE = keyof typeof LOCALE_TO_CURRENCY;
export type LOCALE_SYMBOL_CODE = (typeof LOCALE_TO_CURRENCY)[keyof typeof LOCALE_TO_CURRENCY];

export type IBusinessI18nConfig = {
  locale: LOCALE_CODE,
  currency: {
    code: LOCALE_SYMBOL_CODE,
    display: 'code' | 'symbol' | string,
  },
  timezone: string; // Ví dụ: "Asia/Ho_Chi_Minh"
  percentDecimals: number, //  0,1,2,3 => Mặc định để là 2
};

/**
 * -----------------------------------------------------------------------------------------------------
 * INTERFACE API ---------------------------------------------------------------------------------------------
 * -----------------------------------------------------------------------------------------------------
 * */
// Cài đặt theo DN
export type IBusinessLocaleSymbol = "none" | "symbol" | "code";
export type IBusinessLocaleSettings = {
  country: string, // server sẽ trả in hoa dạng short "VN" FE cần mapping lại
  currency: {
    code: LOCALE_SYMBOL_CODE, // VND
    // none = Không hiển thị, symbol = đ, code = VND
    display: IBusinessLocaleSymbol, // "none" | "symbol" | "code"
  },
  timezone: string, // Asia/Ho_Chi_Minh
  percentDecimals: number, //  0,1,2,3
};

// Cài đặt theo user
export type IUserLocaleSettings = {
  language: string
}


/**
 * -----------------------------------------------------------------------------------------------------
 * INTERFACE PIPE ---------------------------------------------------------------------------------------------
 * -----------------------------------------------------------------------------------------------------
 * */
export type IOtpPipeI18n = {
   showZeroValue?: boolean,
   abs?: boolean,
   showSymbol?: boolean,
}
