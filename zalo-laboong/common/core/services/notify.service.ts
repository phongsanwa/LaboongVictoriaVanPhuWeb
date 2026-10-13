import {Injectable} from '@angular/core';
import {ToastrService} from 'ngx-toastr';
import {isArray, isArrayOrStringMessages, isObject} from '@shared/utils';
import {IToastOptions} from '@shared/models/global';
import {CustomToasterComponent} from '../libs';
import {ConfirmDialogComponent} from '../../shared/components/dialog';
import {ModalCustomService} from '../../shared/services/global';
import {ConfirmDialogNewDesignComponent} from '../../shared/components/dialog/confirm-dialog-new-design.component';

export interface IDialogOptions {
  size?: 'sm'|'lg'|'xl'|string;
  title?: string;
  html?: string;
  content?: string;
  subContent?: string;

  btnCloseDisable?: boolean;
  btnCloseName?: string;
  btnCloseClass?: string;

  btnConfirmName?: string;
  btnConfirmClass?: string;

  backdropClass?: string;
  modalDialogClass?: string;
  windowClass?: string;

  variant?: 'classic' | 'modern';
}

@Injectable({
  providedIn: 'root'
})
export class NotifyService {

  constructor(
    private _toast: ToastrService,
    public ngbModal: ModalCustomService
  ) {
    this._toast.toastrConfig.iconClasses = {
      error: 'ph-x-circle',
      info: 'ph-info',
      success: 'ph-check-circle',
      warning: 'ph-warning',
    };
  }

  /**
   * -------------------------------------------------------------------------------------------------------------------
   *  Notify fast messages common --------------------------------------------------------------------------------------
   * -------------------------------------------------------------------------------------------------------------------
   * */
  errorSystem() {
    this.error('common.messages.systemError')
  }


  showToast(opts: IToastOptions) {
    if (!opts.message && !opts.html) {
      return;
    }

    const config = {
      tapToDismiss: opts.config?.tapToDismiss ?? true,
      closeButton: opts.config?.closeButton ?? false,
      disableTimeOut: opts.config?.disableTimeOut ?? false,
      titleClass: opts.config?.iconClass ? opts.config?.iconClass : '',
      timeOut: 3200,
      enableHtml: true,
      positionClass: 'toast-top-center',
      toastComponent: CustomToasterComponent
    }

    let message = opts.html ? opts.html : '';
    const title = opts.title ? opts.title : '';
    if (!message && opts.message) {
      message = this._getMessages(opts.message)
    }
    this._toast.show(message, title, config, opts.type ?? 'info');
  }

  /**
   * -------------------------------------------------------------------------------------------------------------------
   * Notify color  -----------------------------------------------------------------------------------------------------
   * -------------------------------------------------------------------------------------------------------------------
   * */
  success(messages: string | any[], title = '', html = '') {
    if (!isArrayOrStringMessages(messages)) return;

    this.showToast({message: messages, title, html, type: 'success'})
  }

  error(messages: string | any[], title = '', html = '') {
    if (!isArrayOrStringMessages(messages)) return;

    this.showToast({message: messages, title, html, type: 'error'})
  }

  warning(messages: string | any[], title = '', html = '') {
    if (!isArrayOrStringMessages(messages)) return;

    this.showToast({message: messages, title, html, type: 'warning'})
  }

  info(messages: string | any[], title = '', html = '') {
    if (!isArrayOrStringMessages(messages)) return;

    this.showToast({message: messages, title, html, type: 'info'})
  }

  private _getMessages(messages: any) {
    if (isArray(messages)) {
      return messages.join('<br>');
    } else if (isObject(messages)) {
      return Object.entries(messages).map(([k, err]) => err).join('<br>');
    }

    return messages;
  }

  dialogConfirmDelete(options: IDialogOptions = {}) {
    const variant = options.variant ?? 'classic';
    const cmp = variant === 'modern'
      ? ConfirmDialogNewDesignComponent
      : ConfirmDialogComponent;

    const ref = this.ngbModal.openIntro(cmp, {
      size: options.size ?? 'sm',
      centered: true,
      backdropClass: options.backdropClass || '',
      modalDialogClass: options.modalDialogClass || (variant === 'modern' ? 'modern-confirm' : ''),
      windowClass: options.windowClass || '',
    });

    ref.componentInstance.data = options;
    return ref.closed;
  }
}
