<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
@include('partials.favicon')
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="csrf-token" content="{{ csrf_token() }}" />
<title>Laboong Admin · Variant / Tuỳ chọn</title>
<meta name="robots" content="noindex, nofollow" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Baloo+2:wght@600;700;800&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="{{ asset('css/admin.css') }}?v={{ filemtime(public_path('css/admin.css')) }}" />
</head>
<body>
<div id="root"></div>

<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin="anonymous"></script>

<script>
window.ADMIN_VARIANTS_DATA = @json($variantsData);
</script>

<script type="text/babel" src="{{ asset('js/tweaks-panel.jsx') }}?v={{ filemtime(public_path('js/tweaks-panel.jsx')) }}"></script>
<script type="text/babel" src="{{ asset('js/components.jsx') }}?v={{ filemtime(public_path('js/components.jsx')) }}"></script>
<script type="text/babel" src="{{ asset('js/admin-sidebar.jsx') }}?v={{ filemtime(public_path('js/admin-sidebar.jsx')) }}"></script>
<script type="text/babel" src="{{ asset('js/admin-variants.jsx') }}?v={{ filemtime(public_path('js/admin-variants.jsx')) }}"></script>
</body>
</html>
