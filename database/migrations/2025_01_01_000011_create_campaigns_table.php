<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('campaign_type', ['double_points', 'bonus_points', 'discount_promotion', 'free_item']);
            $table->enum('target_audience', ['all_customers', 'specific_tier', 'new_customers', 'vip_only']);
            $table->foreignId('tier_id')->nullable()->constrained('customer_tiers')->onDelete('set null');
            $table->foreignId('store_id')->nullable()->constrained('stores')->onDelete('set null');
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('bonus_points')->nullable();
            $table->decimal('multiplier', 3, 2)->nullable();
            $table->decimal('min_purchase', 10, 2)->nullable();
            $table->integer('max_participants')->nullable();
            $table->integer('current_participants')->default(0);
            $table->enum('status', ['draft', 'active', 'scheduled', 'ended'])->default('draft');
            $table->boolean('is_stackable')->default(false);
            $table->string('banner_image_url', 500)->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->timestamps();

            $table->index('campaign_type');
            $table->index('status');
            $table->index('start_date');
            $table->index('end_date');
            $table->index('store_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
