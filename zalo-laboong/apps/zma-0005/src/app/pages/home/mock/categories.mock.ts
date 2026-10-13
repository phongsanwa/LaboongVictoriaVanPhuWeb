import { IResLoadCategory } from '@shared/models/api';

export const MOCK_CATEGORIES: IResLoadCategory[] = [
  {
    id: '1',
    parentId: '',
    code: 'GIAY_NAM',
    name: 'Giày nam',
    viewLink: '/product/category?id=1',
    image: 'https://i.ibb.co/5hHN9b8y/giay.jpg',
    description: 'Giày nam',
    childs: [

    ]
  },
  {
    id: '2',
    parentId: '',
    code: 'GIAY_NU',
    name: 'Giày nữ',
    viewLink: '/product/category?id=2',
    image: 'https://i.ibb.co/PXtRYLM/giay-nu.jpg',
    description: 'Giày nữ',
    childs: [

    ]
  },
];
