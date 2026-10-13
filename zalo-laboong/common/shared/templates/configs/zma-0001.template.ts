import {
  IZmaBaseTemplateConfig,
} from '../models/zma-template.model';

export const ZMA_TEMPLATE_ZMA_0001: IZmaBaseTemplateConfig = {
  code: 'zma-0001',
  name: 'Template 0001 – Shop thời trang cơ bản',
  description: 'Header đơn giản, banner khuyến mãi, danh mục, sản phẩm, nav 4 tab.',

  theme: {
    brandColor: '#F97316',
    textColor: '#111827',
    backgroundColor: '#F3F4F6',
    buttonRadius: '999px',
  },

  // ===== HEADER =====
  header: {
    show: true,
    type: 'style2',
    backgroundColor: '#ff4500',
    textColor: '#ffffff',
    logoUrl: 'https://dummyimage.com/80x80/f97316/ffffff&text=LOGO',
    title: 'Fashion Demo',
    subtitle: 'Phong cách mỗi ngày',
    showBackButton: false,
    showCartIcon: true,
    showSearchIcon: true,
    showNotificationIcon: false,
    navItems: [],
  },

  footer: {
    show: true,
    type: 'style2',
    backgroundColor: '#FFFFFF',
    inactiveColor: '#6B7280',
    activeColor: '#F97316',
    activeBackgroundColor: 'transparent',
    items: [
      {
        id: 'home',
        label: 'Trang chủ',
        iconClass: 'ph-light ph-house',
        path: '/',
      },
      {
        id: 'categories',
        label: 'Danh mục',
        iconClass: 'ph-light ph-squares-four',
        path: '/categories',
      },
      {
        id: 'cart',
        label: 'Giỏ hàng',
        iconClass: 'ph-light ph-shopping-cart',
        path: '/cart',
        isPrimary: true,
      },
      {id: 'new', path: '/news', iconClass: 'ph-light ph-newspaper', label: 'Tin tức'},
      {
        id: 'account',
        label: 'Tài khoản',
        iconClass: 'ph-light ph-user',
        path: '/account',
      },
    ],
  },

  // ===== BODY BLOCK DEFINITIONS =====
  blocks: [
    {
      id: 'heroBanner',
      type: 'hero-banner',
      label: 'Banner khuyến mãi',
      defaultVisible: true,
      allowHide: true,
      allowReorder: true,
    },
    {
      id: 'mainCategories',
      type: 'category-grid',
      label: 'Danh mục nổi bật',
      defaultVisible: true,
      allowHide: true,
      allowReorder: true,
    },
    {
      id: 'featuredProducts',
      type: 'product-grid',
      label: 'Sản phẩm nổi bật',
      defaultVisible: true,
      allowHide: true,
      allowReorder: true,
    },
    {
      id: 'uspFeatures',
      type: 'feature-icons',
      label: 'Lợi ích cửa hàng',
      defaultVisible: true,
      allowHide: true,
      allowReorder: true,
    },
    {
      id: 'aboutStore',
      type: 'about-store',
      label: 'Giới thiệu cửa hàng',
      defaultVisible: true,
      allowHide: true,
      allowReorder: true,
    },
  ],

  // ===== DEFAULT LAYOUT (THỨ TỰ BLOCK) =====
  defaultLayout: [
    {id: 'heroBanner', order: 0, visible: true},
    {id: 'mainCategories', order: 1, visible: true},
    {id: 'featuredProducts', order: 2, visible: true},
    {id: 'uspFeatures', order: 3, visible: true},
    {id: 'aboutStore', order: 4, visible: true},
  ],

  // ===== DEFAULT MOCK DATA CHO BLOCKS =====
  defaultBlocksData: {
    heroBanner: {
      type: 'hero-banner',
      data: {
        type: 'style1',
        slides: [
          {
            imageUrl: 'https://i.pinimg.com/736x/a1/7c/26/a17c2623bdc8ef53b0704f7a5d8702a6.jpg',
            title: '',
            subtitle: '',
            ctaText: '',
          },
          {
            imageUrl: 'https://i.pinimg.com/736x/73/8d/97/738d97a9d12ffabdcdf0d237bcfdec5e.jpg',
            title: '',
            subtitle: '',
            ctaText: '',
          },
        ],
      },
    },

    mainCategories: {
      type: 'category-grid',
      data: {
        title: 'Danh mục nổi bật',
        columns: 4,
        showIcon: false,
        items: [
          {id: 'DU_LICH_NOI_DIA', name: 'Du lịch nội địa',
            iconUrl: 'https://i.ex-cdn.com/vovgiaothong.vn/files/f1/Sites/1/media/letung/images/2021/thumbnaildlnoidia-1595563809_750x0.jpg'},
          {id: 'DU_LICH_QUOC_TE', name: 'Du lịch quốc tế',
            iconUrl: 'https://datviettour.com.vn/uploads/images/tin-tuc-SEO-chau-au/tong-hop/danh-thang/kinh-nghiem-du-lich-chau-au-lan-dau.jpg'},
        ],
        type: 'style1'
      },
    },

    featuredProducts: {
      type: 'product-grid',
      data: {
        title: 'Khám phá thêm tour',
        layout: 'grid',
        columns: 2,
        showPrice: true,
        showTag: true,
        items: [
          {
            id: 'TOUR_HL_001',
            name: 'Tour Hạ Long 2N1Đ - Du thuyền 5 sao',
            price: 2990000,
            imageUrl: 'https://cdn2.ivivu.com/2024/05/28/15/ivivu-velar-of-the-sea-ha-long-4.jpg',
            tag: 'Hot',
          },
          {
            id: 'TOUR_SP_002',
            name: 'Tour Sapa 3N2Đ - Chinh phục Fansipan',
            price: 290000,
            imageUrl: 'https://api.alsuco.vn/uploads/images/upload-1746674857912-973909387.webp',
            tag: 'New',
          },
          {
            id: 'TOUR_DN_003',
            name: 'Tour Đà Nẵng - Hội An 4N3Đ',
            price: 4990000,
            imageUrl: 'https://datviettour.com.vn/uploads/images/mien-trung/hoi-an/hinh-danh-thang/du-lich-hoi-an-800px.jpg',
          },
          {
            id: 'TOUR_PQ_004',
            name: 'Tour Phú Quốc 3N2Đ - Nghỉ dưỡng cao cấp',
            price: 620000,
            imageUrl: 'https://puolotrip.com/uploads/images/2024/12/du-lich-ben-nghe-du-lich-phu-quoc-resort.jpg',
          },
        ],
      },
    },
    aboutStore: {
      type: 'about-store',
      data: {
        type: 'style1',
        description: 'Chuyên tour trong nước và quốc tế, dịch vụ trọn gói, hỗ trợ 24/7.',
        coverUrl: 'https://example.com/cover.jpg',
        storeName: 'Về Nhanh Tour',
        badges: ['Giao nhanh', 'Đổi trả 7 ngày', 'Thanh toán linh hoạt'],
        address: 'Tầng 2 phòng 206 Tòa nhà GP Invest, Số 170 đường La Thành, Phường Ô Chợ Dừa, Thành phố Hà Nội, Việt Nam.',
        hotline: '1900.2812',
      },
    },
  },
};
