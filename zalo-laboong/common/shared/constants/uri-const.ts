// Khai báo uri cho FE
export const uriFeConst = {
  home: '/',                                                                // Trang chủ
  product: {
    index: '/product/index',                                                // Danh sách sản phẩm
    search: '/product/search',                                              // Tìm kiếm sản phẩm
    detail: '/product/detail',                                              // Chi tiết sản phẩm
    category: '/product/category'                                           // Danh mục sản phẩm
  },
  cart: {
    index: '/cart/index',                                                   // Giỏ hàng
  },
  checkout: {
    index: '/checkout',                                                     // Thanh toán
    success: '/checkout/success'                                            // Thanh toán thành công
  },
  user: {
    index: '/user/index',                                                   // Cá nhân
    profile: '/user/profile',                                               // Thông tin user
    profileEdit: '/user/profileedit',                                       // Sửa thông tin user
    points: '/user/points',                                                 // Tích điểm
    membership: '/user/membership',                                         // Hạng thành viên
    reviews: '/user/reviews',                                               // Đánh giá của tôi
    reviewForm: '/user/reviews/form',                                       // Viết/Sửa đánh giá sản phẩm
    address: '/user/address',                                               // Sổ địa chỉ
    addressAdd: '/user/address/add',
    voucher: '/user/voucher',                                               // Mã khuyến mãi
    voucherDetail: '/user/voucherdetail',                                   // Chi tiết khuyến mãi
    edit: '/user/edit',
    favoriteProducts: '/user/favoriteproducts',                             // Sản phẩm yêu thích
    favoriteProductsDetail: '/user/favoriteproductsdetail',                 // Chi tiết danh sách
    affiliate: '/user/affiliate',                                           // affiliate
    aboutUs: '/user/aboutus',                                               // Về chúng tôi
    feedback: '/user/feedback',                                             // Phản hồi
    termsAndPolicy: '/user/policy'
  },
  news: {
    index: '/news/index',                                                   // Danh sách tin tức
    search: '/news/search',                                                 // Tìm kiếm tin tức
    detail: '/news/detail',                                                 // Chi tiết tin tức
    category: '/news/category',                                             // Danh mục tin tức
  },
  album: {
    index: '/albums/index',                                                 // Danh sách album
    detail: '/albums/detail',                                               // Chi tiết album
  },
  promotion: {
    index: '/promotions/index',                                             // Danh sách chương trình khuyến mãi
    detail: '/promotions/detail',                                           // Chi tiết chương trình khuyến mãi
  },
  order: {
    tracking: '/order/list',                                            // Lịch sử đơn hàng
    trackingDetail: '/order/detail'                                 // Chi tiết đơn hàng
  },
  game: '/luckywheel/demo'
}

// Khai báo uri cho API
export const uriApiConst = {
  order: {
    tracking: '/webapptpl/order/list',
    view: '/webapptpl/order/view',
    cancel: '/webapptpl/order/cancel', // hủy đơn hàng
    checkVoucher: '/zma/order/checkvoucher',   // Check voucher
    calculateShipFee: '/webapptpl/order/calculateshipfee',
    saveOrder: '/webapptpl/order/save',
    hmacOrder: '/zma/order/zmahashmac',
  },
  user: {
    phone: '/zma/user',
    feedback: '/zma/user/contact',      //gửi thông tin contact
    sendMessageZma: '/zma/user/sendmessagezma',      //gửi thông tin contact
  },
  address: {
    list: '/webapptpl/address/list',
    version: '/webapptpl/address/version',
    create: '/webapptpl/address/create',
    update: '/webapptpl/address/update',
    delete: '/webapptpl/address/delete',
    setdefault: '/webapptpl/address/setdefault',
  },
  loyalty: {
    me: '/webapptpl/loyalty/me',
    tiers: '/webapptpl/loyalty/tiers',
    settings: '/webapptpl/loyalty/settings',
    history: '/webapptpl/loyalty/history',
  },
  zmaAuth: {
    initLogin: '/webapptpl/auth/initlogin',
    completeLogin: '/webapptpl/auth/completelogin',
    logout: '/webapptpl/auth/logout',
  },
  promotion: {
    evaluate: '/webapptpl/promotion/evaluate',
  },
  game: {
    gameInfo: '/zma/game/gameinfor'  // Lấy thông tin game
  },
  product: {
    promotion: '/zma/product/promotion',  // Lấy sản phẩm flashsale
    productByCategory: '/webapptpl/product/category', // Lấy sản phẩn theo danh mục
    loadCategory: '/webapptpl/product/categories', // Danh sách danh mục sản phẩm
    loadAttribute: '/webapptpl/product/loadattribute', // Danh sách thuộc tính theo danh mục sản phẩm
    loadProduct: '/webapptpl/product/list',
    category: '/webapptpl/product/category',
    productView: '/webapptpl/product/view',
    loadBrand: '/webapptpl/product/brands',
    relatedProduct: '/webapptpl/product/related' // Lấy sản phẩm liên quan
  },
  store: {
    banner: '/webapptpl/banner/index'
  },
  news: {
    newsDetail: '/webapptpl/article/view',  // Chi tiết tin tức
    newsSearch: '/webapptpl/article/search',
    newsCategory: '/webapptpl/article/loadcategory',
    articleByType: '/webapptpl/article/loadbytype', //tin tức theo type
  },
  search: {
    searchProduct: '/webapptpl/product/list',
    suggestion: '/webapptpl/product/suggestion'
  },
  location: {
    city: '/webapptpl/location/city',
    district: '/webapptpl/location/district',
    ward: '/webapptpl/location/ward',
  },
  payment: {
    index: '/webapptpl/payment/index',
  },
  settings: {
    // TODO: endpoint chưa có — khi BE tạo API settings sẽ dùng URI này
    general: '/webapptpl/settings/general',
  },
}
