<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->unsignedInteger('total_orders')->default(0)->after('total_points');
            $table->foreignId('favorite_product_id')->nullable()
                  ->after('total_orders')
                  ->constrained('products')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropForeign(['favorite_product_id']);
            $table->dropColumn(['total_orders', 'favorite_product_id']);
        });
    }
};
