<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('stores', 'royalty_pct')) return;
        Schema::table('stores', function (Blueprint $table) {
            // Brand fee paid to the franchisor, as % of revenue.
            $table->decimal('royalty_pct', 5, 2)->default(3)->after('size');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('stores', 'royalty_pct')) return;
        Schema::table('stores', fn (Blueprint $t) => $t->dropColumn('royalty_pct'));
    }
};
