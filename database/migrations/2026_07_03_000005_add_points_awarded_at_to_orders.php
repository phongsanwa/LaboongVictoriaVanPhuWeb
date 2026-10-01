<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Mốc đã cộng điểm cho khách — chỉ cộng khi đơn HOÀN TẤT, tránh cộng 2 lần.
            $table->timestamp('points_awarded_at')->nullable()->after('points_earned');
        });

        // Đơn cũ đã cộng điểm lúc đặt (logic cũ): đánh dấu đã cộng để không cộng lại
        // khi hoàn tất theo logic mới. Nhận diện qua bản ghi điểm 'purchase' của đơn.
        $awarded = DB::table('customer_points')
            ->where('point_type', 'purchase')
            ->whereNotNull('reference_id')
            ->pluck('reference_id')
            ->all();

        if (!empty($awarded)) {
            DB::table('orders')->whereIn('id', $awarded)->update(['points_awarded_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('points_awarded_at');
        });
    }
};
