import { IZmaBaseTemplateConfig } from '../models/zma-template.model';

export const ZMA_TEMPLATE_ZMA_0004: IZmaBaseTemplateConfig = {
  code: 'zma-0004',
  name: 'Template 0004 – Dịch vụ / Booking',
  description: 'Template cho salon, spa, dịch vụ đặt lịch.',

  theme: {
    brandColor: '#A855F7',       // purple-500
    textColor: '#312E81',        // indigo-900
    backgroundColor: '#F5F3FF',  // violet-50
    buttonRadius: '999px',
  },

  header: {
    show: true,
    type: 'style1',
    backgroundColor: '#FFFFFF',
    textColor: '#312E81',
    logoUrl: 'https://dummyimage.com/80x80/a855f7/ffffff&text=LOGO',
    title: 'Service Demo',
    subtitle: 'Đặt lịch nhanh chóng',
    showBackButton: false,
    showCartIcon: false,
    showSearchIcon: false,
    showNotificationIcon: false,
    navItems: [],
  },

  footer: {
    show: true,
    type: 'style1',
    backgroundColor: '#FFFFFF',
    inactiveColor: '#6B7280',
    activeColor: '#A855F7',
    activeBackgroundColor: 'transparent',
    items: [
      { id: 'home', label: 'Trang chủ', iconClass: 'ph-bold ph-house', path: '/home' },
      { id: 'services', label: 'Dịch vụ', iconClass: 'ph-bold ph-flower-lotus', path: '/services' },
      { id: 'booking', label: 'Đặt lịch', iconClass: 'ph-bold ph-calendar-check', path: '/booking', isPrimary: true },
      { id: 'account', label: 'Tài khoản', iconClass: 'ph-bold ph-user', path: '/account' },
    ],
  },

  blocks: [
    { id: 'heroBanner', type: 'hero-banner', label: 'Banner dịch vụ chính', defaultVisible: true, allowHide: true, allowReorder: true },
    { id: 'mainCategories', type: 'category-grid', label: 'Nhóm dịch vụ', defaultVisible: true, allowHide: true, allowReorder: true },
    { id: 'uspFeatures', type: 'feature-icons', label: 'Ưu điểm dịch vụ', defaultVisible: true, allowHide: true, allowReorder: true },
  ],

  defaultLayout: [
    { id: 'heroBanner', order: 0, visible: true },
    { id: 'mainCategories', order: 1, visible: true },
    { id: 'uspFeatures', order: 2, visible: true },
  ],

  defaultBlocksData: {
    heroBanner: {
      type: 'hero-banner',
      data: {
        slides: [
          {
            imageUrl: 'https://dummyimage.com/750x300/a855f7/ffffff&text=Goi+Spa',
            title: 'Gói spa cuối tuần',
            subtitle: 'Thư giãn, tái tạo năng lượng',
            ctaText: 'Đặt lịch',
          },
        ],
      },
    },

    mainCategories: {
      type: 'category-grid',
      data: {
        title: 'Nhóm dịch vụ',
        columns: 3,
        showIcon: false,
        items: [
          { id: 'cat_spa', name: 'Spa' },
          { id: 'cat_hair', name: 'Làm tóc' },
          { id: 'cat_nail', name: 'Nail' },
        ],
      },
    },

    uspFeatures: {
      type: 'feature-icons',
      data: {
        title: 'Ưu điểm',
        items: [
          { iconClass: 'ph-bold ph-first-aid-kit', title: 'Kỹ thuật viên kinh nghiệm', description: 'Được đào tạo bài bản.' },
          { iconClass: 'ph-bold ph-star', title: 'Khách hàng hài lòng', description: 'Được đánh giá cao trên mạng xã hội.' },
        ],
      },
    },
  },
};
