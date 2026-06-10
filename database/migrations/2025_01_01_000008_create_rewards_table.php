<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rewards', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('reward_type', ['discount_voucher', 'free_item', 'tier_upgrade', 'other']);
            $table->integer('points_required');
            $table->decimal('value', 10, 2)->nullable();
            $table->integer('quantity_available')->nullable();
            $table->integer('quantity_total')->nullable();
            $table->string('image_url', 500)->nullable();
            $table->date('valid_from');
            $table->date('valid_until');
            $table->decimal('min_purchase', 10, 2)->nullable();
            $table->string('category', 100)->nullable();
            $table->enum('status', ['active', 'inactive', 'archived'])->default('active');
            $table->integer('display_order')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->timestamps();

            $table->index('points_required');
            $table->index('category');
            $table->index('status');
            $table->index('is_featured');
            $table->index('valid_until');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rewards');
    }
};
