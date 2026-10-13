export interface IPaymentMethod {
  id: string;
  method: string;
  isCustom: number | boolean;
  logo: string | null;
  displayName: string;
  subMethod?: string;
  subInfor?: string;
}

