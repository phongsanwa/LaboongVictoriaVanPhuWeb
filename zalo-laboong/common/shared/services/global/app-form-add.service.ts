import {Injectable} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {Subject} from 'rxjs';
import {AppService, NavService, NotifyService} from '@core/services';
import {IResponseApi} from '@core/models';
import {ERROR_CODE} from '@core/constants';

type IErrorInvalid = {
  control: FormControl,
  messageError?: string,
}

/**
 * Description handler
 * - Handler show errors common.
 * */
@Injectable({
  providedIn: "any",
})
export class AppFormAddService {
  destroyed = new Subject();
  disabledSubmit = false; // State đánh dấu disabled button submit
  takeWhile = true;

  constructor(
    public appService: AppService,
    public notifyService: NotifyService,
    public navService: NavService,
    public formBuilder: FormBuilder,
  ) {

  }

  getDestroySubs() {
    this.destroyed.next(null);
    this.destroyed.complete();
  }

  /**
   * ------------------------------------------------------------------------------------------------------------------
   * Form logic handle ------------------------------------------------------------------------------------------------
   * ------------------------------------------------------------------------------------------------------------------
   * */
  createForm<T = FormGroup>(controls: T | any) {
    return this.formBuilder.group(controls) as T
  }

  handlerError(res: IResponseApi<any>, form: FormGroup) {
    if (res.errorCode == ERROR_CODE.INVALID_FORM_FIELDS) {
      for (const [err, message] of Object.entries(res.messages)) {
        if (typeof form.controls[err] != 'undefined') {
          form.controls[err].setErrors({
            serverError: { message: message }
          });
        }
      }
    } else if (res.errorCode !== ERROR_CODE.PAGE_401) {
      this.notifyService.warning(res.messages);
    }
  }

  /**
   * Kiểm tra có thỏa mãn các điều kiện validator của form không
   * */
  submitFromHandle(form: FormGroup): boolean {
    form.markAllAsTouched();
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control) {
        control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      }
    });
    form.updateValueAndValidity({ emitEvent: true });
    if (form.valid) {
      this.disabledSubmit = true;
      return true;
    }
    return false;
  }
}
