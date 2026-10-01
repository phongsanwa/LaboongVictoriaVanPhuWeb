<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuthRateLimitTest extends TestCase
{
    // Không dùng RefreshDatabase: throttle middleware chạy TRƯỚC khi chạm DB,
    // nên chỉ cần kiểm tra ranh giới 429 mà không cần dựng schema.

    public function test_login_is_throttled_after_five_attempts(): void
    {
        $payload = ['phone' => '0900000000', 'password' => 'wrong-pass'];

        // 5 lần đầu: qua throttle (bị chặn ở controller vì sai, KHÔNG phải 429).
        for ($i = 0; $i < 5; $i++) {
            $res = $this->postJson('/login/password', $payload);
            $this->assertNotSame(429, $res->getStatusCode(), "Lần thử #{$i} không được bị throttle");
        }

        // Lần thứ 6: bị giới hạn tần suất.
        $blocked = $this->postJson('/login/password', $payload);
        $blocked->assertStatus(429);
        $blocked->assertJson(['message' => 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ít phút.']);
    }

    public function test_forgot_password_is_throttled_after_three_attempts(): void
    {
        $payload = ['phone' => '0900000001'];

        for ($i = 0; $i < 3; $i++) {
            $res = $this->postJson('/forgot-password/send-new-password', $payload);
            $this->assertNotSame(429, $res->getStatusCode(), "Quên mật khẩu lần #{$i} không được bị throttle");
        }

        $blocked = $this->postJson('/forgot-password/send-new-password', $payload);
        $blocked->assertStatus(429);
        $blocked->assertJson(['message' => 'Bạn đã yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau vài phút.']);
    }

    public function test_register_is_throttled_after_five_attempts(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $res = $this->postJson('/register', ['phone' => '090000000' . $i]);
            $this->assertNotSame(429, $res->getStatusCode(), "Đăng ký lần #{$i} không được bị throttle");
        }

        $blocked = $this->postJson('/register', ['phone' => '0900000099']);
        $blocked->assertStatus(429);
        $blocked->assertJson(['message' => 'Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau vài phút.']);
    }

    public function test_different_phone_has_separate_login_bucket(): void
    {
        // Dùng hết lượt cho số A.
        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/login/password', ['phone' => '0911111111', 'password' => 'x']);
        }
        $this->postJson('/login/password', ['phone' => '0911111111', 'password' => 'x'])->assertStatus(429);

        // Số B vẫn dùng được (bucket riêng theo số điện thoại).
        $other = $this->postJson('/login/password', ['phone' => '0922222222', 'password' => 'x']);
        $this->assertNotSame(429, $other->getStatusCode());
    }
}
