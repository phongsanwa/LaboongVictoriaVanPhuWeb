<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreMonthlyCost extends Model
{
    public const BASE_KEYS = ['rent', 'salary', 'utility', 'depreciation'];

    /** Labels written by the old onboarding list format, mapped back to base keys. */
    private const LEGACY_LABELS = [
        'Tiền thuê mặt bằng' => 'rent',
        'Thuê mặt bằng'      => 'rent',
        'Lương nhân viên'    => 'salary',
        'Điện nước'          => 'utility',
        'Khấu hao'           => 'depreciation',
        'Khấu hao máy móc'   => 'depreciation',
    ];

    protected $fillable = ['store_id', 'year_month', 'costs'];

    protected function casts(): array
    {
        return ['costs' => 'array'];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Canonical shape: {rent, salary, utility, depreciation: number, custom_N: {label, amount}}.
     * Also accepts the legacy list shape [{label, amount}, ...].
     */
    public static function normalize(?array $costs): array
    {
        $map = array_fill_keys(self::BASE_KEYS, 0);
        $n = 0;
        foreach ($costs ?? [] as $key => $value) {
            if (is_int($key) && is_array($value)) {
                $label = trim((string) ($value['label'] ?? ''));
                $amount = max(0, (float) ($value['amount'] ?? 0));
                $base = self::LEGACY_LABELS[$label] ?? null;
                if ($base) $map[$base] = $amount;
                else $map['custom_' . (++$n)] = ['label' => $label, 'amount' => $amount];
            } elseif (in_array($key, self::BASE_KEYS, true)) {
                $map[$key] = max(0, (float) $value);
            } elseif (str_starts_with((string) $key, 'custom_') && is_array($value)) {
                $map[$key] = [
                    'label'  => mb_substr(trim((string) ($value['label'] ?? '')), 0, 100),
                    'amount' => max(0, (float) ($value['amount'] ?? 0)),
                ];
            }
        }

        return array_filter($map, fn ($v) => !is_array($v) || $v['label'] !== '' || $v['amount'] > 0);
    }

    public static function totalOf(?array $costs): float
    {
        $sum = 0;
        foreach (self::normalize($costs) as $v) {
            $sum += is_array($v) ? $v['amount'] : $v;
        }

        return $sum;
    }

    /** Costs in force for a month: that month's row, else the latest earlier one. */
    public static function effectiveFor(int $storeId, string $yearMonth): ?self
    {
        return static::where('store_id', $storeId)
            ->where('year_month', '<=', $yearMonth)
            ->orderByDesc('year_month')
            ->first();
    }

    public function total(): float
    {
        return self::totalOf($this->costs);
    }
}
