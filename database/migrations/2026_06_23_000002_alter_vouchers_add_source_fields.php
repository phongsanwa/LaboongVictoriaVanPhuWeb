<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            // Drop the existing foreign key on redemption_id first
            $table->dropForeign(['redemption_id']);

            // Make redemption_id nullable
            $table->unsignedBigInteger('redemption_id')->nullable()->change();

            // Re-add foreign key as nullable
            $table->foreign('redemption_id')->references('id')->on('redemptions')->nullOnDelete();

            // Add new columns after redemption_id
            $table->enum('source_type', ['REDEMPTION', 'PROMOTION_CLAIM'])->default('REDEMPTION')->after('redemption_id');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');
            $table->enum('applies_to', ['ORDER', 'SHIPPING'])->default('ORDER')->after('source_id');
        });
    }

    public function down(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropForeign(['redemption_id']);
            $table->dropColumn(['source_type', 'source_id', 'applies_to']);
            $table->unsignedBigInteger('redemption_id')->nullable(false)->change();
            $table->foreign('redemption_id')->references('id')->on('redemptions');
        });
    }
};
