<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('combos')) return;
        Schema::create('combos', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('description', 500)->nullable();
            $table->string('image_url')->nullable();
            $table->unsignedInteger('combo_price');           // Giá combo (đã giảm)
            $table->unsignedInteger('original_price')->default(0); // Tự tính từ các món
            $table->unsignedSmallInteger('max_per_day')->nullable();
            $table->time('available_from')->nullable();
            $table->time('available_until')->nullable();
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();
            $table->enum('status', ['active', 'inactive', 'draft'])->default('draft');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combos');
    }
};
