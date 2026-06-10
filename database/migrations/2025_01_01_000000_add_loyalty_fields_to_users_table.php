<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->unique()->after('name');
            $table->timestamp('phone_verified_at')->nullable()->after('email_verified_at');
            $table->enum('user_type', ['customer', 'staff', 'admin'])->default('customer')->after('password');
            $table->enum('status', ['active', 'inactive', 'banned'])->default('active')->after('user_type');
            $table->string('avatar_url', 500)->nullable()->after('status');
            $table->timestamp('last_login_at')->nullable()->after('avatar_url');

            $table->index('user_type');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['user_type']);
            $table->dropIndex(['status']);
            $table->dropColumn([
                'phone',
                'phone_verified_at',
                'user_type',
                'status',
                'avatar_url',
                'last_login_at',
            ]);
        });
    }
};
