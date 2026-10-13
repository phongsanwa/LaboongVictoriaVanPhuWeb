import { NgModule } from '@angular/core';

import {
  NgbAccordionModule,
  NgbDateAdapter,
  NgbDateParserFormatter,
  NgbDatepickerModule,
  NgbDropdownModule,
  NgbNavModule,
  NgbTimepickerModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';

import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import localeViExtra from '@angular/common/locales/extra/vi';
import { CustomAdapter, CustomDateParserFormatter } from '@core/libs/ng-bs/ng-bs-date-adapter';

registerLocaleData(localeVi, 'vi', localeViExtra);

@NgModule({
  exports: [
    NgbDropdownModule,
    NgbTooltipModule,
    NgbNavModule,
    NgbAccordionModule,
    NgbDatepickerModule,
    NgbTimepickerModule,
  ],
  providers: [
    { provide: NgbDateAdapter, useClass: CustomAdapter },
    { provide: NgbDateParserFormatter, useClass: CustomDateParserFormatter },
  ],
})
export class NgBootstrapModule {}
