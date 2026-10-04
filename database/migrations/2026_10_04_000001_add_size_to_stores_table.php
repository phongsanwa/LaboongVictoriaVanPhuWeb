<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('stores', 'size')) return;
        Schema::table('stores', function (Blueprint $table) {
            $table->string('size', 50)->nullable()->after('address');
        });
    }

    public function down(): void
    {
        if (!Schema::hasColumn('stores', 'size')) return;
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('size');
        });
    }
};
