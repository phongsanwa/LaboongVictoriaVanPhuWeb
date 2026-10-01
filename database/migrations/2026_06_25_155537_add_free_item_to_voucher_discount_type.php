<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') return; // SQLite không hỗ trợ MODIFY ENUM
        DB::statement("ALTER TABLE vouchers MODIFY COLUMN discount_type ENUM('fixed', 'percentage', 'free_item') NOT NULL");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') return;
        DB::statement("ALTER TABLE vouchers MODIFY COLUMN discount_type ENUM('fixed', 'percentage') NOT NULL");
    }
};
