<?php

namespace App\Console\Commands;

use App\Models\Redemption;
use App\Models\Voucher;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class FixFreeItemVouchers extends Command
{
    protected $signature = 'fix:free-item-vouchers';
    protected $description = 'Create missing free_item vouchers for existing redemptions';

    public function handle(): void
    {
        // Fix vouchers with empty discount_type (MySQL non-strict stored '' instead of failing)
        $fixed = 0;
        Voucher::where('discount_type', '')->with('redemption.reward')->get()->each(function ($v) use (&$fixed) {
            if (!$v->redemption?->reward) return;
            $v->update(['discount_type' => 'free_item']);
            $this->line("Fixed empty discount_type on voucher #{$v->id}");
            $fixed++;
        });

        // Create missing vouchers for approved redemptions with no voucher
        $created = 0;
        Redemption::with(['reward', 'reward.product'])
            ->where('status', 'approved')
            ->whereDoesntHave('voucher')
            ->get()
            ->each(function ($r) use (&$created) {
                $reward = $r->reward;
                if (!$reward) return;

                $base = [
                    'customer_id'    => $r->customer_id,
                    'redemption_id'  => $r->id,
                    'applies_to'     => 'ORDER',
                    'discount_type'  => 'free_item',
                    'min_purchase'   => null,
                    'max_discount'   => null,
                    'valid_from'     => now()->toDateString(),
                    'valid_until'    => $r->expires_at?->toDateString() ?? now()->addMonths(3)->toDateString(),
                    'usage_count'    => 0,
                    'status'         => 'active',
                ];

                if ($reward->category === 'upgrade' && (int) ($reward->value ?? 0) > 0) {
                    $qty = max(1, (int) ($reward->free_item_quantity ?? 1));
                    Voucher::create(array_merge($base, [
                        'voucher_code'         => 'TOP' . now()->format('Ymd') . strtoupper(Str::random(6)),
                        'discount_value'       => (int) $reward->value * $qty,
                        'free_item_product_id' => null,
                        'free_item_quantity'   => $qty,
                    ]));
                    $this->line("Created upgrade voucher for redemption #{$r->id} ({$reward->name})");
                    $created++;
                } elseif ($reward->reward_type === 'free_item' && $reward->product_id && in_array($reward->category, ['drink', 'gift'])) {
                    $product = Product::find($reward->product_id);
                    $qty = max(1, (int) ($reward->free_item_quantity ?? 1));
                    $unitPrice = $product ? (int) $product->base_price : 0;
                    Voucher::create(array_merge($base, [
                        'voucher_code'         => 'FRE' . now()->format('Ymd') . strtoupper(Str::random(6)),
                        'discount_value'       => $unitPrice * $qty,
                        'free_item_product_id' => $reward->product_id,
                        'free_item_quantity'   => $qty,
                    ]));
                    $this->line("Created free_item voucher for redemption #{$r->id} ({$reward->name})");
                    $created++;
                } else {
                    $this->line("Skipped redemption #{$r->id} ({$reward->name}) — no voucher rule matched (upgrade value={$reward->value})");
                }
            });

        $this->info("Done. Fixed: {$fixed}, Created: {$created}");
    }
}
