<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_templates', function (Blueprint $table) {
            $table->boolean('attach_qr')->default(false)->after('body');
        });

        Schema::table('email_blasts', function (Blueprint $table) {
            $table->boolean('attach_qr')->default(false)->after('body');
            // Thời điểm hẹn gửi; null = gửi ngay. status 'scheduled' khi chờ tới giờ.
            $table->timestamp('scheduled_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('email_templates', fn (Blueprint $t) => $t->dropColumn('attach_qr'));
        Schema::table('email_blasts', fn (Blueprint $t) => $t->dropColumn(['attach_qr', 'scheduled_at']));
    }
};
