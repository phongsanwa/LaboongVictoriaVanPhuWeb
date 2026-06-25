<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            // 'price'   = badge gạch giá trên sản phẩm (scope all/specific)
            // 'voucher' = mã giảm đơn khách chọn trong giỏ hàng (applies_to ORDER)
            $table->enum('kind', ['price', 'voucher'])->default('price')->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->dropColumn('kind');
        });
    }
};
