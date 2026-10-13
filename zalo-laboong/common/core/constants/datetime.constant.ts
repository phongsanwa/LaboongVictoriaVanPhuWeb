

export const DISPLAY_DATE_FORMAT = 'DD/MM/YYYY';

export const DISPLAY_DATE_FORMAT_MOMENT = 'dd/mm/yy';

export const EXCEPTION_DATES = ["0000-00-00", "00-00-0000", "9999-12-31", "0000-00-00 00:00:00"];


/**
 * Khai báo các định dạng khi dùng formart moment sau cần check các const thừa không dùng nữa
 * */

export const DISPLAY_SHORT_MONTHYEAR_MOMENT = 'MM/YYYY';

export const COMMON_DATE_MOMENT = 'YYYY-MM-DD';


// 2 Format của date và time server đang trả về
export const API_COMMON_DATE = 'YYYY-MM-DD';
export const API_COMMON_DATE_TIME = 'YYYY-MM-DD HH:mm:ss';
export const API_COMMON_DATE_MONTH_YEAR = 'YYYY-MM';


type RANGE_DATE = {
   key: string,
   label: string
}
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
      label: 'common.thisMonth' // Tháng này
   },
   {
      key: 'LAST_MONTH',
      label: 'common.lastMonth' // Tháng trước
   },
]

export const RANGES_MONTH: { key: string, value: number }[] = [
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
]

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * Xử lý locales date & datetime
 * ---------------------------------------------------------------------------------------------------------------------
 * */
export const DATE_FORMATS_PHP = {
   COMMON_DATE: 'Y-m-d H:i:s',      // 2024-12-26 15:30:00
   MINIMAL_DATE: 'd',               // 26
   TINY_DATE: 'm/d',                // 12/26
   SHORT_DATE: 'm/d/Y',             // 12/26/2024
   LONG_DATE: 'M d, Y',             // Dec 26, 2024
   FULL_DATE: 'l, F d, Y',          // Thursday, December 26, 2024
   TINY_DATE_TIME: 'm/d h:i A',     // 12/26 3:30 PM
   SHORT_DATE_TIME: 'm/d/Y h:i A',  // 12/26/2024 3:30 PM
}

export const DATE_FORMATS = {
   COMMON: {
      COMMON_DATE: 'YYYY-MM-DD HH:mm:ss',   // 2024-12-26 15:30:00
      MINIMAL_DATE: 'DD',                   // 26
      TINY_DATE: 'MM/DD',                   // 12/26
      SHORT_DATE: 'MM/DD/YYYY',             // 12/26/2024
      LONG_DATE: 'MMM DD, YYYY',            // Dec 26, 2024
      FULL_DATE: 'dddd, MMMM DD, YYYY',     // Thursday, December 26, 2024
      TINY_DATE_TIME: 'MM/DD h:mm A',       // 12/26 3:30 PM
      SHORT_DATE_TIME: 'MM/DD/YYYY h:mm A', // 12/26/2024 3:30 PM
      SHORT_MONTH: 'MM/YYYY',                // 12/2024
      SHORT_DATE_HOUR_MINUTE: 'MM/DD/YYYY HH:mm', // 12/26/2024 15:30
      SHORT_DATE_SHORT_TIME: 'MM/DD/YYYY HH:mm:ss', // 12/26/2024 15:30:00
      LONG_TIME: 'HH:mm:ss',   // 15:30:00
      SHORT_TIME: 'mm:ss',   // 30:00
   },
   VI: {
      COMMON_DATE: 'YYYY-MM-DD HH:mm:ss',   // 2024-12-26 15:30:00
      MINIMAL_DATE: 'DD',                   // 26
      TINY_DATE: 'DD/MM',                   // 26/12
      SHORT_DATE: 'DD/MM/YYYY',             // 26/12/2024
      LONG_DATE: 'DD MMM, YYYY',            // 26 Dec, 2024
      FULL_DATE: 'dddd, MMMM DD, YYYY', // Thứ năm, ngày 26 tháng 12 năm 2024
      TINY_DATE_TIME: 'DD/MM HH:mm',        // 26/12 15:30
      SHORT_DATE_TIME: 'DD/MM/YYYY HH:mm',  // 26/12/2024 15:30
      SHORT_MONTH: 'MM/YYYY',                // 12/2024
      SHORT_DATE_HOUR_MINUTE: 'DD/MM/YYYY HH:mm', // 26/12/2024 15:30
      SHORT_DATE_SHORT_TIME: 'DD/MM/YYYY HH:mm:ss', // 26/12/2024 15:30:00
      LONG_TIME: 'HH:mm:ss',   // 15:30:00
      SHORT_TIME: 'mm:ss',   // 30:00
   }
};

// Function to get format by type
export function getDateFormatI18(type: keyof typeof DATE_FORMATS['COMMON'], isVI: boolean = false): string | null {
   const formats = isVI ? DATE_FORMATS.VI : DATE_FORMATS.COMMON;
   return formats[type] ?? null;
}
