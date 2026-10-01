<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rewards', function (Blueprint $table) {
            // Quà "miễn phí món" áp cho MỌI sản phẩm: product_id = null,
            // free_item_size giới hạn size được miễn phí (null = mọi size)
            $table->string('free_item_size', 30)->nullable()->after('free_item_quantity');
        });

        Schema::table('vouchers', function (Blueprint $table) {
            // 'any' = miễn phí món bất kỳ (không gắn sản phẩm cụ thể).
            // null  = hành vi cũ (có product_id → món cụ thể, không có → topping)
            $table->string('free_item_scope', 20)->nullable()->after('free_item_quantity');
            $table->string('free_item_size', 30)->nullable()->after('free_item_scope');
        });
    }

    public function down(): void
    {
        Schema::table('rewards', function (Blueprint $table) {
            $table->dropColumn('free_item_size');
        });
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropColumn(['free_item_scope', 'free_item_size']);
        });
    }
};
