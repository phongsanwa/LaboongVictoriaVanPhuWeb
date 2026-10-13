import { IResProduct } from '@shared/models/api';

export const MOCK_PRODUCTS: IResProduct[] = [
  {
    id: 1,
    parentId: '',
    code: 'SP1',
    name: 'Juno Sneaker Active Model TT03008 - Mesh Basic',
    status: 1,
    category: {
      id: 1,
      name: 'Giày nam'
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
    image: 'https://i.ibb.co/5hHN9b8y/giay.jpg',
    images: {
      others: [
        'https://i.ibb.co/GfKC6DrV/sp1-1.jpg',
        'https://i.ibb.co/1fh83tjc/sp1-2.jpg',
      ]
    },
    brand: {
      id: 1,
      name: 'Juno'
    },
    type: 1,
    unit: 'đôi',
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

    }
  },
  {
    id: 2,
    parentId: '',
    code: 'SP2',
    name: 'Juno Sneaker Active Model TT03009 - Mesh Basic',
    status: 1,
    category: {
      id: 1,
      name: 'Giày nam'
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
    image: 'https://i.ibb.co/ymK1Ch1x/sp2.jpg',
    images: {
      others: [
        'https://i.ibb.co/ymK1Ch1x/sp2.jpg',
        'https://i.ibb.co/ymK1Ch1x/sp2.jpg',
      ]
    },
    brand: {
      id: 2,
      name: 'Juno'
    },
    type: 1,
    unit: 'đôi',
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

    }
  },
  {
    id: 3,
    parentId: '',
    code: 'SP3',
    name: 'Giày búp bê slingback mũi nhọn',
    status: 1,
    category: {
      id: 1,
      name: 'Giày nữ'
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
    image: 'https://i.ibb.co/4wxZ70PR/sp3.jpg',
    images: {
      others: [
        'https://i.ibb.co/bMk52qHg/sp3-1.jpg',
        'https://i.ibb.co/DfFtYwM6/sp3-2.jpg',
      ]
    },
    brand: {
      id: 2,
      name: 'Sling'
    },
    type: 1,
    unit: 'đôi',
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

    }
  },
  {
    id: 4,
    parentId: '',
    code: 'SP4',
    name: 'Giày búp bê mules mũi nhọn',
    status: 1,
    category: {
      id: 1,
      name: 'Giày nữ'
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
    image: 'https://i.ibb.co/6RKHPqVr/sp4.jpg',
    images: {
      others: [
        'https://i.ibb.co/fG4SXBQr/sp4-1.jpg',
        'https://i.ibb.co/WNnQv9MV/sp4-2.jpg',
      ]
    },
    brand: {
      id: 2,
      name: 'Sling'
    },
    type: 1,
    unit: 'đôi',
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

    }
  },
];
