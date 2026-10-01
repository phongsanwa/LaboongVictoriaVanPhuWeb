<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite (local dev) không hỗ trợ MODIFY và cũng không ép enum
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE vouchers MODIFY COLUMN discount_type ENUM('fixed', 'percentage', 'free_item', 'gift_item') NOT NULL");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE vouchers MODIFY COLUMN discount_type ENUM('fixed', 'percentage', 'free_item') NOT NULL");
        }
    }
};
