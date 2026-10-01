<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recipe_cost_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipe_id')->constrained('recipes')->cascadeOnDelete();
            $table->decimal('cogs_l', 10, 2);
            $table->date('recorded_on');
            $table->timestamps();
            $table->unique(['recipe_id', 'recorded_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recipe_cost_history');
    }
};
