<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade');
            $table->enum('role', ['cashier', 'manager', 'owner']);
            $table->string('employee_code', 50)->unique();
            $table->string('pin', 6);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->date('hired_date');
            $table->timestamps();

            $table->index('store_id');
            $table->index('role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff');
    }
};
