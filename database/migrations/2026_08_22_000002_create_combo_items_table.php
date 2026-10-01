<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('combo_items', function (Blueprint $table) {
            $table->id();
            // Sản phẩm combo (cha)
            $table->foreignId('combo_id')->constrained('products')->cascadeOnDelete();
            // Món con nằm trong combo
            $table->foreignId('item_product_id')->constrained('products')->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('combo_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combo_items');
    }
};
