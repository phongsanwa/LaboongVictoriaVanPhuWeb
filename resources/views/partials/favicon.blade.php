@php($faviconUrl = \App\Models\AppSetting::get('general', [])['favicon_url'] ?? null)
<link rel="icon" href="{{ $faviconUrl ?: asset('favicon.ico') }}" />
