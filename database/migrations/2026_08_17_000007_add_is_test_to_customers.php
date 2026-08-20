<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // Tài khoản thử nghiệm (đăng ký để test mua hàng) — loại khỏi báo cáo.
            $table->boolean('is_test')->default(false)->after('store_id');
        });
    }

    public function down(): void
    {
        Schema::table('customers', fn (Blueprint $t) => $t->dropColumn('is_test'));
    }
};
