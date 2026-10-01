<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreVariantOff extends Model
{
    protected $fillable = ['store_id', 'variant_type', 'name'];

    /** Map [store_id => ["TYPE|Name" => true]] để tra nhanh option nào hết ở cửa hàng nào. */
    public static function map(): array
    {
        $out = [];
        foreach (static::all() as $r) {
            $out[$r->store_id]["{$r->variant_type}|{$r->name}"] = true;
        }
        return $out;
    }

    /** Danh sách "TYPE|Name" đang hết ở 1 cửa hàng. */
    public static function offKeysFor(int $storeId): array
    {
        return static::where('store_id', $storeId)
            ->get()
            ->map(fn ($r) => "{$r->variant_type}|{$r->name}")
            ->all();
    }
}
