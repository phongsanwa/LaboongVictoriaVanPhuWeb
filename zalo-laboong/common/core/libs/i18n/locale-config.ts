import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import localeEn from '@angular/common/locales/en';
import localeJA from '@angular/common/locales/ja';
import { LOCALE_CODE } from "@core/libs";

interface LocaleDefinition {
   data: any; // Dữ liệu locale từ Angular
   code: LOCALE_CODE; // Mã định danh locale, ví dụ: 'vi', 'en'
}

const LOCALES: LocaleDefinition[] = [
   { data: localeVi, code: 'vi-VN' },
   { data: localeEn, code: 'en-US' },
   { data: localeJA, code: 'ja-JP' },
];

/**
 * Hàm đăng ký các locale
 */
export function registerLocales() {
   LOCALES.forEach(locale => {
      registerLocaleData(locale.data, locale.code);
   });
}
