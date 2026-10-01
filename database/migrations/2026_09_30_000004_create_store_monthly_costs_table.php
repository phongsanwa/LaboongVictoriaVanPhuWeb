<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('store_monthly_costs')) {
            Schema::create('store_monthly_costs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->char('year_month', 7); // e.g. "2026-07"
            $table->json('costs');         // {rent:0, salary:0, utility:0, depreciation:0, custom_1:{label,amount}, ...}
            $table->timestamps();
            $table->unique(['store_id', 'year_month']);
        });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('store_monthly_costs');
    }
};
