import { IZmaBaseTemplateConfig } from '../models/zma-template.model';

export const ZMA_TEMPLATE_ZMA_0002: IZmaBaseTemplateConfig = {
  code: 'zma-0002',
  name: 'Template 0002 – Điện tử / Công nghệ',
  description: 'Template cho cửa hàng điện tử: banner sản phẩm hot, danh mục theo loại, sản phẩm nổi bật.',

  theme: {
    brandColor: '#2563EB',       // blue-600
    textColor: '#0F172A',        // slate-900
    backgroundColor: '#F1F5F9',  // slate-100
    buttonRadius: '999px',
  },

  header: {
    show: true,
    type: 'style1',
    backgroundColor: '#FFFFFF',
    textColor: '#0F172A',
    logoUrl: 'https://dummyimage.com/80x80/2563eb/ffffff&text=LOGO',
    title: 'Tech Demo',
    subtitle: 'Thiết bị công nghệ',
    showBackButton: false,
    showCartIcon: true,
    showSearchIcon: true,
    showNotificationIcon: true,
    navItems: [],
  },

  footer: {
    show: true,
    type: 'style1',
    backgroundColor: '#FFFFFF',
    inactiveColor: '#6B7280',
    activeColor: '#2563EB',
    activeBackgroundColor: 'transparent',
    items: [
      { id: 'home', label: 'Trang chủ', iconClass: 'ph-bold ph-house', path: '/home' },
      { id: 'categories', label: 'Danh mục', iconClass: 'ph-bold ph-squares-four', path: '/categories' },
      { id: 'cart', label: 'Giỏ hàng', iconClass: 'ph-bold ph-shopping-cart', path: '/cart', isPrimary: true },
      { id: 'account', label: 'Tài khoản', iconClass: 'ph-bold ph-user', path: '/account' },
    ],
  },

  blocks: [
    { id: 'heroBanner', type: 'hero-banner', label: 'Banner thiết bị hot', defaultVisible: true, allowHide: true, allowReorder: true },
    { id: 'mainCategories', type: 'category-grid', label: 'Danh mục sản phẩm', defaultVisible: true, allowHide: true, allowReorder: true },
    { id: 'featuredProducts', type: 'product-grid', label: 'Sản phẩm nổi bật', defaultVisible: true, allowHide: true, allowReorder: true },
    { id: 'uspFeatures', type: 'feature-icons', label: 'Lợi ích dịch vụ', defaultVisible: true, allowHide: true, allowReorder: true },
  ],

  defaultLayout: [
    { id: 'heroBanner', order: 0, visible: true },
    { id: 'mainCategories', order: 1, visible: true },
    { id: 'featuredProducts', order: 2, visible: true },
    { id: 'uspFeatures', order: 3, visible: true },
  ],

  defaultBlocksData: {
    heroBanner: {
      type: 'hero-banner',
      data: {
        slides: [
          {
            imageUrl: 'https://dummyimage.com/750x300/2563eb/ffffff&text=Laptop+sale',
            title: 'Laptop giảm giá',
            subtitle: 'Ưu đãi lên đến 30%',
            ctaText: 'Xem ngay',
          },
        ],
      },
    },

    mainCategories: {
      type: 'category-grid',
      data: {
        title: 'Danh mục',
        columns: 4,
        showIcon: false,
        items: [
          { id: 'cat_laptop', name: 'Laptop' },
          { id: 'cat_phone', name: 'Điện thoại' },
          { id: 'cat_accessory', name: 'Phụ kiện' },
          { id: 'cat_smart', name: 'Smart home' },
        ],
      },
    },

    featuredProducts: {
      type: 'product-grid',
      data: {
        title: 'Sản phẩm nổi bật',
        layout: 'grid',
        columns: 2,
        showPrice: true,
        showTag: true,
        items: [
          {
            id: 'p1',
            name: 'Laptop Gaming X1',
            price: 25000000,
            imageUrl: 'https://dummyimage.com/400x400/ffffff/000000&text=Laptop',
            tag: 'Hot',
          },
          {
            id: 'p2',
            name: 'Điện thoại Pro Max',
            price: 21000000,
            imageUrl: 'https://dummyimage.com/400x400/ffffff/000000&text=Phone',
            tag: 'New',
          },
        ],
      },
    },

    uspFeatures: {
      type: 'feature-icons',
      data: {
        title: 'Dịch vụ kèm theo',
        items: [
          { iconClass: 'ph-bold ph-wrench', title: 'Bảo hành chính hãng', description: '12–24 tháng tuỳ sản phẩm.' },
          { iconClass: 'ph-bold ph-truck', title: 'Giao nhanh', description: 'Giao trong 2 giờ nội thành.' },
          { iconClass: 'ph-bold ph-money-wavy', title: 'Trả góp 0%', description: 'Áp dụng cho một số sản phẩm.' },
        ],
      },
    },
  },
};
