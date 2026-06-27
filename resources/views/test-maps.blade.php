<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Test Google Maps API - Laboong</title>
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
        button { margin-top: 8px; padding: 8px 14px; border:none; border-radius:4px; background:#1a73e8; color:#fff; cursor:pointer; }
        button:hover { background:#1558b0; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; max-height: 250px; }
    </style>
</head>
<body>

<h2>🧪 Test Google Maps API Key — Laboong</h2>
<p class="hint">Mở DevTools Console (F12) trước khi test để xem chi tiết lỗi đầy đủ.</p>

<div class="key-info">
    🔑 Key đang dùng từ <code>.env</code>:
    <strong>{{ config('services.google_maps.key') ? substr(config('services.google_maps.key'), 0, 8) . '...' . substr(config('services.google_maps.key'), -4) : '❌ CHƯA CÀI GOOGLE_MAPS_KEY' }}</strong>
    @if(!config('services.google_maps.key'))
        <br><span style="color:red">→ Cần thêm GOOGLE_MAPS_KEY vào .env và chạy php artisan config:clear</span>
    @endif
</div>

<div class="test-block">
    <h3>Test 1: Tải bản đồ (Maps JavaScript API)</h3>
    <div id="map">Đang tải...</div>
    <div id="status-map" class="status pending">Đang kiểm tra...</div>
</div>

<div class="test-block">
    <h3>Test 2: Autocomplete địa chỉ (Places API cũ)</h3>
    <input id="autocomplete-input" type="text" placeholder="Gõ thử một địa chỉ ở Việt Nam...">
    <div id="status-autocomplete" class="status pending">Đang chờ widget khởi tạo...</div>
</div>

<div class="test-block">
    <h3>Test 3: Geocoding API (địa chỉ → tọa độ)</h3>
    <input id="geocode-input" type="text" value="36 Hoang Dieu, Ha Noi">
    <button onclick="testGeocode()">Test Geocode</button>
    <div id="status-geocode" class="status pending">Chưa test</div>
    <pre id="geocode-result"></pre>
</div>

<div class="test-block">
    <h3>Test 4: Places API (New) — fetch trực tiếp</h3>
    <button onclick="testPlacesNew()">Test Places API (New)</button>
    <div id="status-placesnew" class="status pending">Chưa test</div>
    <pre id="placesnew-result"></pre>
</div>

<script>
    const API_KEY = "{{ config('services.google_maps.key') }}";

    function setStatus(id, ok, text) {
        const el = document.getElementById(id);
        el.className = "status " + (ok ? "ok" : "fail");
        el.textContent = text;
    }

    function initMap() {
        try {
            new google.maps.Map(document.getElementById("map"), {
                center: { lat: 21.0278, lng: 105.8342 },
                zoom: 13,
            });
            setStatus("status-map", true, "✅ Bản đồ tải thành công");
        } catch (e) {
            setStatus("status-map", false, "❌ Lỗi: " + e.message);
        }

        try {
            const input = document.getElementById("autocomplete-input");
            const ac = new google.maps.places.Autocomplete(input, {
                componentRestrictions: { country: "vn" },
            });
            ac.addListener("place_changed", () => {
                const place = ac.getPlace();
                if (place?.formatted_address) {
                    setStatus("status-autocomplete", true, "✅ OK: " + place.formatted_address);
                } else {
                    setStatus("status-autocomplete", false, "⚠️ Không lấy được place");
                }
            });
            setStatus("status-autocomplete", true, "✅ Widget khởi tạo OK — gõ thử để test");
        } catch (e) {
            setStatus("status-autocomplete", false, "❌ Lỗi: " + e.message);
        }
    }

    @if(config('services.google_maps.key'))
    window.initMap = initMap;
    const s = document.createElement("script");
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + API_KEY + "&libraries=places&language=vi&region=VN&callback=initMap";
    s.async = true; s.defer = true;
    s.onerror = () => setStatus("status-map", false, "❌ Script load thất bại — xem Console");
    document.head.appendChild(s);
    @else
    setStatus("status-map", false, "❌ Chưa có GOOGLE_MAPS_KEY trong .env");
    setStatus("status-autocomplete", false, "❌ Chưa có GOOGLE_MAPS_KEY trong .env");
    @endif

    async function testGeocode() {
        if (!API_KEY) { setStatus("status-geocode", false, "❌ Chưa có API key"); return; }
        const address = document.getElementById("geocode-input").value;
        setStatus("status-geocode", true, "⏳ Đang gọi...");
        try {
            const url = "https://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURIComponent(address) + "&key=" + API_KEY;
            const res = await fetch(url);
            const data = await res.json();
            document.getElementById("geocode-result").textContent = JSON.stringify(data, null, 2);
            if (data.status === "OK") {
                setStatus("status-geocode", true, "✅ Geocoding thành công");
            } else {
                setStatus("status-geocode", false, "❌ " + data.status + (data.error_message ? " — " + data.error_message : ""));
            }
        } catch (e) {
            setStatus("status-geocode", false, "❌ " + e.message);
        }
    }

    async function testPlacesNew() {
        if (!API_KEY) { setStatus("status-placesnew", false, "❌ Chưa có API key"); return; }
        setStatus("status-placesnew", true, "⏳ Đang gọi...");
        try {
            const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": API_KEY,
                    "X-Goog-FieldMask": "places.displayName,places.formattedAddress",
                },
                body: JSON.stringify({ textQuery: "Tra sua Ha Noi" }),
            });
            const data = await res.json();
            document.getElementById("placesnew-result").textContent = JSON.stringify(data, null, 2);
            if (res.ok && !data.error) {
                setStatus("status-placesnew", true, "✅ Places API (New) thành công");
            } else {
                setStatus("status-placesnew", false, "❌ HTTP " + res.status + " — " + (data.error?.message || "lỗi không rõ"));
            }
        } catch (e) {
            setStatus("status-placesnew", false, "❌ " + e.message);
        }
    }
</script>

</body>
</html>
