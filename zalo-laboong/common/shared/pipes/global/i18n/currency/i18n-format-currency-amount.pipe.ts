import {OnDestroy, Pipe, PipeTransform} from "@angular/core";
import {CurrencyPipe} from "@angular/common";
import {BusinessI18nService, IOtpPipeI18n} from "@core/libs";
import {castFloat, validIsNumber} from "@shared/utils";
import {BaseNumberImpureI18nPipe} from "@shared/pipes/global/i18n/base-number-impure-i18n.pipe";


type OptCurrencyAmount = IOtpPipeI18n;

@Pipe({
  standalone: true,
  name: 'i18nCurrencyAmount'
})
export class I18nFormatCurrencyAmountPipe extends BaseNumberImpureI18nPipe<OptCurrencyAmount> implements PipeTransform, OnDestroy {
  constructor(
    private currencyPipe: CurrencyPipe,
    businessI18nService: BusinessI18nService,
  ) {
    super(businessI18nService);
  }

  ngOnDestroy() {
    this.destroy()
  }

  protected formatValue(value: any, opts: OptCurrencyAmount = {}): string | null {
    if (castFloat(value) == 0 && !opts.showZeroValue) {
      return null;
    }
    if (!validIsNumber(value)) {
      return null;
    }

    if (opts.abs) {
      value = Math.abs(value);
    }

    const configs = this.configs;
    let symbolDisplay: string = 'symbol'

    if (opts.showSymbol === false) {
      symbolDisplay = configs.currency.display !== 'none' ? configs.currency.display : 'code';
    }

    return this.currencyPipe.transform(
      value,
      configs.currency.code, // Loại tiền tệ (VD: 'VND')
      symbolDisplay,
      undefined,
      configs.locale
    );
  }

  /**
   * Optional: So sánh opts cũ - mới (shallow check)
   * để biết có cần re-format hay không
   */
  protected override isSameOpts(oldOpts?: OptCurrencyAmount, newOpts?: OptCurrencyAmount): boolean {
    if (oldOpts === newOpts) return true;
    if (!oldOpts || !newOpts) return false;

    return (
      oldOpts.showZeroValue === newOpts.showZeroValue &&
      oldOpts.abs === newOpts.abs
    );
  }
}

