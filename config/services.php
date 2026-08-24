<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google_maps' => [
        'key' => env('GOOGLE_MAPS_KEY', ''),
    ],

    // SerpApi (serpapi.com) — dùng làm dự phòng khi Google Maps JS lỗi.
    // Key có thể đặt ở .env hoặc trong Admin → Cài đặt (AppSetting 'maps').
    'serpapi' => [
        'key' => env('SERPAPI_KEY', ''),
    ],

    // Apify (apify.com) — chạy actor để lấy toạ độ/địa chỉ & khoảng cách.
    // Token + slug actor có thể đặt ở .env hoặc trong Admin → Cài đặt.
    'apify' => [
        'token'            => env('APIFY_TOKEN', ''),
        'place_actor'      => env('APIFY_PLACE_ACTOR', 'compass~crawler-google-places'),
        'directions_actor' => env('APIFY_DIRECTIONS_ACTOR', 'zen-studio~google-maps-directions-api'),
    ],

];
