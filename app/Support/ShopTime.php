<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/** Shop-floor clock: the app runs in UTC, but shifts and business days follow Vietnam time. */
class ShopTime
{
    public const TZ = 'Asia/Ho_Chi_Minh';

    public static function now(): Carbon
    {
        return Carbon::now(self::TZ);
    }

    /** Today's business date, as a UTC-midnight Carbon so it compares cleanly with date columns. */
    public static function today(): Carbon
    {
        return Carbon::parse(self::now()->toDateString());
    }
}
