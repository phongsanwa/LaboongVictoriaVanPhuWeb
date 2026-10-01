<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('order_items', 'combo_id')) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->foreignId('combo_id')
                      ->nullable()
                      ->after('order_id')
                      ->constrained('combos')
                      ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['combo_id']);
            $table->dropColumn('combo_id');
        });
    }
};
