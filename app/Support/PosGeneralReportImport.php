<?php

namespace App\Support;

use App\Models\DailyEntryChannel;

/**
 * Reads a POS "báo cáo tổng quan" (general report): overview totals, revenue by order
 * source and revenue by item. Item lines carry money, not cups, so cup counts are
 * estimated as revenue ÷ list price and flagged for review.
 */
class PosGeneralReportImport
{
    /** @param array<int, array{id:int, name:string, price_m:float, price_l:float}> $recipes */
    public function __construct(private array $recipes) {}

    public static function looksLikeGeneralReport(array $rows): bool
    {
        foreach (array_slice($rows, 0, 10) as $row) {
            foreach ($row as $cell) {
                if (PosSalesImport::normalize((string) $cell) === 'nguon don hang') return true;
            }
        }
        return false;
    }

    public function import(array $rows): array
    {
        [$hdr, $cols] = $this->headerRow($rows);
        $data = array_slice($rows, $hdr + 1);

        $totals = ['gross' => 0, 'discount' => 0, 'commission' => 0, 'net' => 0, 'expense_out' => 0, 'orders' => 0];
        $channels = [];
        $items = [];

        foreach ($data as $row) {
            if (isset($cols['tong quan'])) {
                $c = $cols['tong quan'];
                $label = PosSalesImport::normalize((string) ($row[$c] ?? ''));
                $val = (float) ($row[$c + 1] ?? 0);
                match ($label) {
                    'tong doanh thu gross' => $totals['gross'] = $val,
                    'tong giam gia', 'tong chiet khau', 'phieu giam gia', 'giam gia vat' => $totals['discount'] += $val,
                    'tong hoa hong' => $totals['commission'] = $val,
                    'tong doanh thu net' => $totals['net'] = $val,
                    'so tien chi' => $totals['expense_out'] = $val,
                    'tong so hoa don' => $totals['orders'] = (int) $val,
                    default => null,
                };
            }
            if (isset($cols['nguon don hang'])) {
                $c = $cols['nguon don hang'];
                $name = self::clean($row[$c] ?? '');
                $val = (float) ($row[$c + 2] ?? 0);
                if ($name !== '' && $val != 0) {
                    $key = self::channelKey($name);
                    $channels[$key] = ($channels[$key] ?? 0) + $val;
                }
            }
            if (isset($cols['mon'])) {
                $c = $cols['mon'];
                $name = self::clean($row[$c] ?? '');
                $val = (float) ($row[$c + 2] ?? 0);
                if ($name !== '' && $val > 0) $items[] = [$name, $val];
            }
        }

        if (!$channels && !$items) {
            throw new \RuntimeException('Không đọc được doanh thu theo nguồn đơn hoặc theo món trong báo cáo.');
        }

        $byRecipe = [];
        $unmatched = [];
        foreach ($items as [$name, $revenue]) {
            $norm = PosSalesImport::normalize($name);
            $size = 'M';
            if (preg_match('/^(.*?)\s+size\s+(m|l)$/', $norm, $m)) { $norm = $m[1]; $size = strtoupper($m[2]); }
            $recipe = $this->match($norm);
            if (!$recipe) { $unmatched[] = $name; continue; }
            $price = $size === 'L' ? $recipe['price_l'] : $recipe['price_m'];
            $cups = $price > 0 ? max(1, (int) round($revenue / $price)) : 0;
            $byRecipe[$recipe['id']] ??= ['recipe_id' => $recipe['id'], 'qty_m' => 0, 'qty_l' => 0];
            $byRecipe[$recipe['id']][$size === 'L' ? 'qty_l' : 'qty_m'] += $cups;
        }

        $reportDate = null;
        foreach (array_slice($rows, 0, 3) as $row) {
            foreach ($row as $cell) {
                if (preg_match('/(\d{2})\/(\d{2})\/(\d{4})\D+(\d{2})\/(\d{2})\/(\d{4})/', (string) $cell, $m)
                    && "$m[1]$m[2]$m[3]" === "$m[4]$m[5]$m[6]") {
                    $reportDate = "$m[3]-$m[2]-$m[1]";
                }
            }
        }

        return [
            'type'      => 'general',
            'report_date' => $reportDate,
            'totals'    => $totals,
            'channels'  => collect($channels)->map(fn ($v, $k) => ['channel' => $k, 'net_revenue' => $v])->values()->all(),
            'matched'   => array_values($byRecipe),
            'unmatched' => $unmatched,
            'matched_names' => count($items) - count($unmatched),
            'total_names'   => count($items),
        ];
    }

    private static function clean(mixed $v): string
    {
        return trim(preg_replace('/[\x{200B}\x{FEFF}]/u', '', (string) $v));
    }

    public static function channelKey(string $source): string
    {
        $n = PosSalesImport::normalize($source);
        return match (true) {
            str_contains($n, 'grab')                                   => 'grab',
            str_contains($n, 'shopee')                                 => 'shopee',
            str_contains($n, 'xanh') || str_contains($n, 'be ')        => 'xanhsm',
            str_contains($n, 'web') || str_contains($n, 'online')      => 'web',
            str_contains($n, 'mang ve') || str_contains($n, 'take')    => 'mang_ve',
            str_contains($n, 'tai cho') || str_contains($n, 'tai quay') || str_contains($n, 'dine') => 'tai_cho',
            default                                                    => array_key_exists($n, DailyEntryChannel::CHANNELS) ? $n : 'khac',
        };
    }

    private function headerRow(array $rows): array
    {
        foreach (array_slice($rows, 0, 10, true) as $i => $row) {
            $cols = [];
            foreach ($row as $c => $cell) {
                $h = PosSalesImport::normalize((string) $cell);
                if (in_array($h, ['tong quan', 'nguon don hang', 'mon'], true)) $cols[$h] = $c;
            }
            if (isset($cols['nguon don hang'])) return [$i, $cols];
        }
        throw new \RuntimeException('Không tìm thấy mục "Nguồn đơn hàng" trong báo cáo.');
    }

    /** Exact name, else the cold version ("… Lạnh"), else a recipe containing the name. */
    private function match(string $base): ?array
    {
        $contains = null;
        foreach ($this->recipes as $r) {
            $rn = PosSalesImport::normalize($r['name']);
            if ($rn === $base || $rn === "$base lanh") return $r;
            if (!$contains && str_contains(" $rn ", " $base ") && !str_ends_with($rn, ' nong')) $contains = $r;
        }
        return $contains;
    }
}
