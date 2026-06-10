<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_points', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->foreignId('transaction_id')->nullable()->constrained('transactions')->onDelete('set null');
            $table->enum('point_type', ['purchase', 'redemption', 'bonus', 'admin', 'referral', 'campaign']);
            $table->integer('points');
            $table->string('description');
            $table->string('reference_id', 50)->nullable();
            $table->date('expires_at')->nullable();
            $table->timestamps();

            $table->index('customer_id');
            $table->index('transaction_id');
            $table->index('point_type');
            $table->index('created_at');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_points');
    }
};
