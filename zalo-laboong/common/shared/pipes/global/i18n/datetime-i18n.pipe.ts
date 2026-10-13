import {OnDestroy, Pipe, PipeTransform} from '@angular/core';
import {BusinessI18nService, LOCALE_CODE} from '@core/libs';
import {Subscription} from 'rxjs';
import {capitalizeFirstLetter} from '@shared/utils';
import moment from 'moment';
import {DATE_FORMATS, EXCEPTION_DATES, getDateFormatI18} from '@core/constants';

type typeFormat = keyof typeof DATE_FORMATS['COMMON'];
type IOptsDateI18n = {
  checkYearCurrent?: boolean; // Kiểm tra giá trị có phải năm hiện tại
};

/**
 *
 * - Mặc định momment xử lý giá trị timestamp dưới dạng milliseconds
 *      => chỉ định lại sang seconds để trùng với epoch seconds của BE
 * */
@Pipe({
  standalone: true,
  name: 'dateI18n'
})
export class DateI18nPipe implements PipeTransform, OnDestroy {
  protected language: LOCALE_CODE;
  protected sub?: Subscription;

  constructor(private businessI18nService: BusinessI18nService) {
    // Lấy config ban đầu
    this.language = this.businessI18nService.getLanguageCode();

    // Lắng nghe thay đổi config (1 subscription duy nhất)
    this.sub = this.businessI18nService.language$.subscribe(lang => {
      this.language = lang;
      // Lần tới transform, nếu config ref thay đổi => format lại
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  transform(val: any, type: typeFormat, opts: IOptsDateI18n = {}): any {
    if (val == null || EXCEPTION_DATES.includes(val) || !type) {
      return '';
    }
    // Đảm bảo rằng giá trị luôn là timestamp (number)
    let timestamp: number;
    if (typeof val === 'number') {
      timestamp = val;
    } else {
      timestamp = Number(val);
      if (isNaN(timestamp)) {
        return '';
      }
    }

    if (!this.isFormatI18n(type)) {
      return '';
    }

    return this.transformFormatI18n(timestamp, type, 'vi-VN', opts);
  }

  private transformFormatI18n(
    timestamp: number,
    type: keyof typeof DATE_FORMATS['COMMON'],
    language: LOCALE_CODE,
    opts: IOptsDateI18n = {}
  ): string {
    // Nếu timestamp nhỏ hơn 10¹², coi đó là epoch seconds, nhân thêm 1000
    const tsValue = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    const momentDate = moment(tsValue);

    if (!momentDate.isValid()) {
      return '';
    }
    const isLocaleVI = language === 'vi-VN';
    let format = getDateFormatI18(type, isLocaleVI);
    if (!format) {
      return '';
    }
    moment.locale(language);

    if (language === 'vi-VN' && type === 'FULL_DATE') {
      const weekday = momentDate.format('dddd'); // Ví dụ: thứ năm
      const day = momentDate.format('DD');
      const month = momentDate.format('MM');
      const year = momentDate.format('YYYY');
      return `${capitalizeFirstLetter(weekday)}, ngày ${day} tháng ${month} năm ${year}`;
    }

    if (opts.checkYearCurrent && momentDate.year() === moment().year() && type === 'SHORT_DATE') {
      format = getDateFormatI18('TINY_DATE', isLocaleVI);
    }

    return momentDate.format(format as string);
  }

  private isFormatI18n(type: typeFormat): type is keyof typeof DATE_FORMATS['COMMON'] {
    return type in DATE_FORMATS['COMMON'];
  }
}
