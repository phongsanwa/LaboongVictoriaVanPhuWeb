<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Cho phép điểm lẻ (điểm danh có thể cộng 0.1). Đơn hàng / đổi quà vẫn
        // dùng số nguyên bình thường — decimal chứa được cả số nguyên.
        Schema::table('customers', function (Blueprint $table) {
            $table->decimal('total_points', 12, 2)->default(0)->change();
            $table->decimal('lifetime_points', 12, 2)->default(0)->change();
        });

        Schema::table('customer_points', function (Blueprint $table) {
            $table->decimal('points', 12, 2)->change();
        });

        Schema::table('daily_checkins', function (Blueprint $table) {
            $table->decimal('points_awarded', 8, 2)->default(5)->change();
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->integer('total_points')->default(0)->change();
            $table->integer('lifetime_points')->default(0)->change();
        });

        Schema::table('customer_points', function (Blueprint $table) {
            $table->integer('points')->change();
        });

        Schema::table('daily_checkins', function (Blueprint $table) {
            $table->unsignedInteger('points_awarded')->default(5)->change();
        });
    }
};
