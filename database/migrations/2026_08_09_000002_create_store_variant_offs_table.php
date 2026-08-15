<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Đánh dấu 1 tuỳ chọn variant (topping/size/mức) HẾT tại 1 cửa hàng cụ thể.
    // Có dòng = "hết" ở cửa hàng đó. Không có dòng = còn (nếu option còn bật toàn hệ thống).
    public function up(): void
    {
        Schema::create('store_variant_offs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('variant_type', 50);   // = group key (VD: TOPPING, SIZE, key nhóm mức đường)
            $table->string('name', 100);           // tên tuỳ chọn (VD: Trân châu, Size L, 50%)
            $table->timestamps();

            $table->unique(['store_id', 'variant_type', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_variant_offs');
    }
};
