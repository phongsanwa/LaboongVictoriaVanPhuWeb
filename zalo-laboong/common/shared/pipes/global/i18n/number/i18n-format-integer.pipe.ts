import { OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {BusinessI18nService, IOtpPipeI18n} from "@core/libs";
import { castFloat, validIsNumber } from "@shared/utils";
import { BaseNumberImpureI18nPipe } from "@shared/pipes/global/i18n/base-number-impure-i18n.pipe";

export type IntegerOpts = IOtpPipeI18n;

@Pipe({
   standalone: true,
   name: 'i18nInteger'
})
export class I18nFormatIntegerPipe extends BaseNumberImpureI18nPipe<IntegerOpts> implements PipeTransform, OnDestroy {

   constructor(
     businessI18nService: BusinessI18nService,
     private decimalPipe: DecimalPipe
   ) {
      super(businessI18nService);
   }

   ngOnDestroy() {
      this.destroy()
   }

   /**
    * Logic format riêng cho integer
    */
   protected formatValue(value: any, opts: IntegerOpts = {}): string | null {
      if (castFloat(value) == 0 && !opts.showZeroValue) {
         return null;
      }
      if (!validIsNumber(value)) {
         return null;
      }

      // 2. abs
      if (opts.abs) {
         value = Math.abs(value);
      }

      // 4. Dùng decimalPipe để hiển thị số nguyên
      // digitsInfo = '1.0-0' => không có phần thập phân
      const digitsInfo = '1.0-0';
      const result = this.decimalPipe.transform(
        value,
        digitsInfo,
      );

      return result ??  null;
   }

   /**
    * Optional: So sánh opts cũ - mới (shallow check)
    * để biết có cần re-format hay không
    */
   protected override isSameOpts(oldOpts?: IntegerOpts, newOpts?: IntegerOpts): boolean {
      if (oldOpts === newOpts) return true;
      if (!oldOpts || !newOpts) return false;

      return (
        oldOpts.showZeroValue === newOpts.showZeroValue &&
        oldOpts.abs === newOpts.abs
      );
   }
}
