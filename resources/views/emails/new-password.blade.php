<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Mật khẩu mới</title>
</head>
<body style="margin:0;padding:0;background:#F4F6F3;font-family:'Segoe UI',Arial,sans-serif;color:#1A1A1A;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F3;padding:32px 0;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

      <tr><td style="background:linear-gradient(150deg,#0F623F,#1AA86A);border-radius:16px 16px 0 0;padding:28px 32px;">
        <div style="display:inline-block;width:40px;height:40px;background:rgba(255,255,255,.2);border-radius:11px;text-align:center;line-height:40px;font-size:20px;font-weight:800;color:#fff;vertical-align:middle;">L</div>
        <span style="font-size:18px;font-weight:800;color:#fff;vertical-align:middle;margin-left:10px;">Laboong</span>
        <span style="font-size:12.5px;color:rgba(255,255,255,.75);vertical-align:middle;"> · Victoria Văn Phú</span>
        <div style="margin-top:18px;font-size:22px;font-weight:800;color:#fff;">Mật khẩu mới của bạn 🔑</div>
      </td></tr>

      <tr><td style="background:#fff;padding:26px 32px;">
        <p style="margin:0 0 14px;font-size:14.5px;">Xin chào <strong>{{ $user->name }}</strong>,</p>
        <p style="margin:0 0 18px;font-size:14px;color:#374151;line-height:1.6;">
          Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản Laboong
          gắn với số điện thoại <strong>{{ $user->phone }}</strong>.
          Mật khẩu mới của bạn là:
        </p>

        <div style="background:#F0FDF4;border:2px dashed #1AA86A;border-radius:12px;padding:16px;text-align:center;margin-bottom:18px;">
          <span style="font-size:26px;font-weight:800;letter-spacing:4px;color:#0F623F;font-family:Consolas,Menlo,monospace;">{{ $newPassword }}</span>
        </div>

        <p style="margin:0 0 8px;font-size:13.5px;color:#374151;line-height:1.6;">
          Hãy dùng mật khẩu này để đăng nhập, sau đó vào
          <strong>Tài khoản → Đổi mật khẩu</strong> để đặt mật khẩu riêng của bạn.
        </p>
        <p style="margin:0;font-size:12.5px;color:#9CA3AF;line-height:1.6;">
          Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng liên hệ cửa hàng ngay để được hỗ trợ.
        </p>

        <div style="text-align:center;margin-top:22px;">
          <a href="{{ url('/login') }}" style="display:inline-block;background:linear-gradient(150deg,#0F623F,#1AA86A);color:#fff;font-size:14.5px;font-weight:700;padding:12px 30px;border-radius:10px;text-decoration:none;">
            Đăng nhập ngay →
          </a>
        </div>
      </td></tr>

      <tr><td style="background:#F9FAFB;border-radius:0 0 16px 16px;padding:18px 32px;border-top:1px solid #E5E7EB;text-align:center;">
        <div style="font-size:12px;color:#9CA3AF;">
          Email được gửi tự động từ <strong style="color:#6B7280;">Laboong Victoria Văn Phú</strong>. Vui lòng không trả lời email này.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>

</body>
</html>
