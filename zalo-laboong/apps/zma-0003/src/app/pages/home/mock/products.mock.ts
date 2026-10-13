import { IResProduct } from '@shared/models/api';

export const MOCK_PRODUCTS: IResProduct[] = [
  {
    id: 1,
    parentId: '',
    code: 'TOUR_HL_001',
    name: 'Tour Hạ Long 2N1Đ - Du thuyền 5 sao',
    status: 1,
    category: {
      id: 12,
      name: 'Tour Hạ Long'
    },
    prices: {
      contactPrice: 0,
      price: 2990000,
      wholesale: 0,
      priceOld: 3990000,
      priceAfterDiscount: 2990000,
      calcDiscountPercent: 25
    },
    vat: 0,
    image: 'https://cdn2.ivivu.com/2024/05/28/15/ivivu-velar-of-the-sea-ha-long-4.jpg',
    images: {
      others: [
        'https://via.placeholder.com/800x600/3498db/ffffff?text=Ha+Long+1',
        'https://via.placeholder.com/800x600/2980b9/ffffff?text=Ha+Long+2',
        'https://via.placeholder.com/800x600/1f618d/ffffff?text=Ha+Long+3'
      ]
    },
    brand: {
      id: 1,
      name: 'Vietravel'
    },
    type: 1,
    unit: 'Khách',
    inventory: {
      remain: 15,
      shipping: 0,
      damaged: 0,
      holding: 5,
      available: 10
    },
    createdDateTime: '2024-11-20T08:00:00Z',
    availableColors: [],
    availableSizes: [],
    childs: [],
    options: {
      duration: '2 ngày 1 đêm',
      departure: 'Hà Nội',
      vehicle: 'Ô tô + Du thuyền',
      meal: '2 bữa chính + 1 bữa phụ'
    }
  },
  {
    id: 2,
    parentId: '',
    code: 'TOUR_SP_002',
    name: 'Tour Sapa 3N2Đ - Chinh phục Fansipan',
    status: 1,
    category: {
      id: 41,
      name: 'Tour Sapa'
    },
    prices: {
      contactPrice: 0,
      price: 3490000,
      wholesale: 0,
      priceOld: 4490000,
      priceAfterDiscount: 3490000,
      calcDiscountPercent: 22
    },
    vat: 0,
    image: 'https://api.alsuco.vn/uploads/images/upload-1746674857912-973909387.webp',
    images: {
      others: [
        'https://via.placeholder.com/800x600/2ecc71/ffffff?text=Sapa+1',
        'https://via.placeholder.com/800x600/27ae60/ffffff?text=Sapa+2',
        'https://via.placeholder.com/800x600/1e8449/ffffff?text=Sapa+3'
      ]
    },
    brand: {
      id: 2,
      name: 'Saigontourist'
    },
    type: 1,
    unit: 'Khách',
    inventory: {
      remain: 20,
      shipping: 0,
      damaged: 0,
      holding: 8,
      available: 12
    },
    createdDateTime: '2024-11-18T10:00:00Z',
    availableColors: [],
    availableSizes: [],
    childs: [],
    options: {
      duration: '3 ngày 2 đêm',
      departure: 'Hà Nội',
      vehicle: 'Xe limousine + Cáp treo',
      meal: '5 bữa chính'
    }
  },
  {
    id: 3,
    parentId: '',
    code: 'TOUR_DN_003',
    name: 'Tour Đà Nẵng - Hội An 4N3Đ',
    status: 1,
    category: {
      id: 22,
      name: 'Tour Đà Nẵng'
    },
    prices: {
      contactPrice: 0,
      price: 4990000,
      wholesale: 0,
      priceOld: 6490000,
      priceAfterDiscount: 4990000,
      calcDiscountPercent: 23
    },
    vat: 0,
    image: 'https://datviettour.com.vn/uploads/images/mien-trung/hoi-an/hinh-danh-thang/du-lich-hoi-an-800px.jpg',
    images: {
      others: [
        'https://via.placeholder.com/800x600/e74c3c/ffffff?text=Da+Nang+1',
        'https://via.placeholder.com/800x600/c0392b/ffffff?text=Da+Nang+2',
        'https://via.placeholder.com/800x600/a93226/ffffff?text=Da+Nang+3'
      ]
    },
    brand: {
      id: 1,
      name: 'Vietravel'
    },
    type: 1,
    unit: 'Khách',
    inventory: {
      remain: 25,
      shipping: 0,
      damaged: 0,
      holding: 10,
      available: 15
    },
    createdDateTime: '2024-11-15T14:30:00Z',
    availableColors: [],
    availableSizes: [],
    childs: [],
    options: {
      duration: '4 ngày 3 đêm',
      departure: 'TP.HCM',
      vehicle: 'Máy bay + Xe du lịch',
      meal: '6 bữa chính'
    }
  },
  {
    id: 4,
    parentId: '',
    code: 'TOUR_PQ_004',
    name: 'Tour Phú Quốc 3N2Đ - Nghỉ dưỡng cao cấp',
    status: 1,
    category: {
      id: 32,
      name: 'Tour Phú Quốc'
    },
    prices: {
      contactPrice: 0,
      price: 5990000,
      wholesale: 0,
      priceOld: 7990000,
      priceAfterDiscount: 5990000,
      calcDiscountPercent: 25
    },
    vat: 0,
    image: 'https://puolotrip.com/uploads/images/2024/12/du-lich-ben-nghe-du-lich-phu-quoc-resort.jpg',
    images: {
      others: [
        'https://via.placeholder.com/800x600/f39c12/ffffff?text=Phu+Quoc+1',
        'https://via.placeholder.com/800x600/d68910/ffffff?text=Phu+Quoc+2',
        'https://via.placeholder.com/800x600/b9770e/ffffff?text=Phu+Quoc+3'
      ]
    },
    brand: {
      id: 3,
      name: 'BenThanh Tourist'
    },
    type: 1,
    unit: 'Khách',
    inventory: {
      remain: 18,
      shipping: 0,
      damaged: 0,
      holding: 6,
      available: 12
    },
    createdDateTime: '2024-11-12T09:15:00Z',
    availableColors: [],
    availableSizes: [],
    childs: [],
    options: {
      duration: '3 ngày 2 đêm',
      departure: 'TP.HCM',
      vehicle: 'Máy bay',
      meal: 'Buffet sáng + 2 bữa chính'
    }
  },
  {
    id: 5,
    parentId: '',
    code: 'TOUR_HG_005',
    name: 'Tour Hà Giang 4N3Đ - Chinh phục cực Bắc',
    status: 1,
    category: {
      id: 51,
      name: 'Tour Hà Giang'
    },
    prices: {
      contactPrice: 0,
      price: 4290000,
      wholesale: 0,
      priceOld: 5490000,
      priceAfterDiscount: 4290000,
      calcDiscountPercent: 22
    },
    vat: 0,
    image: 'https://dulichvietnambonmua.com/wp-content/uploads/2023/09/tour-ha-giang-cao-bang-4-ngay-3-dem-1.jpg',
    images: {
      others: [
        'https://via.placeholder.com/800x600/9b59b6/ffffff?text=Ha+Giang+1',
        'https://via.placeholder.com/800x600/8e44ad/ffffff?text=Ha+Giang+2',
        'https://via.placeholder.com/800x600/7d3c98/ffffff?text=Ha+Giang+3'
      ]
    },
    brand: {
      id: 2,
      name: 'Saigontourist'
    },
    type: 1,
    unit: 'Khách',
    inventory: {
      remain: 12,
      shipping: 0,
      damaged: 0,
      holding: 4,
      available: 8
    },
    createdDateTime: '2024-11-10T11:20:00Z',
    availableColors: [],
    availableSizes: [],
    childs: [],
    options: {
      duration: '4 ngày 3 đêm',
      departure: 'Hà Nội',
      vehicle: 'Xe limousine',
      meal: '7 bữa chính'
    }
  },
  {
    id: 6,
    parentId: '',
    code: 'TOUR_TL_006',
    name: 'Tour Thái Lan 5N4Đ - Bangkok - Pattaya',
    status: 1,
    category: {
      id: 61,
      name: 'Tour Thái Lan'
    },
    prices: {
      contactPrice: 0,
      price: 8990000,
      wholesale: 0,
      priceOld: 11990000,
      priceAfterDiscount: 8990000,
      calcDiscountPercent: 25
    },
    vat: 0,
    image: 'https://blueoceantourist.vn/wp-content/uploads/2024/12/Tour-du-lich-thai-lan.jpg.webp',
    images: {
      others: [
        'https://via.placeholder.com/800x600/1abc9c/ffffff?text=Thai+Lan+1',
        'https://via.placeholder.com/800x600/16a085/ffffff?text=Thai+Lan+2',
        'https://via.placeholder.com/800x600/138d75/ffffff?text=Thai+Lan+3'
      ]
    },
    brand: {
      id: 1,
      name: 'Vietravel'
    },
    type: 1,
    unit: 'Khách',
    inventory: {
      remain: 30,
      shipping: 0,
      damaged: 0,
      holding: 15,
      available: 15
    },
    createdDateTime: '2024-11-08T13:45:00Z',
    availableColors: [],
    availableSizes: [],
    childs: [],
    options: {
      duration: '5 ngày 4 đêm',
      departure: 'TP.HCM',
      vehicle: 'Máy bay + Xe du lịch',
      meal: '8 bữa chính'
    }
  }
];
