<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Đăng ký thành công</title>
</head>
<body style="margin:0; padding:0; background:#f2efe6; font-family:Arial, Helvetica, sans-serif; color:#1c2620;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2efe6; padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 6px 20px rgba(20,40,28,.08);">

        {{-- Header --}}
        <tr><td style="background:linear-gradient(135deg,#0F623F,#1AA86A); padding:28px 28px 24px; text-align:center;">
          <div style="font-size:22px; font-weight:800; color:#ffffff; letter-spacing:.3px;">LABOONG</div>
          <div style="font-size:13px; color:#d8f3e6; margin-top:2px;">Victoria Văn Phú</div>
        </td></tr>

        {{-- Body --}}
        <tr><td style="padding:30px 28px 8px; text-align:center;">
          <div style="font-size:44px; line-height:1;">🎉</div>
          <h1 style="font-size:22px; margin:14px 0 6px; color:#0F623F;">Bạn đã đăng ký thành công!</h1>
          <p style="font-size:15px; color:#3f4f47; margin:0; line-height:1.6;">
            Chào <b>{{ $name }}</b>, cảm ơn bạn đã trở thành thành viên Laboong Victoria Văn Phú.
            Từ giờ bạn có thể <b>tích điểm mỗi ly</b>, <b>điểm danh nhận thưởng</b> và <b>đổi quà</b> nhé!
          </p>
        </td></tr>

        {{-- QR --}}
        <tr><td style="padding:22px 28px 6px; text-align:center;">
          <div style="font-size:14px; color:#3f4f47; margin-bottom:12px;">Quét mã QR để mở nhanh website:</div>
          <img src="{{ $message->embed(public_path('images/website-qr.png')) }}" alt="Mã QR website Laboong" width="220" height="220" style="display:block; margin:0 auto; border:1px solid #e6e0d2; border-radius:12px; padding:8px; background:#fff;" />
        </td></tr>

        {{-- Link button --}}
        <tr><td style="padding:20px 28px 8px; text-align:center;">
          <a href="{{ $siteUrl }}" style="display:inline-block; background:#0F623F; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700; padding:13px 26px; border-radius:999px;">
            Truy cập website &rarr;
          </a>
          <div style="font-size:13px; color:#6b7a70; margin-top:12px; word-break:break-all;">
            <a href="{{ $siteUrl }}" style="color:#0F623F; text-decoration:none;">{{ $siteUrl }}</a>
          </div>
        </td></tr>

        {{-- Footer --}}
        <tr><td style="padding:22px 28px 26px; text-align:center; border-top:1px solid #eee7d8; margin-top:16px;">
          <div style="font-size:12.5px; color:#8a978d; line-height:1.6;">
            Đây là email tự động từ hệ thống Laboong Victoria Văn Phú.<br />
            Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
