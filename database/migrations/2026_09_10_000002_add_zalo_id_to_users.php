<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // ID người dùng Zalo (liên kết tài khoản khi đăng nhập bằng Zalo Mini App)
            $table->string('zalo_id', 64)->nullable()->unique()->after('avatar_url');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('zalo_id');
        });
    }
};
