<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('birthday_awards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('campaign_id')->constrained('campaigns')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->integer('points_awarded')->default(0);
            $table->foreignId('redemption_id')->nullable()->constrained('redemptions')->nullOnDelete();
            $table->timestamp('awarded_at');
            $table->timestamps();

            $table->unique(['customer_id', 'campaign_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('birthday_awards');
    }
};
