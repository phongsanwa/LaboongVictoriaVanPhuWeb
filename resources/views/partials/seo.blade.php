{{-- SEO meta dùng chung.
     Tham số:
       $seoTitle    — tiêu đề cho og/twitter (mặc định lấy tên quán)
       $seoDesc     — mô tả trang (meta description + og:description)
       $seoImage    — URL ảnh chia sẻ (mặc định: favicon cấu hình hoặc contact-bg.jpg)
       $seoNoindex  — true = chặn index (trang cá nhân / quản trị)
       $seoBusiness — true = nhúng JSON-LD thông tin quán (trang công khai chính) --}}
@php
  $seoTitle   = $seoTitle   ?? 'Laboong · Victoria Văn Phú';
  $seoDesc    = $seoDesc    ?? 'Laboong Victoria Văn Phú — trà sữa Đài Loan, tích điểm đổi quà, đặt món giao tận nơi tại Hà Đông, Hà Nội.';
  $seoNoindex = $seoNoindex ?? false;
  $seoBusiness= $seoBusiness ?? false;
  $seoPage    = $seoPage    ?? null;
  $seoUrl     = url()->current();

  // Bản cấu hình admin (trang /admin/seo) ghi đè giá trị mặc định trong code
  try {
      $seoCfg = \App\Models\AppSetting::get('seo', []);
      if ($seoPage && !empty($seoCfg['pages'][$seoPage])) {
          $p = $seoCfg['pages'][$seoPage];
          if (!empty($p['title'])) $seoTitle = $p['title'];
          if (!empty($p['desc']))  $seoDesc  = $p['desc'];
          if (($p['index'] ?? true) === false) $seoNoindex = true;
      }
      $seoImage = $seoImage ?? ($seoCfg['og_image'] ?? null);
  } catch (\Throwable $e) { /* giữ mặc định nếu DB lỗi */ }

  try {
      $seoImage = $seoImage ?? (\App\Models\AppSetting::get('general', [])['favicon_url'] ?? null);
  } catch (\Throwable $e) { $seoImage = $seoImage ?? null; }
  $seoImage = $seoImage ?: asset('contact-bg.jpg');
  if (!str_starts_with($seoImage, 'http')) $seoImage = url($seoImage);

  $seoStore = null;
  if ($seoBusiness) {
      try { $seoStore = \App\Models\Store::where('status', 'active')->first(); }
      catch (\Throwable $e) { $seoStore = null; }
  }
@endphp
@if ($seoPage)
<title>{{ $seoTitle }}</title>
@endif
<meta name="description" content="{{ $seoDesc }}" />
@if ($seoNoindex)
<meta name="robots" content="noindex, nofollow" />
@else
<meta name="robots" content="index, follow" />
<link rel="canonical" href="{{ $seoUrl }}" />
@endif
<meta name="theme-color" content="#0F623F" />
{{-- Open Graph --}}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Laboong Victoria Văn Phú" />
<meta property="og:locale" content="vi_VN" />
<meta property="og:title" content="{{ $seoTitle }}" />
<meta property="og:description" content="{{ $seoDesc }}" />
<meta property="og:url" content="{{ $seoUrl }}" />
<meta property="og:image" content="{{ $seoImage }}" />
{{-- Twitter --}}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{{ $seoTitle }}" />
<meta name="twitter:description" content="{{ $seoDesc }}" />
<meta name="twitter:image" content="{{ $seoImage }}" />
@if ($seoBusiness && $seoStore)
<script type="application/ld+json">
{!! json_encode(array_filter([
    '@context'  => 'https://schema.org',
    '@type'     => 'CafeOrCoffeeShop',
    'name'      => 'Laboong Victoria Văn Phú',
    'servesCuisine' => 'Trà sữa, đồ uống',
    'url'       => url('/'),
    'image'     => $seoImage,
    'telephone' => $seoStore->phone,
    'address'   => [
        '@type'           => 'PostalAddress',
        'streetAddress'   => $seoStore->address,
        'addressLocality' => $seoStore->city ?: 'Hà Nội',
        'addressCountry'  => 'VN',
    ],
    'geo' => ($seoStore->latitude && $seoStore->longitude) ? [
        '@type'     => 'GeoCoordinates',
        'latitude'  => (float) $seoStore->latitude,
        'longitude' => (float) $seoStore->longitude,
    ] : null,
    'openingHours' => ($seoStore->opening_time && $seoStore->closing_time)
        ? 'Mo-Su ' . substr($seoStore->opening_time, 0, 5) . '-' . substr($seoStore->closing_time, 0, 5)
        : null,
], fn ($v) => $v !== null), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) !!}
</script>
@endif
