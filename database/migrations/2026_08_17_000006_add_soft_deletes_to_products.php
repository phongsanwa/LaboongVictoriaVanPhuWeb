<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Xoá mềm: món đã có trong đơn cũ thì ẩn đi (giữ lịch sử đơn hàng)
            // thay vì xoá cứng gây lỗi khoá ngoại order_items.
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $t) => $t->dropSoftDeletes());
    }
};
