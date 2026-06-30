<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Test Vietmap API - Laboong</title>
    <link href="https://unpkg.com/@vietmap/vietmap-gl-js@4.2.0/dist/vietmap-gl.css" rel="stylesheet" />
    <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 30px auto; padding: 0 20px; color:#222; }
        h2 { margin-bottom: 4px; }
        .hint { color:#555; font-size: 14px; margin-bottom: 20px; }
        .key-info { background:#e8f4fd; border:1px solid #b3d7f5; border-radius:6px; padding:10px 14px; font-size:13px; margin-bottom:20px; }
        .test-block { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .status { font-weight: bold; padding: 6px 10px; border-radius: 4px; display: inline-block; margin-top: 8px; font-size: 13px; }
        .ok { background: #d4edda; color: #155724; }
        .fail { background: #f8d7da; color: #721c24; }
        .pending { background: #fff3cd; color: #856404; }
        #map { width: 100%; height: 280px; border-radius: 8px; margin-top: 10px; background:#eee; }
        input { padding: 8px; width: 100%; box-sizing: border-box; margin-top: 8px; border:1px solid #ccc; border-radius:4px; }
        button { margin-top: 8px; padding: 8px 14px; border:none; border-radius:4px; background:#0F623F; color:#fff; cursor:pointer; }
        button:hover { background:#0a4a30; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; max-height: 200px; }
        .note { font-size: 12px; color: #666; margin-top: 6px; font-style: italic; }
    </style>
</head>
<body>

<h2>🧪 Test Vietmap API — Laboong</h2>
<p class="hint">Mở DevTools Console (F12) để xem chi tiết lỗi. Mỗi khối test độc lập 1 chức năng.</p>

<div class="key-info">
    🔑 Key từ <code>.env</code>:
    <strong>{{ config('services.vietmap.key') ? substr(config('services.vietmap.key'), 0, 8) . '...' . substr(config('services.vietmap.key'), -4) : '❌ CHƯA CÀI VIETMAP_KEY' }}</strong>
    @if(!config('services.vietmap.key'))
        <br><span style="color:red">→ Thêm VIETMAP_KEY vào .env rồi chạy php artisan config:clear</span>
    @endif
</div>

{{-- Test 1: Bản đồ --}}
<div class="test-block">
    <h3>Test 1: Bản đồ (Vietmap GL JS)</h3>
    <div id="map">Đang tải...</div>
    <div id="status-map" class="status pending">Đang kiểm tra...</div>
</div>

{{-- Test 2: Autocomplete --}}
<div class="test-block">
    <h3>Test 2: Tìm kiếm địa chỉ (Autocomplete API)</h3>
    <input id="autocomplete-input" type="text" value="36 Hoang Dieu, Ha Noi">
    <button onclick="testAutocomplete()">Test Autocomplete</button>
    <div id="status-autocomplete" class="status pending">Chưa test</div>
    <pre id="autocomplete-result"></pre>
</div>

{{-- Test 3: Geocoding --}}
<div class="test-block">
    <h3>Test 3: Geocoding (Search API)</h3>
    <input id="geocode-input" type="text" value="36 Hoang Dieu, Ha Noi">
    <button onclick="testGeocode()">Test Geocode</button>
    <div id="status-geocode" class="status pending">Chưa test</div>
    <pre id="geocode-result"></pre>
</div>

{{-- Test 4: Reverse geocoding --}}
<div class="test-block">
    <h3>Test 4: Reverse Geocoding (toạ độ → địa chỉ)</h3>
    <input id="reverse-input" type="text" value="21.0278,105.8342" placeholder="lat,lng">
    <button onclick="testReverse()">Test Reverse</button>
    <div id="status-reverse" class="status pending">Chưa test</div>
    <pre id="reverse-result"></pre>
</div>

<script src="https://unpkg.com/@vietmap/vietmap-gl-js@4.2.0/dist/vietmap-gl.js"></script>
<script>
    const VIETMAP_KEY = "{{ config('services.vietmap.key') }}";

    function setStatus(id, ok, text) {
        const el = document.getElementById(id);
        el.className = "status " + (ok ? "ok" : "fail");
        el.textContent = text;
    }

    async function vmFetch(path) {
        const sep = path.includes('?') ? '&' : '?';
        const res = await fetch(`https://maps.vietmap.vn/api/${path}${sep}apikey=${VIETMAP_KEY}`);
        return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
    }

    @if(config('services.vietmap.key'))
    // Test 1: Bản đồ
    try {
        const map = new vietmapgl.Map({
            container: 'map',
            style: `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${VIETMAP_KEY}`,
            center: [105.8342, 21.0278],
            zoom: 13,
        });
        map.on('load', () => setStatus('status-map', true, '✅ Bản đồ tải thành công'));
        map.on('error', (e) => setStatus('status-map', false, '❌ ' + (e?.error?.message || 'Lỗi tải bản đồ — kiểm tra key/domain')));
    } catch (e) {
        setStatus('status-map', false, '❌ ' + e.message);
    }
    @else
    setStatus('status-map', false, '❌ Chưa có VIETMAP_KEY trong .env');
    @endif

    async function testAutocomplete() {
        if (!VIETMAP_KEY) { setStatus('status-autocomplete', false, '❌ Chưa có VIETMAP_KEY'); return; }
        setStatus('status-autocomplete', true, '⏳ Đang gọi...');
        const text = document.getElementById('autocomplete-input').value;
        const { ok, status, json } = await vmFetch(`autocomplete/v3?text=${encodeURIComponent(text)}`);
        document.getElementById('autocomplete-result').textContent = JSON.stringify(json, null, 2);
        if (ok && Array.isArray(json) && json.length) {
            setStatus('status-autocomplete', true, `✅ ${json.length} gợi ý`);
        } else {
            setStatus('status-autocomplete', false, `❌ HTTP ${status}`);
        }
    }

    async function testGeocode() {
        if (!VIETMAP_KEY) { setStatus('status-geocode', false, '❌ Chưa có VIETMAP_KEY'); return; }
        setStatus('status-geocode', true, '⏳ Đang gọi...');
        const text = document.getElementById('geocode-input').value;
        const { ok, status, json } = await vmFetch(`search/v3?text=${encodeURIComponent(text + ', Việt Nam')}`);
        document.getElementById('geocode-result').textContent = JSON.stringify(json, null, 2);
        if (ok && Array.isArray(json) && json.length) {
            setStatus('status-geocode', true, '✅ Geocoding thành công');
        } else {
            setStatus('status-geocode', false, `❌ HTTP ${status}`);
        }
    }

    async function testReverse() {
        if (!VIETMAP_KEY) { setStatus('status-reverse', false, '❌ Chưa có VIETMAP_KEY'); return; }
        setStatus('status-reverse', true, '⏳ Đang gọi...');
        const [lat, lng] = document.getElementById('reverse-input').value.split(',').map(s => s.trim());
        const { ok, status, json } = await vmFetch(`reverse/v3?lat=${lat}&lng=${lng}`);
        document.getElementById('reverse-result').textContent = JSON.stringify(json, null, 2);
        if (ok && Array.isArray(json) && json.length) {
            setStatus('status-reverse', true, '✅ Reverse geocoding thành công');
        } else {
            setStatus('status-reverse', false, `❌ HTTP ${status}`);
        }
    }
</script>

</body>
</html>
