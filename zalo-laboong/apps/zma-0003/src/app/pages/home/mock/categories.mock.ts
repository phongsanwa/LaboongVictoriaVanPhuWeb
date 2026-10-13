import { IResLoadCategory } from '@shared/models/api';

export const MOCK_CATEGORIES: IResLoadCategory[] = [
  {
    id: '1',
    parentId: '',
    code: 'DU_LICH_NOI_DIA',
    name: 'Du lịch nội địa',
    viewLink: '/product/category?id=1',
    image: 'https://i.ex-cdn.com/vovgiaothong.vn/files/f1/Sites/1/media/letung/images/2021/thumbnaildlnoidia-1595563809_750x0.jpg',
    description: 'Khám phá vùng đất miền Bắc với các điểm đến hấp dẫn',
    childs: [
      {
        id: '11',
        parentId: '1',
        code: 'TOUR_HA_NOI',
        name: 'Tour Hà Nội',
        viewLink: '/product/category?id=11',
        image: 'https://via.placeholder.com/150/2980b9/ffffff?text=Ha+Noi',
        description: 'Du lịch thủ đô ngàn năm văn hiến'
      },
      {
        id: '12',
        parentId: '1',
        code: 'TOUR_HA_LONG',
        name: 'Tour Hạ Long',
        viewLink: '/product/category?id=12',
        image: 'https://via.placeholder.com/150/2980b9/ffffff?text=Ha+Long',
        description: 'Vịnh Hạ Long - kỳ quan thiên nhiên thế giới'
      }
    ]
  },
  {
    id: '2',
    parentId: '',
    code: 'DU_LICH_QUOC_TE',
    name: 'Du lịch quốc tế',
    viewLink: '/product/category?id=2',
    image: 'https://datviettour.com.vn/uploads/images/tin-tuc-SEO-chau-au/tong-hop/danh-thang/kinh-nghiem-du-lich-chau-au-lan-dau.jpg',
    description: 'Trải nghiệm vùng đất di sản miền Trung',
    childs: [
      {
        id: '21',
        parentId: '2',
        code: 'TOUR_HUE',
        name: 'Tour Huế',
        viewLink: '/product/category?id=21',
        image: 'https://via.placeholder.com/150/c0392b/ffffff?text=Hue',
        description: 'Cố đô Huế - nơi lưu giữ văn hóa triều Nguyễn'
      },
      {
        id: '22',
        parentId: '2',
        code: 'TOUR_DA_NANG',
        name: 'Tour Đà Nẵng',
        viewLink: '/product/category?id=22',
        image: 'https://via.placeholder.com/150/c0392b/ffffff?text=Da+Nang',
        description: 'Thành phố đáng sống nhất Việt Nam'
      }
    ]
  },
];
