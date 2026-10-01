<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('recipes')) {
            Schema::create('recipes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('input_mode', ['detailed', 'direct'])->default('detailed');
            $table->decimal('wastage_pct', 5, 2)->default(5.00);
            $table->decimal('packaging_m', 10, 2)->default(950);
            $table->decimal('packaging_l', 10, 2)->default(1300);
            $table->decimal('price_m', 10, 2)->default(0);
            $table->decimal('price_l', 10, 2)->default(0);
            $table->decimal('direct_cogs_m', 10, 2)->default(0);
            $table->decimal('direct_cogs_l', 10, 2)->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('recipes');
    }
};
