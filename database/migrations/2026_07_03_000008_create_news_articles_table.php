<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('news_articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('excerpt', 500)->nullable();   // tóm tắt ngắn hiển thị trên thẻ
            $table->longText('body')->nullable();          // nội dung đầy đủ
            $table->enum('media_type', ['image', 'video', 'youtube'])->default('image');
            $table->string('image_url')->nullable();       // ảnh bìa / ảnh chính
            $table->string('video_url')->nullable();       // video tải lên (media_type=video)
            $table->string('youtube_url')->nullable();     // link YouTube (media_type=youtube)
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamp('published_at')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['status', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('news_articles');
    }
};
