import { isArray } from "./cast.utils";



export function validateEmail(email: string) {
   const regexPattern = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
   return regexPattern.test(email);
}

/**
 * Hàm kiểm tra số điện thoại có hợp lệ
 * @param mobile
 * @param isCkLength (nếu bằng true thì sẽ áp dụng cho SĐT nước ngoài)
 * */
export function validateMobile(mobile: string, isCkLength = false) {
   mobile = mobile.replace(/\s/g, '');
   mobile = mobile.replace(/\./g, '');
   mobile = mobile.replace(/,/g, '');
   mobile = mobile.replace(/^(\+84|84|\(84\))/, '0');

   if (/^0/.exec(mobile) == null) {
      mobile = '0' + mobile;
   }
   const min = isCkLength ? 4 : 10;
   const max = isCkLength ? 20 : 12;
   return !!(mobile && (mobile.length >= min && mobile.length <= max));
}

/**
 * kiểm tra định dạng ngày hợp lệ:
 * y-m-d
 * @param dateString
 */
export function validateDate(dateString: string) {
   const regex = /^\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])$/;
   return regex.test(dateString);
}

/**
 * Kiểm tra giá trị có phải là 1 số hợp lệ ?
 * */
export function validIsNumber(value: any) {
   return !isNaN(Number(value))
}

/**
 * Kiểm tra messages có phải là string hoặc 1 mảng không empty
 * */
export function isArrayOrStringMessages(mess: any): boolean {
   return (isArray(mess) && mess.length) || mess
}
