<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('recipe_ingredients', 'qty_m')) return;
        Schema::table('recipe_ingredients', function (Blueprint $table) {
            // null = size M uses 75% of qty_l
            $table->decimal('qty_m', 10, 4)->nullable()->after('qty_l');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('recipe_ingredients', 'qty_m')) return;
        Schema::table('recipe_ingredients', fn (Blueprint $table) => $table->dropColumn('qty_m'));
    }
};
