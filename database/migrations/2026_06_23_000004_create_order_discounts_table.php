<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->enum('discount_category', ['GIFT_VOUCHER', 'PROMOTION_VOUCHER', 'SHIPPING']);
            $table->unsignedBigInteger('voucher_id')->nullable();
            $table->unsignedBigInteger('redemption_id')->nullable();
            $table->decimal('discount_amount', 10, 2);
            $table->string('description', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('voucher_id')->references('id')->on('vouchers')->nullOnDelete();
            $table->foreign('redemption_id')->references('id')->on('redemptions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_discounts');
    }
};
