export const isArray = Array.isArray || ((arr) => arr && typeof arr.length === 'number');

export function isObject(o: any): boolean {
   return o != null && typeof o === 'object'
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
