import { NgModule } from '@angular/core';
import { ToastrModule } from 'ngx-toastr';
import {JsonPipe, NgClass} from "@angular/common";
import {CustomToasterComponent} from './custom-toaster.component';

@NgModule({
   declarations: [CustomToasterComponent],
  imports: [
    ToastrModule.forRoot({
      toastComponent: CustomToasterComponent
    }),
    JsonPipe,
    NgClass
  ],
})
export class NgxToastRootModule {
}
