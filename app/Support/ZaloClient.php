<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Gọi Zalo OpenAPI (graph.zalo.me) để xác thực người dùng Zalo Mini App.
 * Cấu hình: services.zalo.app_id / app_secret (env ZALO_APP_ID / ZALO_APP_SECRET).
 */
class ZaloClient
{
    private const GRAPH = 'https://graph.zalo.me/v2.0';

    public static function configured(): bool
    {
        return trim((string) config('services.zalo.app_secret', '')) !== '';
    }

    /**
     * Xác thực access token của người dùng → thông tin cơ bản.
     * Trả ['id'=>..., 'name'=>..., 'avatar'=>...] hoặc null nếu token sai.
     */
    public static function verifyAccessToken(string $accessToken): ?array
    {
        $accessToken = trim($accessToken);
        if ($accessToken === '') {
            return null;
        }

        try {
            $res = Http::timeout(12)->withHeaders(self::authHeaders($accessToken))->get(self::GRAPH . '/me', [
                'access_token' => $accessToken,
                'fields'       => 'id,name,picture',
            ]);
            $json = $res->json();

            if (!is_array($json) || empty($json['id'])) {
                Log::warning('Zalo verify failed', ['body' => $res->body()]);
                return null;
            }

            return [
                'id'     => (string) $json['id'],
                'name'   => trim((string) ($json['name'] ?? '')),
                'avatar' => $json['picture']['data']['url'] ?? null,
            ];
        } catch (\Throwable $e) {
            Log::error('Zalo verify exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Header xác thực cho graph.zalo.me: access_token + appsecret_proof
     * (HMAC-SHA256 của access token bằng app secret, Zalo yêu cầu khi app bật bảo mật).
     */
    private static function authHeaders(string $accessToken): array
    {
        $headers = ['access_token' => $accessToken];
        $secret = trim((string) config('services.zalo.app_secret', ''));
        if ($secret !== '') {
            $headers['appsecret_proof'] = hash_hmac('sha256', $accessToken, $secret);
        }

        return $headers;
    }

    /**
     * Lấy số điện thoại người dùng từ "phone token" (getPhoneNumber của Mini App).
     * Cần app_secret. Trả số dạng 0xxxxxxxxx hoặc null.
     */
    public static function getPhone(string $accessToken, string $phoneToken): ?string
    {
        $secret = trim((string) config('services.zalo.app_secret', ''));
        if ($secret === '' || trim($accessToken) === '' || trim($phoneToken) === '') {
            return null;
        }

        try {
            $res = Http::timeout(12)->withHeaders(self::authHeaders(trim($accessToken)) + [
                'code'       => trim($phoneToken),
                'secret_key' => $secret,
            ])->get(self::GRAPH . '/me/info');

            $number = $res->json('data.number');

            return $number ? self::normalizePhone((string) $number) : null;
        } catch (\Throwable $e) {
            Log::error('Zalo getPhone exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /** Chuẩn hoá số ĐT Việt Nam về dạng 0xxxxxxxxx. */
    public static function normalizePhone(string $raw): ?string
    {
        $d = preg_replace('/\D+/', '', $raw);
        if ($d === '') {
            return null;
        }
        if (str_starts_with($d, '84')) {
            $d = '0' . substr($d, 2);
        } elseif (!str_starts_with($d, '0')) {
            $d = '0' . $d;
        }

        return preg_match('/^0\d{9}$/', $d) ? $d : null;
    }
}
