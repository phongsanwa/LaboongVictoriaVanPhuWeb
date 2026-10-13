import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedCommonModule } from '@shared/shared-common.module';
import { LocationDynamicComponent } from '@shared/components';

import { AddressModalComponent } from './addressModal.component';
import { CarrierOffcanvasComponent } from './carrierModal.component';
import { BranchOffcanvasComponent } from './branchModal.component';

const COMPONENTS = [AddressModalComponent, CarrierOffcanvasComponent, BranchOffcanvasComponent];

@NgModule({
  declarations: COMPONENTS,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SharedCommonModule, LocationDynamicComponent],
  exports: COMPONENTS,
})
export class ActionSharedModule {}
