import { inject, Injectable } from '@angular/core';
import * as moment from "moment";
import { BehaviorSubject } from "rxjs";
import {
  IBusinessI18nConfig,
  LANGUAGE_ITEM,
  LOCALE_CODE,
  LOCALE_TO_MAPPING_SERVER,
  PERCENT_DECIMAL_DEFAULT
} from './business-i18n.model';
import {ApiService, NotifyService, ZmaNativeStorageService} from '../../services';
import { TranslocoService } from "@jsverse/transloco";
import {ISelectOption} from '../../models/app.model';
import {ENVIRONMENT} from '@core/tokens/environment.token';


@Injectable({
   providedIn: 'root',
})
export class BusinessI18nService {
   private env = inject(ENVIRONMENT);
   isLoadLocaleConfig = false;

   private languageSubject = new BehaviorSubject<LOCALE_CODE>(
     (this.env.language?.code ?? 'vi') as LOCALE_CODE
   )
   language$ = this.languageSubject.asObservable();

   private configsSubject = new BehaviorSubject<IBusinessI18nConfig>(this.getConfigDefault())
   configs$ = this.configsSubject.asObservable();

   constructor(
     private _transLoco: TranslocoService,
     private _apiService: ApiService,
     private notifyService: NotifyService,
     private zmaStorage: ZmaNativeStorageService,
   ) {
      this.initialize();
   }

   /**
    * ------------------------------------------------------------------------------------------------------------
    * Init ------------------------------------------------------------------------------------------------------
    * ------------------------------------------------------------------------------------------------------------
    * */
   private initialize() {
      let langDefault = this.zmaStorage.getPure('languageDefault');

      // Sử dụng giá trị mặc định nếu `langDefault` không hợp lệ
      const language = langDefault && typeof langDefault === 'string' ? langDefault : (this.env.language?.code ?? 'vi');

      this.setLanguage(language, true);
   }

   /**
    * ------------------------------------------------------------------------------------------------------------
    * Locale ---------------------------------------------------------------------------------------------------
    * ------------------------------------------------------------------------------------------------------------
    * */
   getLocaleConfigs(): IBusinessI18nConfig {
      return this.configsSubject.value;
   }

   setLocaleConfigs(newConfigs: IBusinessI18nConfig): void {
      this.configsSubject.next(newConfigs);
   }

   getLocale(): string {
      const { locale } = this.getLocaleConfigs()
      return locale;
   }

   private getConfigDefault(): IBusinessI18nConfig {
      return {
         locale: 'vi-VN',
         currency: {
            code: 'VND',
            display: '',
         },
         timezone: 'Asia/Ho_Chi_Minh',
         percentDecimals: PERCENT_DECIMAL_DEFAULT
      }
   }

   private _getLocaleCodeMapping(locale: string) {
      return LOCALE_TO_MAPPING_SERVER[locale.toLowerCase()] as LOCALE_CODE;
   }

   /**
    * ------------------------------------------------------------------------------------------------------------
    * API ---------------------------------------------------------------------------------------------------
    * ------------------------------------------------------------------------------------------------------------
    * */
   // Load cài đặt locale DN
   loadBusinessLocaleSettings() {
      if (this.isLoadLocaleConfig) {
         return;
      }
      // @TODO NVN Example xử lý call API tại đây

      // const params = {
      //    tab: 'getBusinessLocaleSettings',
      //    businessId: this._apiService.appService.getBusinessId,
      // }
      // const uri = `${ uriConsts.store.MANAGE_LOAD }?tab=getBusinessLocaleSettings`
      // this._apiService.postRequest<IResponseApi<IBusinessLocaleSettings>>(uri, params).subscribe({
      //    next: res => {
      //       if (res.code) {
      //          const setting = res.data;
      //
      //          this.setLocaleConfigs({
      //             locale: this._getLocaleCodeMapping(setting.country),
      //             currency: {
      //                code: setting.currency.code,
      //                display: setting.currency.display,
      //             },
      //             timezone: setting.timezone
      //          })
      //       }
      //    },
      //    complete: () => {
      //       this.isLoadLocaleConfig = true;
      //    }
      // })
   }


   /**
    * ------------------------------------------------------------------------------------------------------------
    * Language ---------------------------------------------------------------------------------------------------
    * ------------------------------------------------------------------------------------------------------------
    * */
   setLanguage(code: string, isDefault = false) {
      if (!code){
         code = this.env.language?.code ?? 'vi';
      }
      if (!isDefault) {
         this.notifyService.success('common.notify.settingSuccess');
      }

      moment.locale(code);
      this.languageSubject.next(code as LOCALE_CODE);
      this._transLoco.setActiveLang(code);
      this.zmaStorage.setPure('languageDefault', code);
   }

   getLanguages(): ISelectOption[] {
      return (this.env.language?.availableLangs ?? []).map(item => {
         return {
            value: item.id,
            label: item.label,
         }
      })
   }

   getLanguage(): LANGUAGE_ITEM | undefined {
      return (this.env.language?.availableLangs ?? []).find((l: any) => l.id == this.getLanguageCode())
   }

   getLanguageCode(): LOCALE_CODE {
      return this.languageSubject.value;
   }

}
