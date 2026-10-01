<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_blasts', function (Blueprint $table) {
            $table->id();
            $table->string('subject', 200);
            $table->longText('body')->nullable();          // ảnh chụp nội dung lúc gửi
            $table->string('audience', 20)->default('all'); // all | selected
            $table->unsignedInteger('total')->default(0);
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            // sending = đang gửi, sent = xong hết, partial = còn lỗi/chưa gửi hết
            $table->string('status', 20)->default('sending');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_blasts');
    }
};
