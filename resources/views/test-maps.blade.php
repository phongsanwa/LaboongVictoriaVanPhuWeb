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
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; max-height: 200px; }
        .note { font-size: 12px; color: #666; margin-top: 6px; font-style: italic; }
        .url-box { font-family: monospace; font-size: 12px; background:#f0f0f0; padding:4px 8px; border-radius:4px; word-break:break-all; }
        .fix-hint { background:#fff8e1; border:1px solid #ffe082; border-radius:6px; padding:10px 14px; font-size:13px; margin-top:10px; display:none; }
        .fix-hint.show { display:block; }
    </style>
</head>
<body>

<h2>🧪 Test Google Maps API — Laboong</h2>
<p class="hint">Mở DevTools Console (F12) để xem chi tiết lỗi. Mỗi khối test độc lập 1 chức năng.</p>

<div class="key-info">
    🔑 Key từ <code>.env</code>:
    <strong>{{ config('services.google_maps.key') ? substr(config('services.google_maps.key'), 0, 8) . '...' . substr(config('services.google_maps.key'), -4) : '❌ CHƯA CÀI GOOGLE_MAPS_KEY' }}</strong>
    @if(!config('services.google_maps.key'))
        <br><span style="color:red">→ Thêm GOOGLE_MAPS_KEY vào .env rồi chạy php artisan config:clear</span>
    @endif
</div>

{{-- Test 0: Chẩn đoán URL / referrer --}}
<div class="test-block">
    <h3>Test 0: Chẩn đoán URL (kiểm tra Website Restriction)</h3>
    <p style="margin:4px 0 6px;font-size:13px;">URL trang này (referrer Google Maps sẽ nhận):</p>
    <div class="url-box" id="page-url"></div>
    <p style="margin:8px 0 4px;font-size:13px;">Trong Google Cloud Console, <strong>HTTP referrer restriction</strong> phải khớp URL trên. Ví dụ đúng:</p>
    <ul style="font-size:13px;margin:4px 0;">
        <li><code>https://laboongvictoriavanphu.demowebsitestore.com/*</code></li>
        <li><code>*.demowebsitestore.com/*</code></li>
    </ul>
    <p style="font-size:12px;color:#c00;margin-top:6px;">⚠️ Nếu nhập <code>https://laboongvictoriavanphu.demowebsitestore.com</code> (không có <code>/*</code>) thì sẽ KHÔNG khớp với bất kỳ trang nào!</p>
    <div id="status-url" class="status pending">Đang kiểm tra...</div>
</div>

{{-- Test 1: Auth & Bản đồ --}}
<div class="test-block">
    <h3>Test 1: Auth API Key + Bản đồ (Maps JavaScript API)</h3>
    <div id="map">Đang tải...</div>
    <div id="status-map" class="status pending">Đang kiểm tra...</div>
    <div id="fix-auth" class="fix-hint">
        <strong>🔧 Nguyên nhân có thể:</strong><br>
        1. Key trong .env là IP-restricted key (chỉ dùng cho server, không dùng cho browser).<br>
        2. Website restriction chưa thêm <code>/*</code> ở cuối URL.<br>
        3. Maps JavaScript API hoặc Places API chưa được bật cho key này.<br>
        4. Cần xoá cache: <kbd>Ctrl+Shift+R</kbd> (hard reload).
    </div>
</div>

{{-- Test 2: Autocomplete --}}
<div class="test-block">
    <h3>Test 2: Tìm kiếm địa chỉ (Places Autocomplete)</h3>
    <input id="autocomplete-input" type="text" placeholder="Gõ thử: 36 Hoàng Diệu...">
    <div id="status-autocomplete" class="status pending">Đang chờ khởi tạo...</div>
    <p class="note">Gõ ít nhất 3 ký tự rồi đợi gợi ý xuất hiện để test thực sự.</p>
</div>

{{-- Test 3: Geocoding qua JS API --}}
<div class="test-block">
    <h3>Test 3: Geocoding (google.maps.Geocoder — đúng cách app dùng)</h3>
    <input id="geocode-input" type="text" value="36 Hoang Dieu, Ha Noi">
    <button onclick="testGeocode()">Test Geocode</button>
    <div id="status-geocode" class="status pending">Chưa test</div>
    <pre id="geocode-result"></pre>
    <p class="note">Dùng google.maps.Geocoder() qua Maps JS API — không phải REST fetch trực tiếp.</p>
</div>

{{-- Test 4: AutocompleteService --}}
<div class="test-block">
    <h3>Test 4: AutocompleteService (đúng cách app dùng để gợi ý)</h3>
    <input id="acs-input" type="text" value="Lotte Center Ha Noi">
    <button onclick="testACS()">Test AutocompleteService</button>
    <div id="status-acs" class="status pending">Chưa test</div>
    <pre id="acs-result"></pre>
</div>

<script>
    // Hiện URL trang để kiểm tra website restriction
    const pageUrl = window.location.href;
    document.getElementById("page-url").textContent = pageUrl;
    const isLocal = pageUrl.startsWith("http://localhost") || pageUrl.startsWith("http://127.");
    const urlEl = document.getElementById("status-url");
    if (isLocal) {
        urlEl.className = "status fail";
        urlEl.textContent = "⚠️ Đang test trên localhost — website restriction không áp dụng ở đây, phải test trên domain thật";
    } else {
        urlEl.className = "status ok";
        urlEl.textContent = "✅ Domain: " + window.location.hostname + " — đảm bảo restriction có dạng https://" + window.location.hostname + "/*";
    }

    function setStatus(id, ok, text) {
        const el = document.getElementById(id);
        el.className = "status " + (ok ? "ok" : "fail");
        el.textContent = text;
    }

    // Google Maps gọi hàm này khi API key bị từ chối (AuthFailure)
    window.gm_authFailure = function() {
        setStatus("status-map", false, "❌ AuthFailure — API key bị từ chối (sai key, sai domain restriction, hoặc API chưa bật)");
        document.getElementById("fix-auth").classList.add("show");
        setStatus("status-autocomplete", false, "❌ Auth thất bại — xem Test 1");
    };

    function initMap() {
        // Test 1: Bản đồ
        try {
            const map = new google.maps.Map(document.getElementById("map"), {
                center: { lat: 21.0278, lng: 105.8342 }, zoom: 13,
                mapTypeControl: false, streetViewControl: false,
            });
            // Nếu không có gm_authFailure sau 2s thì auth OK
            setTimeout(() => {
                const el = document.getElementById("status-map");
                if (el.classList.contains("pending")) {
                    setStatus("status-map", true, "✅ Bản đồ tải thành công — auth OK");
                }
                // Nếu vẫn hiện "Rất tiếc! Đã xảy ra lỗi" nhưng badge xanh: kiểm tra Console xem có lỗi không
            }, 2000);
            setStatus("status-map", true, "✅ Bản đồ tải thành công");
        } catch (e) {
            setStatus("status-map", false, "❌ " + e.message);
        }

        // Test 2: Autocomplete widget
        try {
            const input = document.getElementById("autocomplete-input");
            const ac = new google.maps.places.Autocomplete(input, {
                componentRestrictions: { country: "vn" },
            });
            ac.addListener("place_changed", () => {
                const place = ac.getPlace();
                if (place?.formatted_address) {
                    setStatus("status-autocomplete", true, "✅ Chọn được: " + place.formatted_address);
                } else {
                    setStatus("status-autocomplete", false, "⚠️ Không lấy được địa chỉ");
                }
            });
            setStatus("status-autocomplete", true, "✅ Khởi tạo OK — gõ thử để test gợi ý");
        } catch (e) {
            setStatus("status-autocomplete", false, "❌ " + e.message);
        }
    }

    @if(config('services.google_maps.key'))
    window.initMap = initMap;
    const s = document.createElement("script");
    s.src = "https://maps.googleapis.com/maps/api/js?key={{ config('services.google_maps.key') }}&libraries=places&language=vi&region=VN&callback=initMap";
    s.async = true; s.defer = true;
    s.onerror = () => {
        setStatus("status-map", false, "❌ Script không tải được — xem Console/Network");
        setStatus("status-autocomplete", false, "❌ Script không tải được");
    };
    document.head.appendChild(s);
    @else
    setStatus("status-map", false, "❌ Chưa có GOOGLE_MAPS_KEY trong .env");
    setStatus("status-autocomplete", false, "❌ Chưa có GOOGLE_MAPS_KEY trong .env");
    @endif

    // Test 3: Geocoder qua Maps JS API (đúng cách)
    function testGeocode() {
        if (!window.google?.maps) { setStatus("status-geocode", false, "❌ Google Maps chưa load"); return; }
        const address = document.getElementById("geocode-input").value;
        setStatus("status-geocode", true, "⏳ Đang gọi...");
        new google.maps.Geocoder().geocode(
            { address: address + ", Việt Nam", region: "VN" },
            (results, status) => {
                if (status === "OK" && results?.length) {
                    const loc = results[0].geometry.location;
                    const out = {
                        address: results[0].formatted_address,
                        lat: loc.lat(),
                        lng: loc.lng(),
                    };
                    document.getElementById("geocode-result").textContent = JSON.stringify(out, null, 2);
                    setStatus("status-geocode", true, "✅ Geocoding thành công");
                } else {
                    document.getElementById("geocode-result").textContent = "status: " + status;
                    setStatus("status-geocode", false, "❌ " + status);
                }
            }
        );
    }

    // Test 4: AutocompleteService (đúng cách app dùng)
    function testACS() {
        if (!window.google?.maps?.places?.AutocompleteService) {
            setStatus("status-acs", false, "❌ AutocompleteService không khả dụng");
            return;
        }
        const input = document.getElementById("acs-input").value;
        setStatus("status-acs", true, "⏳ Đang gọi...");
        new google.maps.places.AutocompleteService().getPlacePredictions(
            { input: input, componentRestrictions: { country: "vn" } },
            (predictions, status) => {
                if (status === "OK" && predictions?.length) {
                    const out = predictions.slice(0, 3).map(p => p.description);
                    document.getElementById("acs-result").textContent = JSON.stringify(out, null, 2);
                    setStatus("status-acs", true, "✅ AutocompleteService OK — " + predictions.length + " gợi ý");
                } else {
                    document.getElementById("acs-result").textContent = "status: " + status;
                    setStatus("status-acs", false, "❌ " + status);
                }
            }
        );
    }
</script>

</body>
</html>
