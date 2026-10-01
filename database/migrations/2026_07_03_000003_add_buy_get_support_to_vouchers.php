<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            // "Mua X tặng Y": số món phải mua (X); số món tặng dùng free_item_quantity (Y)
            $table->unsignedInteger('buy_quantity')->nullable()->after('free_item_quantity');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE vouchers MODIFY COLUMN discount_type ENUM('fixed', 'percentage', 'free_item', 'gift_item', 'buy_get') NOT NULL");
        }
    }

    public function down(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropColumn('buy_quantity');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE vouchers MODIFY COLUMN discount_type ENUM('fixed', 'percentage', 'free_item', 'gift_item') NOT NULL");
        }
    }
};
