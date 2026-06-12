<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->decimal('discount_percent', 5, 2)->nullable()->after('multiplier');
            $table->unsignedInteger('opened_count')->default(0)->after('current_participants');
            $table->boolean('push_sent')->default(false)->after('is_stackable');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['discount_percent', 'opened_count', 'push_sent']);
        });
    }
};
