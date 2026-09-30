<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ingredient_store_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ingredient_id')->constrained('ingredients')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->decimal('use_price', 12, 4);
            $table->timestamps();
            $table->unique(['ingredient_id', 'store_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ingredient_store_overrides');
    }
};
