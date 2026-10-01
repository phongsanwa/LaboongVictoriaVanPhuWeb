<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_store', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('staff')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['staff_id', 'store_id']);
        });

        // Chuyển cửa hàng đơn (staff.store_id) hiện có vào bảng nối
        foreach (DB::table('staff')->whereNotNull('store_id')->get(['id', 'store_id']) as $s) {
            DB::table('staff_store')->insertOrIgnore([
                'staff_id'   => $s->id,
                'store_id'   => $s->store_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_store');
    }
};
