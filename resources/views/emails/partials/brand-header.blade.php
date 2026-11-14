{{--
  Phần đầu email gửi khách. Ảnh đổi ở Admin → Email → Giao diện email.
  Biến: $brandTitle, $brandSub, $brandTitleColor, $brandSubColor, $brandTitleSize, $brandSubSize (tuỳ chọn); $brand (tuỳ chọn, để xem trước);
        $brandRadius (tuỳ chọn, bo góc trên khi khung email không tự bo, vd '16px 16px 0 0').
  - Mặc định: banner Laboong (logo + LA BOONG trên nền xanh ô liu) chèn như ảnh, bên dưới là dải kem ghi chi nhánh.
    Chèn bằng <img> nên hiện được trên mọi ứng dụng email, kể cả Outlook.
  - Admin tải ảnh riêng + ẩn chữ: ảnh đó thành banner.
  - Admin tải ảnh riêng + hiện chữ: ảnh làm nền, phủ lớp tối nhẹ cho chữ dễ đọc (Outlook bản máy tính chỉ hiện nền màu).
--}}
@php($lbBrand = $brand ?? \App\Support\EmailBranding::settings())
@php($lbBg = $lbBrand['header_bg'] ?? null)
@php($brandSubSize = $brandSubSize ?? '13px')
@php($lbRadius = $brandRadius ?? null)
@php($lbOlive = \App\Support\EmailBranding::OLIVE)
@php($lbCream = \App\Support\EmailBranding::CREAM)
@if($lbBg && empty($lbBrand['header_text']))
  <tr><td style="padding:0; line-height:0; font-size:0; background-color:{{ $lbOlive }};@if($lbRadius) border-radius:{{ $lbRadius }}; overflow:hidden;@endif">
    <img src="{{ $lbBg }}" alt="{{ $brandTitle }} {{ $brandSub }}" width="560" style="display:block; width:100%; max-width:100%; height:auto; border:0;@if($lbRadius) border-radius:{{ $lbRadius }};@endif" />
  </td></tr>
@elseif($lbBg)
  <tr><td background="{{ $lbBg }}" style="background-color:{{ $lbOlive }}; background-image:url('{{ $lbBg }}'); background-size:cover; background-position:center center; background-repeat:no-repeat; padding:0; text-align:center;@if($lbRadius) border-radius:{{ $lbRadius }}; overflow:hidden;@endif">
    <div style="background-color:rgba(8,30,20,.38); padding:44px 28px;">
      <div style="font-size:{{ $brandTitleSize }}; font-weight:800; color:{{ $brandTitleColor }}; letter-spacing:.3px; text-shadow:0 1px 6px rgba(0,0,0,.35);">{{ $brandTitle }}</div>
      <div style="font-size:{{ $brandSubSize }}; color:{{ $brandSubColor }}; margin-top:2px; text-shadow:0 1px 4px rgba(0,0,0,.35);">{{ $brandSub }}</div>
    </div>
  </td></tr>
@else
  <tr><td style="padding:0; line-height:0; font-size:0; background-color:{{ $lbOlive }};@if($lbRadius) border-radius:{{ $lbRadius }}; overflow:hidden;@endif">
    <img src="{{ \App\Support\EmailBranding::defaultImageUrl() }}" alt="LA BOONG · Trà ô long làng Laboong" width="560" style="display:block; width:100%; max-width:100%; height:auto; border:0; color:{{ $lbCream }}; font-size:22px; font-weight:800; line-height:1.4; text-align:center;@if($lbRadius) border-radius:{{ $lbRadius }};@endif" />
  </td></tr>
  <tr><td style="background-color:{{ $lbCream }}; padding:9px 20px; text-align:center; font-size:12px; font-weight:700; letter-spacing:2.4px; text-transform:uppercase; color:#4A5520; line-height:1.5;">
    {{ $brandSub }}
  </td></tr>
@endif
