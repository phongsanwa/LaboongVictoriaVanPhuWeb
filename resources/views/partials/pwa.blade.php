{{-- PWA: cho phép "Thêm vào màn hình chính" trên điện thoại --}}
@php($lbLogo = \App\Models\AppSetting::get('general', [])['logo_url'] ?? null)
<link rel="manifest" href="{{ route('pwa.manifest') }}" />
{{-- Icon màn hình chính trên iPhone (apple-touch-icon): dùng logo trong Admin nếu có, chưa có thì dùng mặc định. --}}
<link rel="apple-touch-icon" href="{{ $lbLogo ? url($lbLogo) : asset('icons/apple-touch-icon.png') }}" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
{{-- "default": iOS chừa sẵn chỗ cho thanh trạng thái (đồng hồ, pin) khi mở dạng app,
     tránh header/logo bị khuất phía sau. "black-translucent" sẽ đẩy nội dung lên dưới thanh trạng thái. --}}
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="{{ \App\Models\AppSetting::get('general', [])['brand'] ?? 'Laboong' }}" />
