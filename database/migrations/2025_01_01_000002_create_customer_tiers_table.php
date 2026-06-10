<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_tiers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->unsignedInteger('level')->unique();
            $table->integer('min_points');
            $table->integer('min_transactions')->nullable();
            $table->integer('min_days_active')->nullable();
            $table->decimal('point_multiplier', 3, 2)->default(1.00);
            $table->text('description')->nullable();
            $table->string('color_code', 10)->nullable();
            $table->string('icon_url', 500)->nullable();
            $table->timestamps();

            $table->index('min_points');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_tiers');
    }
};
