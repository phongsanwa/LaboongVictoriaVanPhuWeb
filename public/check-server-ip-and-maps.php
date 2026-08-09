<?php
// File test gọi Google Maps API từ phía SERVER (không phải browser)
// Upload file này vào public_html, sau đó mở bằng trình duyệt để chạy
// Sau khi test xong, NHỚ XÓA file này khỏi server (vì có chứa API key)

$API_KEY = "AIzaSyAFp8vUrG6m9G317rzF3IYk33DVbMlsemU"; // ⚠️ Thay bằng Laboong Server Key (key restrict IP addresses)

header("Content-Type: text/plain; charset=utf-8");

echo "===== BƯỚC 1: Kiểm tra IP outbound thực tế của server =====\n";
$serverIp = trim(@file_get_contents('https://api.ipify.org'));
echo "IP server dùng để gọi ra ngoài: " . $serverIp . "\n";
echo "(So sánh với IP bạn đã điền trong Google Cloud IP restriction)\n\n";

echo "===== BƯỚC 2: Test Geocoding API =====\n";
$address = "36 Hoang Dieu, Ha Noi";
$url = "https://maps.googleapis.com/maps/api/geocode/json?address=" . urlencode($address) . "&key=" . $API_KEY;

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP code: " . $httpCode . "\n";
echo "Response:\n" . $response . "\n\n";

$data = json_decode($response, true);
if (isset($data['status']) && $data['status'] === 'OK') {
    echo "✅ THÀNH CÔNG — Geocoding hoạt động đúng từ server.\n";
} else {
    echo "❌ LỖI — status: " . ($data['status'] ?? 'unknown') . "\n";
    if (isset($data['error_message'])) {
        echo "Chi tiết: " . $data['error_message'] . "\n";
    }
}

echo "\n===== BƯỚC 3: Test Places API (New) =====\n";
$ch2 = curl_init("https://places.googleapis.com/v1/places:searchText");
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_POST, true);
curl_setopt($ch2, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "X-Goog-Api-Key: " . $API_KEY,
    "X-Goog-FieldMask: places.displayName,places.formattedAddress",
]);
curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode(["textQuery" => "Tra sua Laboong Ha Noi"]));
$response2 = curl_exec($ch2);
$httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);

echo "HTTP code: " . $httpCode2 . "\n";
echo "Response:\n" . $response2 . "\n";
