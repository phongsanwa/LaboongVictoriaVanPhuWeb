<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {

        Schema::table('rewards', function (Blueprint $table) {
            $table->unsignedSmallInteger('free_item_quantity')->default(1)->after('product_id');
        });

        Schema::table('vouchers', function (Blueprint $table) {
            $table->unsignedSmallInteger('free_item_quantity')->default(1)->after('free_item_product_id');
        });
    }

    public function down(): void
    {
        Schema::table('rewards', function (Blueprint $table) {
            $table->dropColumn('free_item_quantity');
        });

        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropColumn('free_item_quantity');
        });
    }
};
