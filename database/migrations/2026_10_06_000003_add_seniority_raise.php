<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('stores', 'raise_amount')) {
            Schema::table('stores', function (Blueprint $table) {
                $table->unsignedInteger('raise_amount')->default(1000)->after('wage_official');       // đ/giờ per step
                $table->unsignedSmallInteger('raise_every_months')->default(6)->after('raise_amount');
            });
        }
        if (!Schema::hasColumn('workers', 'rate_adjust')) {
            Schema::table('workers', function (Blueprint $table) {
                $table->integer('rate_adjust')->default(0)->after('official_from'); // manual ± đ/giờ
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('stores', 'raise_amount')) Schema::table('stores', fn (Blueprint $t) => $t->dropColumn(['raise_amount', 'raise_every_months']));
        if (Schema::hasColumn('workers', 'rate_adjust')) Schema::table('workers', fn (Blueprint $t) => $t->dropColumn('rate_adjust'));
    }
};
