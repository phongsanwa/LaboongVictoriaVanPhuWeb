import { IResBanner } from '@shared/models/api';

export const MOCK_BANNERS: IResBanner[] = [
  {
    id: 1,
    name: 'Banner khuyến mãi mùa hè',
    image: 'https://i.ibb.co/G4m4pJ5m/bn1.jpg',
    intro: 'Giảm giá lên đến 50%',
    description: 'Chương trình khuyến mãi mùa hè với nhiều ưu đãi hấp dẫn cho khách hàng thân thiết',
    typeVideo: false
  },
  {
    id: 2,
    name: 'Banner khuyến mãi mùa đông',
    image: 'https://i.ibb.co/CKvPps9Z/MAHON-POINT-224532-Web-Banner-1920x600-1-scaled.jpg',
    intro: 'Banner 2',
    description: 'Chương trình khuyến mãi mùa đông với nhiều ưu đãi hấp dẫn cho khách hàng thân thiết',
    typeVideo: false
  }
];
