<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Đơn hàng mới</title>
<style>
  @media only screen and (max-width: 600px) {
    .em-wrap    { padding: 0 !important; }
    .em-card    { width: 100% !important; max-width: 100% !important; }
    .em-hdr     { padding: 22px 16px !important; border-radius: 0 !important; }
    .em-body    { padding: 20px 16px !important; }
    .em-foot    { padding: 16px !important; border-radius: 0 !important; }
    .em-ordno   { font-size: 24px !important; }
    .em-total   { font-size: 18px !important; }
    .em-cta a   { display: block !important; padding: 13px 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F4F6F3;font-family:'Segoe UI',Arial,sans-serif;color:#1A1A1A;">

@php
  $o      = $order;
  $ordNo  = 'LB-' . str_pad($o->id, 4, '0', STR_PAD_LEFT);
  $user   = $o->customer?->user;
  $name   = $user?->name   ?? 'Khách hàng';
  $phone  = $o->delivery_phone ?: ($user?->phone ?? '—');
  $items  = $o->items;
  $note   = $o->note;

  $sub      = (int) $o->subtotal;
  $disc     = (int) $o->discount_amount;
  $ship     = (int) $o->shipping_fee;
  $total    = (int) $o->total_amount;
  $pts      = (int) $o->points_earned;
  $created  = $o->created_at->setTimezone('Asia/Ho_Chi_Minh')->format('H:i · d/m/Y');

  // Tách giảm giá đơn / giảm phí ship theo từng dòng đã lưu
  $discRows      = $o->discounts;
  $shipDiscRows  = $discRows->where('discount_category', 'SHIPPING');
  $orderDiscRows = $discRows->where('discount_category', '!=', 'SHIPPING');
  $method        = $ship > 0 ? 'Giao hàng' : 'Nhận tại quầy';
  $storeName     = $o->store?->name;

  $adminUrl = url('/admin/orders');

  $fmtVnd = fn(int $n): string => number_format($n, 0, ',', '.');
@endphp

<table width="100%" cellpadding="0" cellspacing="0" class="em-wrap" style="background:#F4F6F3;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" class="em-card" style="max-width:600px;width:100%;">

      {{-- ── Header ── --}}
      <tr><td class="em-hdr" style="background:linear-gradient(150deg,#0F623F,#1AA86A);border-radius:16px 16px 0 0;padding:32px 36px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="display:inline-block;width:44px;height:44px;background:rgba(255,255,255,.2);border-radius:12px;text-align:center;line-height:44px;font-size:22px;font-weight:800;color:#fff;vertical-align:middle;">L</div>
              <span style="font-size:20px;font-weight:800;color:#fff;vertical-align:middle;margin-left:10px;">Laboong</span>
              <span style="font-size:13px;color:rgba(255,255,255,.75);vertical-align:middle;"> · Victoria Văn Phú</span>
            </td>
            <td align="right">
              <span style="background:rgba(255,255,255,.2);color:#fff;font-size:12.5px;font-weight:700;padding:5px 12px;border-radius:20px;">ĐƠN HÀNG MỚI</span>
            </td>
          </tr>
        </table>
        <div style="margin-top:24px;">
          <div class="em-ordno" style="font-size:30px;font-weight:800;color:#fff;letter-spacing:-.5px;">{{ $ordNo }}</div>
          <div style="font-size:13.5px;color:rgba(255,255,255,.8);margin-top:4px;">{{ $created }}</div>
        </div>
      </td></tr>

      {{-- ── Body ── --}}
      <tr><td class="em-body" style="background:#fff;padding:28px 36px;">

        {{-- Customer --}}
        <div style="margin-bottom:24px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B7280;margin-bottom:10px;">Khách hàng</div>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:3px 14px 3px 0;font-size:13.5px;color:#6B7280;white-space:nowrap;">Tên</td>
              <td style="padding:3px 0;font-size:14px;font-weight:600;color:#1A1A1A;">{{ $name }}</td>
            </tr>
            <tr>
              <td style="padding:3px 14px 3px 0;font-size:13.5px;color:#6B7280;white-space:nowrap;">Số điện thoại</td>
              <td style="padding:3px 0;font-size:14px;font-weight:600;color:#1A1A1A;">{{ $phone }}</td>
            </tr>
            <tr>
              <td style="padding:3px 14px 3px 0;font-size:13.5px;color:#6B7280;white-space:nowrap;">Hình thức</td>
              <td style="padding:3px 0;font-size:14px;font-weight:600;color:#1A1A1A;">{{ $method }}</td>
            </tr>
            @if ($storeName)
            <tr>
              <td style="padding:3px 14px 3px 0;font-size:13.5px;color:#6B7280;white-space:nowrap;">{{ $ship > 0 ? 'Giao từ' : 'Cửa hàng' }}</td>
              <td style="padding:3px 0;font-size:14px;font-weight:600;color:#1A1A1A;">{{ $storeName }}</td>
            </tr>
            @endif
            @if ($o->delivery_address)
            <tr>
              <td style="padding:3px 14px 3px 0;font-size:13.5px;color:#6B7280;white-space:nowrap;vertical-align:top;">Địa chỉ giao</td>
              <td style="padding:3px 0;font-size:14px;font-weight:600;color:#1A1A1A;">{{ $o->delivery_address }}</td>
            </tr>
            @endif
          </table>
        </div>

        <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 24px;" />

        {{-- Items --}}
        <div style="margin-bottom:24px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B7280;margin-bottom:10px;">
            Món đặt ({{ $items->sum('quantity') }} ly)
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            @foreach ($items as $item)
            @php
              $parts = [];
              if ($item->size_name)          $parts[] = "Size {$item->size_name}";
              if ($item->sugar_level !== null) $parts[] = "Đường {$item->sugar_level}%";
              if ($item->ice_level   !== null) $parts[] = "Đá {$item->ice_level}%";
              foreach ($item->toppings as $t) $parts[] = $t->topping_name;
              $opts = implode(' · ', $parts);
            @endphp
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #F3F4F6;vertical-align:top;">
                <div style="display:inline-block;background:#0F623F;color:#fff;font-size:12px;font-weight:700;border-radius:6px;padding:2px 8px;min-width:22px;text-align:center;margin-right:10px;">{{ $item->quantity }}×</div>
              </td>
              <td style="padding:8px 0;border-bottom:1px solid #F3F4F6;vertical-align:top;">
                <div style="font-size:14px;font-weight:600;color:#1A1A1A;">{{ $item->product?->name ?? "Sản phẩm #{$item->product_id}" }}</div>
                @if ($opts)
                <div style="font-size:12.5px;color:#6B7280;margin-top:2px;">{{ $opts }}</div>
                @endif
              </td>
              <td style="padding:8px 0;border-bottom:1px solid #F3F4F6;vertical-align:top;text-align:right;white-space:nowrap;">
                <div style="font-size:14px;font-weight:600;color:#1A1A1A;">{{ $fmtVnd((int)($item->unit_price * $item->quantity)) }}đ</div>
              </td>
            </tr>
            @endforeach
          </table>
        </div>

        @if ($note)
        <div style="background:#F9FAFB;border-radius:10px;padding:12px 16px;margin-bottom:24px;font-size:13.5px;color:#374151;font-style:italic;">
          <span style="font-weight:700;font-style:normal;color:#6B7280;">Ghi chú: </span>{{ $note }}
        </div>
        @endif

        {{-- Totals --}}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="padding:5px 0;font-size:13.5px;color:#6B7280;">Tạm tính</td>
            <td style="padding:5px 0;font-size:13.5px;color:#1A1A1A;text-align:right;font-weight:600;">{{ $fmtVnd($sub) }}đ</td>
          </tr>
          @if ($discRows->isNotEmpty())
            @foreach ($orderDiscRows as $d)
            <tr>
              <td style="padding:5px 0;font-size:13.5px;color:#E0518A;">{{ $d->description ?: 'Giảm giá' }}</td>
              <td style="padding:5px 0;font-size:13.5px;color:#E0518A;text-align:right;font-weight:600;">{{ (int) $d->discount_amount > 0 ? '−' . $fmtVnd((int) $d->discount_amount) . 'đ' : 'Kèm theo đơn' }}</td>
            </tr>
            @endforeach
          @elseif ($disc > 0)
            {{-- Đơn cũ không có bản ghi chi tiết: hiện một dòng tổng --}}
            <tr>
              <td style="padding:5px 0;font-size:13.5px;color:#E0518A;">Giảm giá</td>
              <td style="padding:5px 0;font-size:13.5px;color:#E0518A;text-align:right;font-weight:600;">−{{ $fmtVnd($disc) }}đ</td>
            </tr>
          @endif
          @if ($ship > 0)
          <tr>
            <td style="padding:5px 0;font-size:13.5px;color:#6B7280;">Phí giao hàng</td>
            <td style="padding:5px 0;font-size:13.5px;color:#1A1A1A;text-align:right;font-weight:600;">{{ $fmtVnd($ship) }}đ</td>
          </tr>
          @endif
          @foreach ($shipDiscRows as $d)
          <tr>
            <td style="padding:5px 0;font-size:13.5px;color:#E0518A;">{{ $d->description ?: 'Giảm phí ship' }}</td>
            <td style="padding:5px 0;font-size:13.5px;color:#E0518A;text-align:right;font-weight:600;">−{{ $fmtVnd((int) $d->discount_amount) }}đ</td>
          </tr>
          @endforeach
          <tr>
            <td style="padding:12px 0 0;border-top:2px solid #E5E7EB;font-size:16px;font-weight:800;color:#1A1A1A;">Tổng cộng</td>
            <td class="em-total" style="padding:12px 0 0;border-top:2px solid #E5E7EB;font-size:20px;font-weight:800;color:#0F623F;text-align:right;">{{ $fmtVnd($total) }}đ</td>
          </tr>
        </table>

        @if ($pts > 0)
        {{-- display:flex không được hỗ trợ trong nhiều email client --}}
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:12px 16px;margin-bottom:24px;font-size:13.5px;color:#065F46;font-weight:600;">
          🎯&nbsp; Khách tích được <strong>+{{ $pts }} điểm</strong> từ đơn này.
        </div>
        @endif

        {{-- CTA --}}
        <div class="em-cta" style="text-align:center;margin-top:8px;">
          <a href="{{ $adminUrl }}" style="display:inline-block;background:linear-gradient(150deg,#0F623F,#1AA86A);color:#fff;font-size:15px;font-weight:700;padding:13px 32px;border-radius:10px;text-decoration:none;letter-spacing:.01em;">
            Xem & xử lý đơn hàng →
          </a>
        </div>

      </td></tr>

      {{-- ── Footer ── --}}
      <tr><td class="em-foot" style="background:#F9FAFB;border-radius:0 0 16px 16px;padding:20px 36px;border-top:1px solid #E5E7EB;text-align:center;">
        <div style="font-size:12.5px;color:#9CA3AF;">
          Email này được gửi tự động khi có đơn hàng mới tại <strong style="color:#6B7280;">Laboong Victoria Văn Phú</strong>.<br/>
          Vui lòng không trả lời email này.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>

</body>
</html>
