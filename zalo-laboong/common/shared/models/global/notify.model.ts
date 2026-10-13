export type IToastAlertHtmlConfig = {
   html: string,
   title?: string,
   type?: 'danger' | 'warning' | 'info' | 'success'
}

type IConfigToast = {
   tapToDismiss?: boolean,
   closeButton?: boolean,
   disableTimeOut?: boolean,
   iconClass?: string,
}
export type IToastOptions = {
   message?: string | any[],
   html?: string, // Hiển thị dạng html,
   title?: string,
   type?: 'error' | 'info' | 'success' | 'warning',
   config?: IConfigToast
}
