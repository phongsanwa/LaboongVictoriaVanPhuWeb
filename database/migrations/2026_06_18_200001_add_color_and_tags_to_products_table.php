<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('color', 255)->nullable()->after('image_url');
            $table->json('tags')->nullable()->after('color');
        });

        // Data migration: update existing slugs with correct colors and tags
        $data = [
            'tra-sua-tran-chau-duong-den'  => ['color' => 'linear-gradient(150deg,#6B4A2B,#9B7150)', 'tags' => ['hot']],
            'hong-tra-sua'                 => ['color' => 'linear-gradient(150deg,#A9743F,#C99A6A)', 'tags' => []],
            'tra-sua-khoai-mon'            => ['color' => 'linear-gradient(150deg,#8B6FB0,#B79CD6)', 'tags' => ['new']],
            'sua-tuoi-tran-chau-duong-den' => ['color' => 'linear-gradient(150deg,#5C4327,#8A6843)', 'tags' => ['hot']],
            'tra-dao-cam-sa'               => ['color' => 'linear-gradient(150deg,#FF8A3D,#FFB85C)', 'tags' => ['veg']],
            'tra-vai-hat-sen'              => ['color' => 'linear-gradient(150deg,#F2598A,#FF8FB3)', 'tags' => []],
            'tra-dau-tam'                  => ['color' => 'linear-gradient(150deg,#C2477B,#E06A9C)', 'tags' => ['new', 'veg']],
            'tra-oi-hong'                  => ['color' => 'linear-gradient(150deg,#E0518A,#F285AC)', 'tags' => ['veg']],
            'ca-phe-sua-da'                => ['color' => 'linear-gradient(150deg,#3E2A1A,#6B4A2B)', 'tags' => []],
            'bac-xiu'                      => ['color' => 'linear-gradient(150deg,#6B4A2B,#A07A52)', 'tags' => []],
            'ca-phe-muoi'                  => ['color' => 'linear-gradient(150deg,#4A3422,#7C5839)', 'tags' => ['hot']],
            'macchiato-kem-pho-mai'        => ['color' => 'linear-gradient(150deg,#0F623F,#1AA86A)', 'tags' => ['hot']],
            'da-xay-socola'                => ['color' => 'linear-gradient(150deg,#4A3422,#6B4A2B)', 'tags' => []],
            'da-xay-tra-xanh'              => ['color' => 'linear-gradient(150deg,#3E9B5F,#6FBF8A)', 'tags' => ['new', 'veg']],
            'tran-chau-duong-den'          => ['color' => 'linear-gradient(150deg,#5C4327,#8A6843)', 'tags' => []],
            'thach-pho-mai'                => ['color' => 'linear-gradient(150deg,#E0B84A,#F2D277)', 'tags' => []],
            'kem-pho-mai'                  => ['color' => 'linear-gradient(150deg,#0F623F,#1AA86A)', 'tags' => []],
            'pudding-trung'                => ['color' => 'linear-gradient(150deg,#E8973A,#F2B96B)', 'tags' => []],
        ];

        foreach ($data as $slug => $values) {
            DB::table('products')->where('slug', $slug)->update([
                'color' => $values['color'],
                'tags'  => json_encode($values['tags']),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['color', 'tags']);
        });
    }
};
