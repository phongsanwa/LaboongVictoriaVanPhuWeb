<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rewards', function (Blueprint $table) {
            // null = không giới hạn số lần đổi cho mỗi khách
            $table->unsignedInteger('per_customer_limit')->nullable()->after('quantity_total');
        });
    }

    public function down(): void
    {
        Schema::table('rewards', function (Blueprint $table) {
            $table->dropColumn('per_customer_limit');
        });
    }
};
