<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Laboong</title>
</head>
<body style="margin:0; padding:0; background:#f2efe6; font-family:Arial, Helvetica, sans-serif; color:#1c2620;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2efe6; padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 20px rgba(20,40,28,.08);">

        {{-- Header thương hiệu --}}
        <tr><td style="background:linear-gradient(135deg,#0F623F,#1AA86A); padding:26px 28px; text-align:center;">
          <div style="font-size:22px; font-weight:800; color:#ffffff; letter-spacing:.3px;">LABOONG</div>
          <div style="font-size:13px; color:#d8f3e6; margin-top:2px;">Victoria Văn Phú</div>
        </td></tr>

        {{-- Nội dung do admin soạn (đã cá nhân hoá + làm sạch HTML) --}}
        <tr><td style="padding:26px 28px 8px; font-size:15px; line-height:1.65; color:#28352d;">
          {!! $bodyHtml !!}
        </td></tr>

        {{-- Mã QR website (tuỳ chọn; nhúng inline, thiếu file thì bỏ qua) --}}
        @php($lbQrPath = public_path('images/website-qr.png'))
        @if(!empty($attachQr) && is_file($lbQrPath))
        <tr><td style="padding:6px 28px 4px; text-align:center;">
          <div style="font-size:13.5px; color:#3f4f47; margin-bottom:10px;">Quét mã QR để mở nhanh website & đặt hàng:</div>
          <img src="{{ $message->embed($lbQrPath) }}" alt="Mã QR website Laboong" width="190" height="190" style="display:block; margin:0 auto; border:1px solid #e6e0d2; border-radius:12px; padding:8px; background:#fff;" />
        </td></tr>
        @endif

        {{-- Nút về website --}}
        <tr><td style="padding:8px 28px 24px; text-align:center;">
          <a href="{{ $siteUrl }}" style="display:inline-block; background:#0F623F; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700; padding:12px 26px; border-radius:999px;">
            Mở website Laboong &rarr;
          </a>
        </td></tr>

        {{-- Footer --}}
        <tr><td style="padding:20px 28px 26px; text-align:center; border-top:1px solid #eee7d8;">
          <div style="font-size:12.5px; color:#8a978d; line-height:1.6;">
            Bạn nhận email này vì là thành viên Laboong Victoria Văn Phú.<br />
            <a href="{{ $siteUrl }}" style="color:#0F623F; text-decoration:none;">{{ $siteUrl }}</a>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
