<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_entry_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_entry_id')->constrained('daily_entries')->cascadeOnDelete();
            $table->foreignId('recipe_id')->constrained('recipes')->restrictOnDelete();
            $table->unsignedSmallInteger('qty_m')->default(0);
            $table->unsignedSmallInteger('qty_l')->default(0);
            $table->timestamps();
            $table->unique(['daily_entry_id', 'recipe_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_entry_sales');
    }
};
