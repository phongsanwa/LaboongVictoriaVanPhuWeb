<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsArticle extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'seo_title',
        'seo_description',
        'body',
        'media_type',
        'image_url',
        'video_url',
        'youtube_url',
        'status',
        'published_at',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    /** ID video từ nhiều dạng URL YouTube (watch, youtu.be, shorts, embed). */
    public static function youtubeId(?string $url): ?string
    {
        if (!$url) return null;
        if (preg_match('~(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{11})~', $url, $m)) {
            return $m[1];
        }
        if (preg_match('~^[A-Za-z0-9_-]{11}$~', trim($url))) return trim($url);
        return null;
    }
}
