<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('flash_sales')) {
            Schema::create('flash_sales', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100);
                $table->enum('repeat', ['once', 'weekly'])->default('once');
                $table->date('start_date');                 // once: the day; weekly: first valid day
                $table->date('end_date')->nullable();       // weekly: last valid day (null = no end)
                $table->json('weekdays')->nullable();       // weekly: ISO 1=Mon … 7=Sun
                $table->time('start_time');
                $table->time('end_time');
                $table->unsignedSmallInteger('upcoming_hours')->default(2); // show "Sắp diễn ra" this long before
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }
        if (!Schema::hasTable('flash_sale_items')) {
            Schema::create('flash_sale_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('flash_sale_id')->constrained('flash_sales')->cascadeOnDelete();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->unsignedInteger('flash_price');
                $table->unsignedInteger('quota')->nullable();        // per session, null = unlimited
                $table->unsignedSmallInteger('per_customer')->nullable();
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->timestamps();
            });
        }
        if (!Schema::hasColumn('order_items', 'flash_sale_item_id')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->foreignId('flash_sale_item_id')->nullable()->constrained('flash_sale_items')->nullOnDelete();
                $table->dateTime('flash_session')->nullable(); // which occurrence (Vietnam time) the units count against
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('order_items', 'flash_sale_item_id')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->dropConstrainedForeignId('flash_sale_item_id');
                $table->dropColumn('flash_session');
            });
        }
        Schema::dropIfExists('flash_sale_items');
        Schema::dropIfExists('flash_sales');
    }
};
