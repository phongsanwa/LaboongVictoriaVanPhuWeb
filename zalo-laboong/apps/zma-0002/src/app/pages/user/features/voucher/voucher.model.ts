export interface VoucherItem {
  name: string;
  description: string;
  statusText: string;
  validRange: string;
  applyTo: string;
  collected?: boolean;
  condition: string;
}

export const TEMPLATE_VOUCHERS: VoucherItem[] = [
  {
    name: 'giảm 14% Giảm tối đa 100k',
    description: 'Đơn tối thiểu 400kđ',
    statusText: 'Hiệu lực từ: 15.05.2026',
    validRange: '03/05/2026 - 30/05/2026',
    applyTo: 'Tất cả sản phẩm',
    condition: 'Mã giảm 100.000đ cho đơn hàng từ 400kđ. Chỉ áp dụng cho các sản phẩm hợp lệ. Số lượng có hạn. Lưu ý: voucher sẽ không được hoàn lại sau khi hết hiệu lực hoặc hết lượt sử dụng trong bất ý trường hợp nào.',
  },
  {
    name: 'giảm 30k',
    description: 'Đơn tối thiểu 0kđ',
    statusText: 'hết hạn trong: 12 giờ',
    validRange: '03/05/2026 - 30/05/2026',
    applyTo: 'Tất cả sản phẩm',
    collected: true,
    condition: 'Mã giảm 35.000đ cho đơn hàng từ 0đ. Chỉ áp dụng cho các sản phẩm hợp lệ. Số lượng có hạn. Lưu ý: voucher sẽ không được hoàn lại sau khi hết hiệu lực hoặc hết lượt sử dụng trong bất ý trường hợp nào.',
  },
  {
    name: 'giảm 20% Giảm tối đa 200k',
    description: 'Đơn tối thiểu 600kđ',
    statusText: 'Hiệu lực từ: 10.06.2026',
    validRange: '10/06/2026 - 30/06/2026',
    applyTo: 'Tất cả sản phẩm',
    condition: 'Mã giảm 200.000đ cho đơn hàng từ 600kđ. Chỉ áp dụng cho các sản phẩm hợp lệ. Số lượng có hạn.',
  },
  {
    name: 'giảm 12% Giảm tối đa 120k',
    description: 'Đơn tối thiểu 450kđ',
    statusText: 'Hiệu lực từ: 20.05.2026',
    validRange: '20/05/2026 - 15/06/2026',
    applyTo: 'Tất cả sản phẩm',
    condition: 'Áp dụng cho đơn hàng thời trang đủ điều kiện.',
  },
];
