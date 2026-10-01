<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->string('icon', 50)->default('cup')->after('slug');
        });

        // Data migration: update known slugs with correct icons
        $iconMap = [
            'milktea' => 'cup',
            'fruit'   => 'plant',
            'coffee'  => 'coin',
            'special' => 'flame',
            'topping' => 'plus',
        ];

        foreach ($iconMap as $slug => $icon) {
            DB::table('categories')->where('slug', $slug)->update(['icon' => $icon]);
        }
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('icon');
        });
    }
};
