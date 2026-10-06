<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Worker extends Model
{
    public const TYPES = ['probation' => 'Thử việc', 'official' => 'Chính thức'];

    protected $fillable = ['store_id', 'name', 'phone', 'type', 'official_from', 'active'];

    protected $casts = ['official_from' => 'date', 'active' => 'boolean'];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(DailyEntryShift::class);
    }

    /** Official on that day: marked official, or past the scheduled promotion date. */
    public function isOfficialOn(Carbon $day): bool
    {
        return $this->type === 'official' || ($this->official_from && $day->gte($this->official_from));
    }

    public function rateOn(Carbon $day, Store $store): int
    {
        return $this->isOfficialOn($day) ? (int) $store->wage_official : (int) $store->wage_probation;
    }
}
