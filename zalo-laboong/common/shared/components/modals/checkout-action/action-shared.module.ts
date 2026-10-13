import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {SharedCommonModule} from '@shared/shared-common.module';
import {AddressModalComponent} from './addressModal.component';
import {CarrierOffcanvasComponent} from './carrierModal.component';
import {BranchOffcanvasComponent} from './branchModal.component';
import {LocationDynamicComponent} from '../../location-group';
import {I18nFormatCurrencyAmountPipe} from '../../../pipes/global';

const COMPONENTS = [AddressModalComponent, CarrierOffcanvasComponent, BranchOffcanvasComponent];

@NgModule({
  declarations: COMPONENTS,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SharedCommonModule, LocationDynamicComponent, I18nFormatCurrencyAmountPipe],
  exports: COMPONENTS,
})
export class ActionSharedModule {
}
