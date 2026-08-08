<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_item_toppings', function (Blueprint $table) {
            $table->unsignedSmallInteger('quantity')->default(1)->after('topping_name');
        });
    }

    public function down(): void
    {
        Schema::table('order_item_toppings', function (Blueprint $table) {
            $table->dropColumn('quantity');
        });
    }
};
