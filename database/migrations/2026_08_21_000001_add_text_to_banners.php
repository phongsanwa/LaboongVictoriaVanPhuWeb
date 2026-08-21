<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->string('subtitle', 300)->nullable()->after('title');
            // none = không hiện chữ, inside = chữ đè lên ảnh, outside = chữ dưới ảnh
            $table->string('text_position', 10)->default('none')->after('subtitle');
            $table->string('text_align', 10)->default('left')->after('text_position');
        });
    }

    public function down(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->dropColumn(['subtitle', 'text_position', 'text_align']);
        });
    }
};
