import {NgModule} from '@angular/core';
import {CommonModule, CurrencyPipe, DecimalPipe} from '@angular/common';
import {RouterModule} from '@angular/router';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {
  DateI18nPipe,
  I18nFormatCurrencyAmountPipe,
  I18nFormatDecimalPipe,
  I18nFormatIntegerPipe,
  I18nFormatPercentDecimalPipe, ShortNumberPipe
} from './pipes/global';
import {AppSpinnerComponent} from './components';
import {NgBootstrapModule} from '@core/libs';
import {AutoNumericComponent} from './components';
import {FloatLabel} from 'primeng/floatlabel';
import {InputNumber} from 'primeng/inputnumber';
import {UniversalSlideComponent} from './components/actions';
import {TranslocoModule} from '@jsverse/transloco';
import {NavTabsComponent} from './components/app-nav-tabs/app-nav-tab.component';
import {SpinnerWithLogoComponent} from './components/spinner/spinner-with-logo/spinner-with-logo.component';
import {NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle} from '@ng-bootstrap/ng-bootstrap';
import {ConfirmDialogComponent} from './components/dialog';
import {ConfirmDialogNewDesignComponent} from './components/dialog/confirm-dialog-new-design.component';

const COMPONENTS: any[] = [
  AutoNumericComponent,
  ConfirmDialogComponent,
  ConfirmDialogNewDesignComponent
]

const COMPONENTS_DYNAMIC: any[] = []

const COMPONENTS_ALONE: any[] = [
  UniversalSlideComponent,
  NavTabsComponent
]

const DIRECTIVES: any[] = []

const PIPES: any[] = []

const PIPES_I18N: any[] = []

const MODULES: any[] = [
  CommonModule,
  RouterModule,
  FormsModule,
  ReactiveFormsModule,
  TranslocoModule,
  NgBootstrapModule,
  FloatLabel,
  InputNumber,
  NgbDropdown,
  NgbDropdownToggle,
  NgbDropdownMenu,
  NgbDropdownItem,
];

const MODULES_DYNAMIC: any[] = [];

const IMPORT_ALONE: any[] = [
  DateI18nPipe,
  I18nFormatDecimalPipe,
  I18nFormatCurrencyAmountPipe,
  I18nFormatIntegerPipe,
  I18nFormatPercentDecimalPipe,
  AppSpinnerComponent,
  SpinnerWithLogoComponent,
];

@NgModule({
  declarations: [
    ...COMPONENTS,
    ...COMPONENTS_DYNAMIC,
    ...DIRECTIVES,
    ...PIPES,
    ...PIPES_I18N,
  ],
  exports: [
    ...MODULES,
    ...COMPONENTS,
    ...COMPONENTS_DYNAMIC,
    ...DIRECTIVES,
    ...PIPES,
    ...PIPES_I18N,
    ...IMPORT_ALONE,
    ...COMPONENTS_ALONE,
  ],
  imports: [
    ...MODULES,
    // ...PIPES,
    ...MODULES_DYNAMIC,
    ...IMPORT_ALONE,
    ...COMPONENTS_ALONE,
  ],
  providers: [
    CurrencyPipe,
    DecimalPipe,
    ...PIPES_I18N,
    ...IMPORT_ALONE
  ]
})

export class SharedCommonModule {

}
