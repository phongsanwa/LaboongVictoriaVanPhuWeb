<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Thời gian pha chế mỗi ly (phút). NULL = dùng mặc định trong Cài đặt.
            $table->unsignedInteger('prep_minutes')->nullable()->after('base_price');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('prep_minutes');
        });
    }
};
