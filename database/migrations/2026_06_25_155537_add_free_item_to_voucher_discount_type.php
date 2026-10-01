<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Blueprint cannot alter MySQL ENUMs directly; raw SQL required
        DB::statement("ALTER TABLE vouchers MODIFY COLUMN discount_type ENUM('fixed', 'percentage', 'free_item') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE vouchers MODIFY COLUMN discount_type ENUM('fixed', 'percentage') NOT NULL");
    }
};
