<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('variant_groups', function (Blueprint $table) {
            $table->id();
            $table->string('key', 50)->unique();
            $table->string('label', 100);
            $table->string('ic', 50)->default('cup');
            $table->string('type', 20)->default('size'); // size | addon | level
            $table->boolean('required')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Seed built-in groups
        DB::table('variant_groups')->insert([
            ['key' => 'SIZE',    'label' => 'Size cốc', 'ic' => 'cup',  'type' => 'size',  'required' => true,  'sort_order' => 0, 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'TOPPING', 'label' => 'Topping',  'ic' => 'plus', 'type' => 'addon', 'required' => false, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('variant_groups');
    }
};
