<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->decimal('min_purchase', 10, 2)->nullable()->after('scope');
            $table->decimal('max_discount', 10, 2)->nullable()->after('min_purchase');
            $table->date('valid_from')->nullable()->after('max_discount');
            $table->date('valid_until')->nullable()->after('valid_from');
            $table->integer('usage_limit_total')->nullable()->after('valid_until');
            $table->integer('usage_limit_per_customer')->nullable()->default(1)->after('usage_limit_total');
            $table->enum('applies_to', ['ORDER', 'SHIPPING'])->default('ORDER')->after('usage_limit_per_customer');
            $table->unsignedInteger('claimed_count')->default(0)->after('applies_to');
        });
    }

    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->dropColumn([
                'min_purchase', 'max_discount', 'valid_from', 'valid_until',
                'usage_limit_total', 'usage_limit_per_customer', 'applies_to', 'claimed_count',
            ]);
        });
    }
};
