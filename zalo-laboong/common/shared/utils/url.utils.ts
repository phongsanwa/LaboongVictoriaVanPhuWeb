import { Params } from "@angular/router";

export function parseUrlFromParamsUri(baseUrl?: string, queryParams?: Params) {
   if (!baseUrl) {
      return '';
   }
   const searchParams = new URLSearchParams(queryParams ? queryParams : {});
   return `${ baseUrl }?${ searchParams.toString() }`;
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
