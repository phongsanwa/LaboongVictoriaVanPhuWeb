import {HttpParameterCodec, HttpParams} from "@angular/common/http";
import {Params} from "@angular/router";
import {getSystemInfo} from 'zmp-sdk/apis';

export type ZMPPlatform = 'android' | 'ios' | 'web';

export const isArray = Array.isArray || ((arr) => arr && typeof arr.length === 'number');

export function isObject(o: any): boolean {
  return o != null && typeof o === 'object'
}

function normalizePlatform(p?: string): ZMPPlatform {
  const s = (p || '').toLowerCase();
  if (s.includes('android')) return 'android';
  if (s.includes('ios') || s.includes('iphone') || s.includes('ipad')) return 'ios';
  return 'web';
}

function detectFromUA(): ZMPPlatform {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  return 'web';
}

/** Lấy platform */
export function getPlatformSafe(): ZMPPlatform {
  try {
    const info = getSystemInfo();
    return normalizePlatform(info?.platform as string | undefined);
  } catch {
    return detectFromUA();
  }
}

/** Kiểm tra platform hiện tại có khớp target không */
export function isPlatform(target: ZMPPlatform): boolean {
  return getPlatformSafe() === target;
}

export function parseParams(params = {}): HttpParams {
  let httpParams = new HttpParams({encoder: new UriEncoder()});
  serialize(params);
  return httpParams;

  function serialize(data: any, prefix = '', topLevel = true) {
    if (isObject(data)) {
      for (const key in data) {
        if (data[key] || data[key] == 0)
          serialize(data[key], prefix + (topLevel ? '' : '[') + key + (topLevel ? '' : ']'), false);
      }
    } else if (isArray(data)) {
      for (const key in data) {
        if (data[key] || data[key] == 0)
          serialize(data[key], prefix + '[' + (isObject(data[key]) ? key : '') + ']', false);
      }
    } else {
      httpParams = httpParams.set(prefix, (data == null ? '' : data));
    }
  }
}

export class UriEncoder implements HttpParameterCodec {
  encodeKey(key: string): string {
    return encodeURIComponent(key);
  }

  encodeValue(key: string): string {
    return encodeURIComponent(key);
  }

  decodeKey(key: string): string {
    return decodeURIComponent(key);
  }

  decodeValue(key: string) {
    return decodeURIComponent(key);
  }
}

export function castFloat(value: string | number | any): number {
  if (isNaN(value) || !value) {
    return 0;
  }
  return parseFloat(String(value));
}

export function castFloatFixed(value: string | number) {
  return parseFloat(String(value)).toFixed(2);
}

export function castInt(value: string | number | any): number {
  if (isNaN(value) || !value) {
    return 0;
  }
  return parseInt(String(value));
}

export function castString(value: string | number): string {
  return String(value);
}


export function arraysAreEqual(arrA: any[], arrB: any[]) {
  if (!isArray(arrA) || !isArray(arrB)) {
    return false;
  }
  if (arrA.length !== arrB.length) {
    return false;
  }
  const allElementsInAExistInB = arrA.every(itemA => arrB.includes(itemA));
  const allElementsInBExistInA = arrB.every(itemB => arrA.includes(itemB));
  return allElementsInAExistInB && allElementsInBExistInA;
}


export function parseUrlFromParamsUri(baseUrl?: string, queryParams?: Params) {
  if (!baseUrl) {
    return '';
  }
  const searchParams = new URLSearchParams(queryParams ? queryParams : {});
  return `${baseUrl}?${searchParams.toString()}`;
}


export function convertValueToArray(value: any) {
  if (!value && !isArray(value)) {
    return [];
  }
  if (value && !isArray(value)) {
    return [value]
  }
  return value
}


export function flattenUriConsts(obj: Record<any, any>): string[] {
  let result: string[] = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      result = result.concat(flattenUriConsts(obj[key]));
    } else {
      result.push(obj[key]);
    }
  }
  return result;
}

/**
 * Hàm tính toán chia và làm tròn lên.
 *  + Hiện đang dùng nhiều ở tính huống tính số page dựa vào limit & totalItems
 * */
export function ceilDivision(dividend: number, divisor: number) {
  if (!dividend || !divisor) return 0;

  if (dividend < divisor) {
    return 1;
  }

  return Math.ceil(dividend / divisor);
}

export const isAndroid = () => isPlatform('android');
export const isIOS = () => isPlatform('ios');
export const isWeb = () => isPlatform('web');
