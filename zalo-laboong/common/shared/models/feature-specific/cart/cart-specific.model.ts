import {IOrderGift} from '../../api';

export interface ICartItem {
  productId: number, // ID sản phẩm độc lập | SP con
  productParentId: string | null, // ID sản phẩm cha
  name: string,
  image: string,
  quantity: number,
  price: number,
  priceOld: number,
  sizeChecked: string | null,  // Kích thước được chọn
  colorChecked: string | null, // Màu sắc được chọn
  isChecked?: boolean, // SP chọn để đặt hàng
  gifts?: IOrderGift[];
}

export interface ICartData {
  description: string,
  totalAmount: number,
  totalQuantities: number,
  carrier: ICarrier,
  items: Record<string, ICartItem>
}

export interface ICarrier {
  id: number,
  carrierName: string,
  logo: string,
  serviceId: number,
  serviceName: string,
  serviceCode: string,
  serviceDesc: string,
  declaredFee: number,
  customerShipFee: number,
}
