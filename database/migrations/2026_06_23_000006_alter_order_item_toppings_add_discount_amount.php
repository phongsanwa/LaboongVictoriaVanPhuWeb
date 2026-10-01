<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_item_toppings', function (Blueprint $table) {
            $table->decimal('discount_amount', 10, 2)->default(0)->after('price_at_order');
        });
    }

    public function down(): void
    {
        Schema::table('order_item_toppings', function (Blueprint $table) {
            $table->dropColumn('discount_amount');
        });
    }
};
