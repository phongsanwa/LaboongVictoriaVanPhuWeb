import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Toast } from 'ngx-toastr';


@Component({
   selector: 'app-custom-toastr',
   templateUrl: './custom-toaster.component.html',
   styleUrls: ['./custom-toaster.component.scss'],
   encapsulation: ViewEncapsulation.None,
   standalone: false
})
export class CustomToasterComponent extends Toast implements OnInit {
   // Tùy chỉnh các phương thức và thuộc tính ở đây

   alertIcon = '';
   alertClass = '';

   ngOnInit() {
      const { toastrConfig } = this.toastrService;

      if (this.options.titleClass) {
         this.alertIcon = this.options.titleClass
      } else {
         const icon = toastrConfig.iconClasses[this.toastPackage.toastType];
         if (icon) {
            this.alertIcon = icon;
         }
      }

      if (this.toastPackage.toastType) {
         const toastType = this.toastPackage.toastType;
         switch (toastType) {
            case 'error':
               this.alertClass = 'app-toast--error';
               break;
            case 'success':
               this.alertClass = 'app-toast--success';
               break;
            case 'warning':
               this.alertClass = 'app-toast--warning';
               break;
            default:
               this.alertClass = 'app-toast--info';
               break;
         }
      }
   }
}
