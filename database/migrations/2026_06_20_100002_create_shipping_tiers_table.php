<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_tiers', function (Blueprint $table) {
            $table->id();
            $table->string('label', 100);
            $table->decimal('min_km', 8, 2)->default(0);
            $table->decimal('max_km', 8, 2)->nullable(); // null = không giới hạn
            $table->unsignedInteger('fee')->default(0);  // VND
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_tiers');
    }
};
