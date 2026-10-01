<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('daily_entry_expenses')) {
            Schema::create('daily_entry_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('daily_entry_id')->constrained('daily_entries')->cascadeOnDelete();
            $table->string('description')->default('');
            $table->decimal('amount', 12, 2)->default(0);
            $table->timestamps();
        });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_entry_expenses');
    }
};
