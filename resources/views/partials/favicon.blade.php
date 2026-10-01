@php($lbGeneral = \App\Models\AppSetting::get('general', []))
@php($faviconUrl = $lbGeneral['favicon_url'] ?? null)
@php($brandLogoUrl = $lbGeneral['logo_url'] ?? null)
<link rel="icon" href="{{ $faviconUrl ?: asset('favicon.ico') }}" />
{{-- Logo thương hiệu (Cài đặt chung → Logo). Các màn hình JSX đọc biến này để thay chữ "L" bằng ảnh logo. --}}
<script>window.BRAND_LOGO = @json($brandLogoUrl ?: null);</script>
