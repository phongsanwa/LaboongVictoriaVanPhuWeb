import { IResBanner } from '@shared/models/api';

export const MOCK_BANNERS: IResBanner[] = [
  {
    id: 1,
    name: 'Banner khuyến mãi mùa hè',
    imageUrl: 'https://i.pinimg.com/736x/a1/7c/26/a17c2623bdc8ef53b0704f7a5d8702a6.jpg',
    description: 'Chương trình khuyến mãi mùa hè với nhiều ưu đãi hấp dẫn cho khách hàng thân thiết',
    content: '',
    displayOrder: 1
  },
  {
    id: 2,
    name: 'Banner sản phẩm mới',
    imageUrl: 'https://i.pinimg.com/736x/73/8d/97/738d97a9d12ffabdcdf0d237bcfdec5e.jpg',
    description: 'Khám phá những sản phẩm thời trang mới nhất từ các thương hiệu hàng đầu',
    content: '',
    displayOrder: 2
  }
];
