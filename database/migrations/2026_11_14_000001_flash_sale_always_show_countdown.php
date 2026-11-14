<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** upcoming_hours = 0 nghĩa là: đợt đang bật thì luôn hiện đếm ngược tới phiên kế tiếp. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('flash_sales', function (Blueprint $table) {
            $table->unsignedSmallInteger('upcoming_hours')->default(0)->change();
        });
        DB::table('flash_sales')->update(['upcoming_hours' => 0]);
    }

    public function down(): void
    {
        Schema::table('flash_sales', function (Blueprint $table) {
            $table->unsignedSmallInteger('upcoming_hours')->default(2)->change();
        });
    }
};
