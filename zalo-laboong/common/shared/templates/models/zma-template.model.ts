/**
 * Mã template gốc tương ứng với từng app Mini App.
 * Có thể mở rộng thêm khi bạn có nhiều template hơn.
 */
export type ZmaTemplateCode = 'zma-0001' | 'zma-0002' | 'zma-0003' | 'zma-0004';

/**
 * Các loại block UI mà một trang home có thể sử dụng.
 */
export type ZmaBlockType =
  | 'hero-banner'      // Banner lớn trên đầu
  | 'category-grid'    // Lưới danh mục
  | 'product-grid'     // Danh sách / lưới sản phẩm
  | 'feature-icons'    // Các icon lợi ích / cam kết
  | 'content-section' // Đoạn nội dung text / ảnh + text
  | 'about-store'
;

/**
 * Theme tổng thể của template.
 */
export interface IZmaTemplateTheme {
  /** Màu thương hiệu chính, dùng cho nút, highlight... */
  brandColor: string;
  /** Màu chữ mặc định */
  textColor: string;
  /** Màu nền mặc định */
  backgroundColor: string;
  /** Độ bo góc nút (ví dụ: '4px', '999px'...) */
  buttonRadius: string;
}

/**
 * Item trong nav của header (nếu dùng).
 */
export interface IZmaHeaderNavItem {
  id: string;
  label: string;
  /** Route nội bộ trong Mini App */
  route?: string;
  /** Link ngoài, nếu không dùng route */
  externalUrl?: string;
  /** Class icon (FontAwesome...) */
  iconClass?: string;
}

export type ZmaHeaderType =
  | 'style1'
  | 'style2'
  | 'style3'
  | 'style4';

export type ZmaFooterType = ZmaHeaderType

/**
 * Cấu hình header cho template.
 */
export interface IZmaHeaderConfig {
  /** Có hiển thị header không */
  show: boolean;

  /** Màu nền; nếu không set sẽ fallback sang theme.backgroundColor */
  backgroundColor?: string;

  /** Màu chữ; nếu không set sẽ fallback sang theme.textColor */
  textColor?: string;

  /** Logo nhỏ bên trái */
  logoUrl?: string;

  /** Tiêu đề/brand text */
  title?: string;

  /** Tagline ngắn */
  subtitle?: string;

  /** Có hiển thị nút Back không */
  showBackButton?: boolean;

  /** Có hiển thị icon giỏ hàng ở header không */
  showCartIcon?: boolean;

  /** Có hiển thị icon search không */
  showSearchIcon?: boolean;

  /** Có hiển thị icon notification không */
  showNotificationIcon?: boolean;

  /** Nav items (nếu header có menu) */
  navItems?: IZmaHeaderNavItem[];

  /** Các mẫu header */
  type: ZmaHeaderType
}

/**
 * Item trong bottom navigation (footer) của Mini App.
 * Ví dụ: Trang chủ, Danh mục, Giỏ hàng, Tài khoản...
 */
export interface IZmaFooterNavItem {
  /** ID duy nhất, dùng để phân biệt trong code */
  id: string;

  /** Nhãn hiển thị dưới icon, ví dụ 'Trang chủ' */
  label: string;

  /** Icon mặc định (class FontAwesome, hoặc icon set bạn đang dùng) */
  iconClass?: string;

  /** Icon khi đang active (nếu muốn khác icon thường) */
  activeIconClass?: string;

  /**
   * Route nội bộ Mini App khi click.
   * Ví dụ: '/home', '/categories', '/cart', '/account'
   */
  path?: string;

  /**
   * Nếu là shortcut ra ngoài (hiếm khi dùng cho bottom nav),
   * có thể dùng externalUrl.
   */
  externalUrl?: string;

  /**
   * Badge số lượng, ví dụ số sản phẩm trong giỏ.
   * (Tuỳ bạn có dùng hay không)
   */
  badgeCount?: number;

  /**
   * Đánh dấu item chính, ví dụ nút "Mua ngay", "Tạo đơn"
   * để có thể style khác (màu nổi bật, icon to hơn...)
   */
  isPrimary?: boolean;
}

/**
 * Cấu hình footer = bottom navigation bar của Mini App.
 */
export interface IZmaFooterConfig {
  /** Có hiển thị bottom nav không */
  show: boolean;

  /** Màu nền thanh nav (thường là trắng hoặc tối) */
  backgroundColor?: string;

  /** Màu icon/text khi không active */
  inactiveColor?: string;

  /** Màu icon/text khi đang active */
  activeColor?: string;

  /** Màu nền (hoặc border-top) khi active item (tuỳ thiết kế) */
  activeBackgroundColor?: string;

  /**
   * Danh sách item trong bottom nav.
   * Thứ tự trong array chính là thứ tự từ trái sang phải.
   */
  items: IZmaFooterNavItem[];

  /**
   * Kiểu footer
   */
  type: ZmaFooterType
}

/**
 * Định nghĩa 1 block trong template gốc.
 * Không phải data, mà là “khung” loại block & quyền reorder/hide.
 */
export interface IZmaTemplateBlockDefinition {
  /** ID duy nhất trong template, ví dụ: 'heroBanner', 'mainCategories' */
  id: string;

  /** Loại block: banner, category-grid, product-grid,... */
  type: ZmaBlockType;

  /** Tên hiển thị (dùng debug / UI config nội bộ) */
  label: string;

  /** Mặc định có hiển thị block này không */
  defaultVisible: boolean;

  /** Có cho phép ẩn block này trong demo variant không */
  allowHide: boolean;

  /** Có cho phép đổi thứ tự block này hay không */
  allowReorder: boolean;
}

/**
 * Layout mặc định: thứ tự block từ trên xuống + visible.
 */
export interface IZmaTemplateLayoutItem {
  /** id phải trùng với IZmaTemplateBlockDefinition.id */
  id: string;

  /** Thứ tự từ trên xuống (0,1,2,...) */
  order: number;

  /** Override visible mặc định (thường ít dùng, có thể bỏ trống) */
  visible?: boolean;
}

export type ZmaHeroBannerType = 'style1' | 'style2' | 'style3';

/**
 * Data default cho block hero-banner.
 */
export interface IZmaHeroBannerSlide {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  href?: string;
  routerLink?: string | any[];
  queryParams?: Record<string, any>;
}

export interface IZmaHeroBannerBlockDefaults {
  type?: ZmaHeroBannerType;
  slides?: IZmaHeroBannerSlide[];
}

export type ZmaHeroCategoryType = 'style1' | 'style2' | 'style3';

/**
 * Data default cho block category-grid.
 */
export interface IZmaCategoryGridBlockDefaults {
  title?: string;
  columns: 2 | 3 | 4;
  showIcon: boolean;
  items: {
    id: string;
    name: string;
    iconUrl?: string;
  }[];
  type?: ZmaHeroCategoryType
}

export type ZmaHeroProductType = 'style1' | 'style2' | 'style3';
/**
 * Data default cho block product-grid.
 */

export interface IZmaProductItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  tag?: string;
}

export interface IZmaProductGridBlockDefaults {
  title?: string;
  layout: 'grid' | 'list';
  columns: 2 | 3;
  showPrice: boolean;
  showTag?: boolean;
  items: IZmaProductItem[];
  type?: ZmaHeroProductType
}

/**
 * Data default cho block feature-icons.
 */
export interface IZmaFeatureIconsBlockDefaults {
  title?: string;
  items: {
    iconClass?: string;  // nếu dùng FontAwesome
    iconUrl?: string;    // nếu dùng ảnh
    title: string;
    description?: string;
  }[];
}

/**
 * Data default cho block content-section (text / ảnh + text).
 */
export interface IZmaContentSectionBlockDefaults {
  title?: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  align?: 'left' | 'right' | 'center';
}

export interface IZmaAboutStoreBlockDefaults {
  type?: string;
  title?: string;
  subtitle?: string;
  description?: string;

  storeName?: string;
  logoUrl?: string;
  coverUrl?: string;

  rating?: number;
  totalReviews?: number;

  address?: string;
  hotline?: string;
  openHours?: string;

  badges?: string[];
}

/**
 * Union data default cho từng loại block.
 * type giúp bạn biết cần cast data kiểu gì khi render.
 */
export type ZmaBlockDefaults =
  | { type: 'hero-banner'; data: IZmaHeroBannerBlockDefaults }
  | { type: 'category-grid'; data: IZmaCategoryGridBlockDefaults }
  | { type: 'product-grid'; data: IZmaProductGridBlockDefaults }
  | { type: 'feature-icons'; data: IZmaFeatureIconsBlockDefaults }
  | { type: 'content-section'; data: IZmaContentSectionBlockDefaults }
  | { type: 'about-store'; data: IZmaAboutStoreBlockDefaults };

/**
 * Map blockId -> data default tương ứng.
 * Ví dụ:
 * {
 *   heroBanner: { type: 'hero-banner', data: { ... } },
 *   mainCategories: { type: 'category-grid', data: { ... } },
 *   ...
 * }
 */
export type IZmaTemplateBlocksDefaults = Record<string, ZmaBlockDefaults>;

/**
 * Cấu hình khung của 1 template gốc.
 * Mỗi template zma-0001, zma-0002, ... sẽ là 1 object IZmaBaseTemplateConfig.
 */
export interface IZmaBaseTemplateConfig {
  code: ZmaTemplateCode;
  name: string;
  description?: string;

  theme: IZmaTemplateTheme;
  header: IZmaHeaderConfig;
  footer: IZmaFooterConfig;

  /** Template này có những block nào (banner, category, product...) */
  blocks: IZmaTemplateBlockDefinition[];

  /** Thứ tự & visible mặc định của các block */
  defaultLayout: IZmaTemplateLayoutItem[];

  /** Data default cho từng block để render demo */
  defaultBlocksData: IZmaTemplateBlocksDefaults;
}
