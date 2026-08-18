<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Toạ độ chính xác của địa chỉ khách chọn lúc đặt — để chỉ đường
            // Google Maps đúng điểm, không phải dò lại từ chuỗi địa chỉ.
            $table->decimal('delivery_lat', 10, 7)->nullable()->after('delivery_phone');
            $table->decimal('delivery_lng', 10, 7)->nullable()->after('delivery_lat');
        });
    }

    public function down(): void
    {
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn(['delivery_lat', 'delivery_lng']));
    }
};
