import { IResProduct } from '@shared/models/api';

export const MOCK_PRODUCTS: IResProduct[] = [
  {
    id: 1,
    parentId: '',
    code: '',
    name: 'Cá Hồi tươi Nauy fillet',
    status: 1,
    category: {
      id: 12,
      name: ''
    },
    prices: {
      contactPrice: 0,
      price: 390000,
      wholesale: 0,
      priceOld: 390000,
      priceAfterDiscount: 290000,
      calcDiscountPercent: 25
    },
    vat: 0,
    image: 'https://res.cloudinary.com/dp1jdwwak/image/upload/v1764670477/cahoituoi_pxapjl.png',
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
    unit: '',
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
    code: '',
    name: 'Ba chỉ heo nhập khẩu cắt lát khay 500g',
    status: 1,
    category: {
      id: 41,
      name: ''
    },
    prices: {
      contactPrice: 0,
      price: 170000,
      wholesale: 0,
      priceOld: 170000,
      priceAfterDiscount: 164000,
      calcDiscountPercent: 22
    },
    vat: 0,
    image: 'https://res.cloudinary.com/dp1jdwwak/image/upload/v1764670701/bachibo_s4vjy4.png',
    images: {
      others: [
        'https://via.placeholder.com/800x600/2ecc71/ffffff?text=Sapa+1',
        'https://via.placeholder.com/800x600/27ae60/ffffff?text=Sapa+2',
        'https://via.placeholder.com/800x600/1e8449/ffffff?text=Sapa+3'
      ]
    },
    brand: {
      id: 2,
      name: ''
    },
    type: 1,
    unit: '',
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
    code: '',
    name: 'Lá vừng Hàn Quốc Túi 40g Từ 15 Đến 25 Lá',
    status: 1,
    category: {
      id: 22,
      name: ''
    },
    prices: {
      contactPrice: 0,
      price: 16000,
      wholesale: 0,
      priceOld: 0,
      priceAfterDiscount: 0,
      calcDiscountPercent: 0
    },
    vat: 0,
    image: 'https://res.cloudinary.com/dp1jdwwak/image/upload/v1764670849/lavung_fl6ho3.png',
    images: {
      others: [
        'https://via.placeholder.com/800x600/e74c3c/ffffff?text=Da+Nang+1',
        'https://via.placeholder.com/800x600/c0392b/ffffff?text=Da+Nang+2',
        'https://via.placeholder.com/800x600/a93226/ffffff?text=Da+Nang+3'
      ]
    },
    brand: {
      id: 1,
      name: ''
    },
    type: 1,
    unit: '',
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
    code: '',
    name: 'Mù tạt Wasabi',
    status: 1,
    category: {
      id: 32,
      name: ''
    },
    prices: {
      contactPrice: 0,
      price: 70000,
      wholesale: 0,
      priceOld: 0,
      priceAfterDiscount: 0,
      calcDiscountPercent: 0
    },
    vat: 0,
    image: 'https://res.cloudinary.com/dp1jdwwak/image/upload/v1764671001/mutat_ti7b3n.png',
    images: {
      others: [
        'https://via.placeholder.com/800x600/f39c12/ffffff?text=Phu+Quoc+1',
        'https://via.placeholder.com/800x600/d68910/ffffff?text=Phu+Quoc+2',
        'https://via.placeholder.com/800x600/b9770e/ffffff?text=Phu+Quoc+3'
      ]
    },
    brand: {
      id: 3,
      name: ''
    },
    type: 1,
    unit: '',
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
    code: '',
    name: 'Bạch tuộc Sashimi',
    status: 1,
    category: {
      id: 51,
      name: ''
    },
    prices: {
      contactPrice: 0,
      price: 800000,
      wholesale: 0,
      priceOld: 800000,
      priceAfterDiscount: 750000,
      calcDiscountPercent: 5
    },
    vat: 0,
    image: 'https://res.cloudinary.com/dp1jdwwak/image/upload/v1764671090/bahtuocne_utgyde.png',
    images: {
      others: [
        'https://via.placeholder.com/800x600/9b59b6/ffffff?text=Ha+Giang+1',
        'https://via.placeholder.com/800x600/8e44ad/ffffff?text=Ha+Giang+2',
        'https://via.placeholder.com/800x600/7d3c98/ffffff?text=Ha+Giang+3'
      ]
    },
    brand: {
      id: 2,
      name: ''
    },
    type: 1,
    unit: '',
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
    code: '',
    name: 'Tôm thẻ Tempura',
    status: 1,
    category: {
      id: 61,
      name: ''
    },
    prices: {
      contactPrice: 0,
      price: 120000,
      wholesale: 0,
      priceOld: 120000,
      priceAfterDiscount: 99000,
      calcDiscountPercent: 25
    },
    vat: 0,
    image: 'https://res.cloudinary.com/dp1jdwwak/image/upload/v1764671317/tomthe_clmslz.png',
    images: {
      others: [
        'https://via.placeholder.com/800x600/1abc9c/ffffff?text=Thai+Lan+1',
        'https://via.placeholder.com/800x600/16a085/ffffff?text=Thai+Lan+2',
        'https://via.placeholder.com/800x600/138d75/ffffff?text=Thai+Lan+3'
      ]
    },
    brand: {
      id: 1,
      name: ''
    },
    type: 1,
    unit: '',
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
  },
  {
    id: 7,
    parentId: '',
    code: '',
    name: 'Cá ngừ đại dương Chilled Tuna Chunk 1kg',
    status: 1,
    category: {
      id: 61,
      name: ''
    },
    prices: {
      contactPrice: 0,
      price: 1200000,
      wholesale: 0,
      priceOld: 1200000,
      priceAfterDiscount: 900000,
      calcDiscountPercent: 17
    },
    vat: 0,
    image: 'https://res.cloudinary.com/dp1jdwwak/image/upload/v1764671416/ca_ngu_dai_duong_tuoi_fcf5de2bc20740fdba1edc9053285962_large_hqwffr.png',
    images: {
      others: [
        'https://via.placeholder.com/800x600/1abc9c/ffffff?text=Thai+Lan+1',
        'https://via.placeholder.com/800x600/16a085/ffffff?text=Thai+Lan+2',
        'https://via.placeholder.com/800x600/138d75/ffffff?text=Thai+Lan+3'
      ]
    },
    brand: {
      id: 1,
      name: ''
    },
    type: 1,
    unit: '',
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
