<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('combos')) {
            Schema::create('combos', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 100)->unique();
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->decimal('combo_price', 10, 2);
            $table->decimal('original_price', 10, 2)->default(0); // tổng giá gốc, tính tự động
            $table->unsignedSmallInteger('max_per_day')->nullable();  // giới hạn số combo/ngày
            $table->time('available_from')->nullable();   // giờ bắt đầu bán
            $table->time('available_until')->nullable();  // giờ kết thúc bán
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();
            $table->enum('status', ['active', 'inactive', 'draft'])->default('draft');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('status');
        });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('combos');
    }
};
