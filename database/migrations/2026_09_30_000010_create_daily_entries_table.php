<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->date('entry_date');
            $table->boolean('is_saved')->default(false);
            $table->timestamps();
            $table->unique(['store_id', 'entry_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_entries');
    }
};
