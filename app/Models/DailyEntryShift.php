<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyEntryShift extends Model
{
    protected $fillable = ['daily_entry_id', 'worker_id', 'time_in', 'time_out', 'hours', 'rate', 'kpi_bonus', 'allowance', 'note', 'wage_total'];

    protected $casts = ['hours' => 'float', 'rate' => 'integer', 'kpi_bonus' => 'integer', 'allowance' => 'integer', 'wage_total' => 'integer'];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(DailyEntry::class, 'daily_entry_id');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    /** Hours between "HH:MM" times; a time_out earlier than time_in runs past midnight. */
    public static function hoursBetween(string $in, string $out): float
    {
        [$h1, $m1] = array_map('intval', explode(':', $in));
        [$h2, $m2] = array_map('intval', explode(':', $out));
        $mins = ($h2 * 60 + $m2) - ($h1 * 60 + $m1);
        if ($mins < 0) $mins += 24 * 60;
        return round($mins / 60, 2);
    }
}
