<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->foreignId('store_id')->nullable()->constrained('stores')->onDelete('set null');
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['M', 'F', 'Other'])->nullable();
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->foreignId('tier_id')->constrained('customer_tiers')->onDelete('restrict');
            $table->integer('total_points')->default(0);
            $table->integer('lifetime_points')->default(0);
            $table->decimal('total_spent', 15, 2)->default(0);
            $table->string('referral_code', 20)->unique()->nullable();
            $table->foreignId('referred_by_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('last_purchase_at')->nullable();
            $table->boolean('is_newsletter')->default(true);
            $table->boolean('is_push_enabled')->default(true);
            $table->json('favorite_items')->nullable();
            $table->timestamps();

            $table->index('store_id');
            $table->index('tier_id');
            $table->index('last_purchase_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
