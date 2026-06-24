<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_promotions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->unsignedInteger('min_order_amount')->default(0); // VND
            $table->decimal('max_km', 8, 2)->nullable();             // null = mọi khoảng cách
            $table->enum('discount_type', ['free', 'percent', 'amount'])->default('free');
            $table->unsignedInteger('discount_value')->default(0);   // 0 nếu free, % hoặc VND
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_promotions');
    }
};
