<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_item_toppings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')->constrained('order_items')->cascadeOnDelete();
            $table->foreignId('variant_id')->constrained('product_variants')->restrictOnDelete();
            $table->string('topping_name', 100);
            $table->decimal('price_at_order', 10, 2)->default(0);
            $table->timestamps();

            $table->unique(['order_item_id', 'variant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_item_toppings');
    }
};
