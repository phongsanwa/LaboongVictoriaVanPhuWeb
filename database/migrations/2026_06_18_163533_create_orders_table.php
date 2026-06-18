<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
            $table->foreignId('store_id')->constrained('stores')->restrictOnDelete();
            $table->foreignId('voucher_id')->nullable()->constrained('vouchers')->nullOnDelete();
            $table->enum('status', ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'])
                  ->default('PENDING');
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->integer('points_used')->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->integer('points_earned')->default(0);
            $table->text('note')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancel_reason')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('customer_id');
            $table->index('store_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
