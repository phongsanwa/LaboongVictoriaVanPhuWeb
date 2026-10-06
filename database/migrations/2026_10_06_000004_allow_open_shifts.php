<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // A shift clocked in at the POS stays open (time_out null) until clock-out.
    public function up(): void
    {
        Schema::table('daily_entry_shifts', function (Blueprint $table) {
            $table->time('time_out')->nullable()->change();
            $table->decimal('hours', 5, 2)->default(0)->change();
            $table->unsignedInteger('wage_total')->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('daily_entry_shifts', function (Blueprint $table) {
            $table->time('time_out')->nullable(false)->change();
        });
    }
};
