import { isArray } from './cast.utils';

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

export function convertValueToArray(value: any) {
   if (!value && !isArray(value)) {
      return [];
   }
   if (value && !isArray(value)) {
      return [value]
   }
   return value
}
