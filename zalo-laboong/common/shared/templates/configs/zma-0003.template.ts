import { IZmaBaseTemplateConfig } from '../models/zma-template.model';

export const ZMA_TEMPLATE_ZMA_0003: IZmaBaseTemplateConfig = {
  code: 'zma-0003',
  name: 'Template 0003 – F&B / Đồ ăn',
  description: 'Template cho nhà hàng/quán ăn: banner món hot, danh mục món, set combo.',

  theme: {
    brandColor: '#22C55E',       // green-500
    textColor: '#064E3B',        // emerald-900
    backgroundColor: '#ECFDF5',  // emerald-50
    buttonRadius: '999px',
  },

  header: {
    show: true,
    type: 'style1',
    backgroundColor: '#FFFFFF',
    textColor: '#064E3B',
    logoUrl: 'https://dummyimage.com/80x80/22c55e/ffffff&text=LOGO',
    title: 'Food Demo',
    subtitle: 'Ăn ngon mỗi ngày',
    showBackButton: false,
    showCartIcon: true,
    showSearchIcon: true,
    showNotificationIcon: false,
    navItems: [],
  },

  footer: {
    show: true,
    type: 'style1',
    backgroundColor: '#FFFFFF',
    inactiveColor: '#6B7280',
    activeColor: '#22C55E',
    activeBackgroundColor: 'transparent',
    items: [
      { id: 'home', label: 'Trang chủ', iconClass: 'ph-bold ph-house', path: '/home' },
      { id: 'menu', label: 'Menu', iconClass: 'ph-bold ph-hamburger', path: '/menu' },
      { id: 'cart', label: 'Giỏ', iconClass: 'ph-bold ph-shopping-cart', path: '/cart', isPrimary: true },
      { id: 'account', label: 'Tài khoản', iconClass: 'ph-bold ph-user', path: '/account' },
    ],
  },

  blocks: [
    { id: 'heroBanner', type: 'hero-banner', label: 'Banner combo', defaultVisible: true, allowHide: true, allowReorder: true },
    { id: 'mainCategories', type: 'category-grid', label: 'Nhóm món', defaultVisible: true, allowHide: true, allowReorder: true },
    { id: 'featuredProducts', type: 'product-grid', label: 'Món gợi ý', defaultVisible: true, allowHide: true, allowReorder: true },
  ],

  defaultLayout: [
    { id: 'heroBanner', order: 0, visible: true },
    { id: 'mainCategories', order: 1, visible: true },
    { id: 'featuredProducts', order: 2, visible: true },
  ],

  defaultBlocksData: {
    heroBanner: {
      type: 'hero-banner',
      data: {
        slides: [
          {
            imageUrl: 'https://dummyimage.com/750x300/22c55e/ffffff&text=Combo+Trua',
            title: 'Combo trưa tiết kiệm',
            subtitle: 'Chỉ từ 49.000đ',
            ctaText: 'Đặt ngay',
          },
        ],
      },
    },

    mainCategories: {
      type: 'category-grid',
      data: {
        title: 'Nhóm món',
        columns: 3,
        showIcon: false,
        items: [
          { id: 'cat_rice', name: 'Cơm' },
          { id: 'cat_noodle', name: 'Mì / Bún' },
          { id: 'cat_drink', name: 'Đồ uống' },
        ],
      },
    },

    featuredProducts: {
      type: 'product-grid',
      data: {
        title: 'Món gợi ý',
        layout: 'grid',
        columns: 2,
        showPrice: true,
        showTag: true,
        items: [
          {
            id: 'p1',
            name: 'Cơm gà xối mỡ',
            price: 45000,
            imageUrl: 'https://dummyimage.com/400x400/ffffff/000000&text=Com+ga',
            tag: 'Best seller',
          },
          {
            id: 'p2',
            name: 'Trà đào cam sả',
            price: 32000,
            imageUrl: 'https://dummyimage.com/400x400/ffffff/000000&text=Tra+dao',
            tag: 'Hot',
          },
        ],
      },
    },
  },
};
