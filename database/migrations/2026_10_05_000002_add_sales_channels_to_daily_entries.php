<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('daily_entries', 'gross_revenue')) {
            Schema::table('daily_entries', function (Blueprint $table) {
                $table->decimal('gross_revenue', 14, 2)->default(0)->after('is_saved');
                $table->decimal('discount_total', 14, 2)->default(0)->after('gross_revenue');   // giảm giá + chiết khấu + voucher
                $table->decimal('commission_total', 14, 2)->default(0)->after('discount_total'); // hoa hồng app giao hàng
            });
        }

        if (!Schema::hasTable('daily_entry_channels')) {
            Schema::create('daily_entry_channels', function (Blueprint $table) {
                $table->id();
                $table->foreignId('daily_entry_id')->constrained('daily_entries')->cascadeOnDelete();
                $table->string('channel', 20);
                $table->decimal('net_revenue', 14, 2)->default(0); // tiền thực nhận sau giảm giá & hoa hồng
                $table->unsignedInteger('orders')->nullable();
                $table->timestamps();
                $table->unique(['daily_entry_id', 'channel']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_entry_channels');
        if (Schema::hasColumn('daily_entries', 'gross_revenue')) {
            Schema::table('daily_entries', fn (Blueprint $t) => $t->dropColumn(['gross_revenue', 'discount_total', 'commission_total']));
        }
    }
};
