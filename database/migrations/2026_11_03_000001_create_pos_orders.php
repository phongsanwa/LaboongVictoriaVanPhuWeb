<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Đơn lên tại quầy (POS web): tại chỗ, mang về, ShopeeFood, GrabFood, Xanh SM. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->restrictOnDelete();
            $table->date('business_date');                 // ngày bán (giờ Việt Nam)
            $table->unsignedInteger('queue_no');           // số thứ tự trong ngày của cửa hàng
            $table->string('channel', 20);                 // tai_cho | mang_ve | shopee | grab | xanhsm
            $table->string('external_code', 60)->nullable(); // mã đơn trên app giao hàng
            $table->string('status', 20)->default('done'); // done | cancelled
            $table->unsignedInteger('subtotal')->default(0);
            $table->unsignedInteger('total')->default(0);
            $table->string('payment_method', 20)->default('cash'); // cash | bank | app
            $table->string('note', 500)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason', 255)->nullable();
            $table->timestamps();

            $table->index(['store_id', 'business_date']);
            $table->unique(['store_id', 'business_date', 'queue_no']);
        });

        Schema::create('pos_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pos_order_id')->constrained('pos_orders')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('quantity');
            $table->unsignedInteger('unit_price');          // giá 1 ly (đã gồm size + topping)
            $table->unsignedInteger('line_total');
            $table->string('size_name', 60)->nullable();
            $table->json('options')->nullable();            // [{group, label, value}], toppings [{name, qty, price}]
            $table->string('note', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_order_items');
        Schema::dropIfExists('pos_orders');
    }
};
