/**
 * ---------------------------------------------------------------------------------------------------------------------
 * Khai báo các định dạng khi dùng format moment sau cần check các const thừa không dùng nữa
 * ---------------------------------------------------------------------------------------------------------------------
 * */
export const FILE_NAME_DATE_FORMAT = 'YYYY-MM-DD_HHmmss';

export const DISPLAY_DATE_FORMAT = 'DD/MM/YYYY';

export const EXCEPTION_DATES = ['0000-00-00', '00-00-0000', '9999-12-31', '0000-00-00 00:00:00'];

export const COMMON_DATE_FORMAT_TIME_STAMP = 'dd-MM-yyyy HH:mm:ss'; // timestamp nên dùng format kiểu này, tránh bị lỗi năm, d, y viết thường
export const COMMON_DATE_FORMAT_TIME_STAMP_DISPLAY = 'dd/MM/yyyy HH:mm:ss'; // timestamp nên dùng format kiểu này, tránh bị lỗi năm, d, y viết thường
export const COMMON_DATETIME_MOMENT = 'Y/m/d HH:mm:ss';
export const COMMON_DATETIME_MOMENT2 = 'HH:mm DD/MM/YYYY';
export const COMMON_DATETIME_MOMENT3 = 'HH:mm:ss DD/MM/YYYY';
export const COMMON_DATE_MOMENT = 'YYYY-MM-DD';
export const COMMON_TIME_MOMENT = 'HH:mm:ss';
export const COMMON_ONLY_HOUR_MINUTE = 'HH:mm';
export const DISPLAY_DATETIME_MOMENT = 'DD/MM/YYYY HH:mm:ss';
export const DISPLAY_DATE_MOMENT = 'DD/MM/YYYY';
export const DISPLAY_SHORT_DATETIME_MOMENT = 'HH:mm DD/MM';
export const DISPLAY_SHORT_DAY_MOMENT = 'DD';
export const DISPLAY_SHORT_DAYMONTH_MOMENT = 'DD/MM';
export const DISPLAY_SHORT_MONTHYEAR_MOMENT = 'MM/YYYY';
export const DISPLAY_SHORT_DATETIME_MOMENT_OTHER_YEAR = 'HH:mm DD/MM/YYYY';

// 2 Format của date và time server đang trả về
export const API_COMMON_DATE_TIME = 'YYYY-MM-DD HH:mm:ss';
export const API_COMMON_MONTH_YEAR = 'MM-YYYY';
export const API_COMMON_DATE_MONTH_YEAR = 'YYYY-MM';
/**
 * ---------------------------------------------------------------------------------------------------------------------
 * Xử lý locales date & datetime
 * ---------------------------------------------------------------------------------------------------------------------
 * */
export const DATE_FORMATS = {
  COMMON: {
    COMMON_DATE: 'YYYY-MM-DD HH:mm:ss', // 2024-12-26 15:30:00
    MINIMAL_DATE: 'DD', // 26
    TINY_DATE: 'MM/DD', // 12/26
    SHORT_DATE: 'MM/DD/YYYY', // 12/26/2024
    LONG_DATE: 'MMM DD, YYYY', // Dec 26, 2024
    FULL_DATE: 'dddd, MMMM DD, YYYY', // Thursday, December 26, 2024
    TINY_DATE_TIME: 'MM/DD h:mm A', // 12/26 3:30 PM
    SHORT_DATE_TIME: 'MM/DD/YYYY h:mm A', // 12/26/2024 3:30 PM
    SHORT_MONTH: 'MM/YYYY', // 12/2024
    SHORT_DATE_HOUR_MINUTE: 'MM/DD/YYYY HH:mm', // 12/26/2024 15:30
    SHORT_DATE_SHORT_TIME: 'MM/DD/YYYY HH:mm:ss', // 12/26/2024 15:30:00
  },
  VI: {
    COMMON_DATE: 'YYYY-MM-DD HH:mm:ss', // 2024-12-26 15:30:00
    MINIMAL_DATE: 'DD', // 26
    TINY_DATE: 'DD/MM', // 26/12
    SHORT_DATE: 'DD/MM/YYYY', // 26/12/2024
    LONG_DATE: 'DD MMM, YYYY', // 26 Dec, 2024
    FULL_DATE: 'dddd, MMMM DD, YYYY', // Thứ năm, ngày 26 tháng 12 năm 2024
    TINY_DATE_TIME: 'DD/MM HH:mm', // 26/12 15:30
    SHORT_DATE_TIME: 'DD/MM/YYYY HH:mm', // 26/12/2024 15:30
    SHORT_MONTH: 'MM/YYYY', // 12/2024
    SHORT_DATE_HOUR_MINUTE: 'DD/MM/YYYY HH:mm', // 26/12/2024 15:30
    SHORT_DATE_SHORT_TIME: 'DD/MM/YYYY HH:mm:ss', // 26/12/2024 15:30:00
  },
};
export const RANGES_MONTH: { key: string; value: number }[] = [
  {
    key: '2_MONTHS',
    value: 2, // 2 tháng
  },
  {
    key: '3_MONTHS',
    value: 3, // 3 tháng
  },
  {
    key: '6_MONTHS',
    value: 6, // 6 tháng
  },
  {
    key: '9_MONTHS',
    value: 9, // 9 tháng
  },
  {
    key: '12_MONTHS',
    value: 12, // 12 tháng
  },
];
type RANGE_DATE = {
  key: string;
  label: string;
};
export const RANGES_DATE: RANGE_DATE[] = [
  {
    key: 'TODAY',
    label: 'common.today', // Hôm nay
  },
  {
    key: 'YESTERDAY',
    label: 'common.yesterday', // Hôm qua
  },
  {
    key: 'THIS_WEEK',
    label: 'common.thisWeek', // Tuần này
  },
  {
    key: 'LAST_WEEK',
    label: 'common.lastWeek', // Tuần trước
  },
  {
    key: 'THIS_MONTH',
    label: 'common.thisMonth', // Tháng này
  },
  {
    key: 'LAST_MONTH',
    label: 'common.lastMonth', // Tháng trước
  },
];
// Function to get format by type
export function getDateFormatI18(
  type: keyof (typeof DATE_FORMATS)['COMMON'],
  isVI: boolean = false
): string | null {
  const formats = isVI ? DATE_FORMATS.VI : DATE_FORMATS.COMMON;
  return formats[type] ?? null;
}

/**
 * Danh sách const timestamp mặc định
 * */
export const TIMESTAMP_CONSTS = {
  ONE_YEAR: 31104000000, // 1 năm
  SIX_MONTHS: 15552000000, // 6 tháng
  ONE_MONTH: 2592000000, // 1 tháng
  SEVEN_DAYS: 604800000, // 7 ngày
  ONE_DAY: 86400000, // 1 ngay
  ONE_HOUR: 3600000, // 1 giờ
  THIRTY_MINUTE: 1800000, // 30 phút
  TEN_MINUTE: 600000, // 10 phút
  ONE_MINUTE: 60000, // 1 phút
  THIRTY_SECOND: 30000, // 30 giây
};
