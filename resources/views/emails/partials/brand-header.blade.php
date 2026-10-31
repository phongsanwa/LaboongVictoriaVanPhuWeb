{{--
  Phần đầu email gửi khách. Ảnh nền đổi ở Admin → Email → Giao diện email.
  Biến: $brandTitle, $brandSub, $brandTitleColor, $brandSubColor, $brandTitleSize, $brandSubSize (tuỳ chọn); $brand (tuỳ chọn, để xem trước).
  - Không có ảnh: nền xanh Laboong như cũ.
  - Có ảnh + ẩn chữ: chèn ảnh như banner (hiện được trên mọi ứng dụng email, kể cả Outlook).
  - Có ảnh + hiện chữ: ảnh làm nền, phủ lớp tối nhẹ cho chữ dễ đọc (Outlook bản máy tính chỉ hiện nền xanh).
--}}
@php($lbBrand = $brand ?? \App\Support\EmailBranding::settings())
@php($lbBg = $lbBrand['header_bg'] ?? null)
@php($brandSubSize = $brandSubSize ?? '13px')
@if($lbBg && empty($lbBrand['header_text']))
  <tr><td style="padding:0; line-height:0; font-size:0; background-color:#0F623F;">
    <img src="{{ $lbBg }}" alt="{{ $brandTitle }} {{ $brandSub }}" width="560" style="display:block; width:100%; max-width:100%; height:auto; border:0;" />
  </td></tr>
@elseif($lbBg)
  <tr><td background="{{ $lbBg }}" style="background-color:#0F623F; background-image:url('{{ $lbBg }}'); background-size:cover; background-position:center center; background-repeat:no-repeat; padding:0; text-align:center;">
    <div style="background-color:rgba(8,30,20,.38); padding:44px 28px;">
      <div style="font-size:{{ $brandTitleSize }}; font-weight:800; color:{{ $brandTitleColor }}; letter-spacing:.3px; text-shadow:0 1px 6px rgba(0,0,0,.35);">{{ $brandTitle }}</div>
      <div style="font-size:{{ $brandSubSize }}; color:{{ $brandSubColor }}; margin-top:2px; text-shadow:0 1px 4px rgba(0,0,0,.35);">{{ $brandSub }}</div>
    </div>
  </td></tr>
@else
  <tr><td style="background:linear-gradient(135deg,#0F623F,#1AA86A); background-color:#0F623F; padding:26px 28px; text-align:center;">
    <div style="font-size:{{ $brandTitleSize }}; font-weight:800; color:{{ $brandTitleColor }}; letter-spacing:.3px;">{{ $brandTitle }}</div>
    <div style="font-size:{{ $brandSubSize }}; color:{{ $brandSubColor }}; margin-top:2px;">{{ $brandSub }}</div>
  </td></tr>
@endif
