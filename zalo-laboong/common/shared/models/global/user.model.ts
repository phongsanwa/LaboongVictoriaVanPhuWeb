export type AllScope =
  | 'scope.userInfo'
  | 'scope.userLocation'
  | 'scope.userPhonenumber'

export interface IGetSettingReturn {
  authSetting: Record<string, boolean>;
}

export interface IUserPhoneRequestParams {
  access_token: string;
  code: string;
}

export interface IZmaGetPhoneNumberReturns {
  token: string;
}

export interface IResPhoneNumber {
  phone: string
}

export interface IUserFeedBackRequestParams {
  name: string;
  address: string;
  email: string;
  mobile: string;
  content: string;
}

export interface ISendMessageZmaParams {
  messageToken: string,
  orderCode: string,
  amount: number,
  userId: string
}
