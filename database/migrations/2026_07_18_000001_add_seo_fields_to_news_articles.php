<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news_articles', function (Blueprint $table) {
            // SEO riêng từng bài — null = dùng title/excerpt của bài
            $table->string('seo_title', 100)->nullable()->after('excerpt');
            $table->string('seo_description', 300)->nullable()->after('seo_title');
        });
    }

    public function down(): void
    {
        Schema::table('news_articles', function (Blueprint $table) {
            $table->dropColumn(['seo_title', 'seo_description']);
        });
    }
};
