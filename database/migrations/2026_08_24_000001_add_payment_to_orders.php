<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // cod = thanh toán khi nhận hàng | bank = chuyển khoản ngân hàng (VietQR)
            $table->string('payment_method', 20)->default('cod')->after('weather_surcharge');
            // unpaid | paid
            $table->string('payment_status', 20)->default('unpaid')->after('payment_method');
            $table->timestamp('paid_at')->nullable()->after('payment_status');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'payment_status', 'paid_at']);
        });
    }
};
