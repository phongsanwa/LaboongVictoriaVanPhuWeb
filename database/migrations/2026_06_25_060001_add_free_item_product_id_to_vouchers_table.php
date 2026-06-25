<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            // For free_item discount_type vouchers — identifies which product is free
            $table->unsignedBigInteger('free_item_product_id')->nullable()->after('discount_value');
            $table->foreign('free_item_product_id')->references('id')->on('products')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropForeign(['free_item_product_id']);
            $table->dropColumn('free_item_product_id');
        });
    }
};
