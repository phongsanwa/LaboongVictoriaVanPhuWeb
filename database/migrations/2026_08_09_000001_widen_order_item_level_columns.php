<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Cho phép lưu đúng % lượng đường/đá khách chọn (VD 70%, 30%) thay vì chỉ các mốc cứng.
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE order_items MODIFY sugar_level VARCHAR(10) NOT NULL DEFAULT '100'");
            DB::statement("ALTER TABLE order_items MODIFY ice_level   VARCHAR(10) NOT NULL DEFAULT '100'");
        }
        // SQLite/khác: cột vốn linh hoạt, không cần đổi.
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE order_items MODIFY sugar_level ENUM('0','25','50','75','100') NOT NULL DEFAULT '100'");
            DB::statement("ALTER TABLE order_items MODIFY ice_level   ENUM('0','25','50','75','100') NOT NULL DEFAULT '100'");
        }
    }
};
