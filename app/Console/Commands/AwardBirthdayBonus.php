<?php

namespace App\Console\Commands;

use App\Models\BirthdayAward;
use App\Models\Campaign;
use App\Models\Customer;
use App\Models\CustomerPoint;
use App\Models\Redemption;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AwardBirthdayBonus extends Command
{
    protected $signature = 'birthday:award
                            {--date= : Override today\'s date (YYYY-MM-DD), useful for testing}
                            {--dry-run : List eligible customers without actually awarding}';

    protected $description = 'Award birthday bonus points and/or vouchers to customers whose birthday falls today (or within campaign window)';

    public function handle(): int
    {
        $today = $this->option('date')
            ? Carbon::parse($this->option('date'))
            : Carbon::now()->startOfDay();

        $dry = (bool) $this->option('dry-run');

        $this->info(($dry ? '[DRY RUN] ' : '') . "Running birthday awards for {$today->toDateString()}");

        $campaigns = Campaign::where('campaign_type', 'birthday')
            ->where('status', 'active')
            ->where('start_date', '<=', $today->toDateString())
            ->where('end_date', '>=', $today->toDateString())
            ->with('reward')
            ->get();

        if ($campaigns->isEmpty()) {
            $this->warn('No active birthday campaigns found.');
            return self::SUCCESS;
        }

        $this->line("Found {$campaigns->count()} active birthday campaign(s).");

        $totalAwarded = 0;

        foreach ($campaigns as $campaign) {
            $window = max(0, (int) $campaign->birthday_window_days);

            // Build a set of (month, day) pairs covered by this campaign's window
            $birthDates = collect();
            for ($offset = -$window; $offset <= $window; $offset++) {
                $d = $today->copy()->addDays($offset);
                $birthDates->push(['month' => $d->month, 'day' => $d->day]);
            }

            $year = $today->year;

            // Load customers matching any of the birthday (month, day) pairs
            // who haven't received THIS campaign's award yet this year
            $customers = Customer::query()
                ->whereHas('user', fn ($q) => $q->where('status', 'active'))
                ->whereDoesntHave('birthdayAwards', fn ($q) => $q
                    ->where('campaign_id', $campaign->id)
                    ->where('year', $year))
                ->where(function ($q) use ($birthDates) {
                    foreach ($birthDates as $i => $bd) {
                        $method = $i === 0 ? 'where' : 'orWhere';
                        $q->{$method}(function ($sub) use ($bd) {
                            $sub->whereMonth('date_of_birth', $bd['month'])
                                ->whereDay('date_of_birth', $bd['day']);
                        });
                    }
                })
                ->whereNotNull('date_of_birth')
                ->with('user')
                ->get();

            if ($customers->isEmpty()) {
                $this->line("  Campaign \"{$campaign->name}\": no eligible customers today.");
                continue;
            }

            $this->line("  Campaign \"{$campaign->name}\": {$customers->count()} eligible customer(s).");

            foreach ($customers as $customer) {
                if ($dry) {
                    $dob = $customer->date_of_birth->format('d/m');
                    $this->line("    [DRY] {$customer->user->name} (DOB {$dob}) — would award {$campaign->bonus_points} pts"
                        . ($campaign->reward_id ? " + voucher \"{$campaign->reward->name}\"" : ''));
                    $totalAwarded++;
                    continue;
                }

                try {
                    DB::transaction(function () use ($customer, $campaign, $year, $today) {
                        $redemptionId = null;

                        // Award bonus points
                        if ($campaign->bonus_points > 0) {
                            CustomerPoint::create([
                                'customer_id' => $customer->id,
                                'point_type'  => 'campaign',
                                'points'      => $campaign->bonus_points,
                                'description' => "Thưởng sinh nhật: {$campaign->name}",
                                'reference_id' => $campaign->id,
                                'expires_at'  => $today->copy()->addYear(),
                            ]);

                            $customer->increment('total_points', $campaign->bonus_points);
                            $customer->increment('lifetime_points', $campaign->bonus_points);
                        }

                        // Award free voucher/reward
                        if ($campaign->reward_id) {
                            $reward = $campaign->reward;
                            $redemption = Redemption::create([
                                'customer_id'      => $customer->id,
                                'reward_id'        => $campaign->reward_id,
                                'redemption_code'  => strtoupper(Str::random(10)),
                                'points_spent'     => 0,
                                'quantity'         => 1,
                                'status'           => 'active',
                                'redeemed_at'      => $today,
                                'expires_at'       => $today->copy()->addDays(30),
                                'notes'            => "Quà sinh nhật từ chiến dịch: {$campaign->name}",
                            ]);
                            $redemptionId = $redemption->id;
                        }

                        // Record the award to prevent duplicates
                        BirthdayAward::create([
                            'customer_id'    => $customer->id,
                            'campaign_id'    => $campaign->id,
                            'year'           => $year,
                            'points_awarded' => $campaign->bonus_points,
                            'redemption_id'  => $redemptionId,
                            'awarded_at'     => $today,
                        ]);

                        $campaign->increment('current_participants');
                    });

                    $totalAwarded++;
                } catch (\Exception $e) {
                    $this->error("    Failed for customer #{$customer->id}: {$e->getMessage()}");
                }
            }
        }

        $verb = $dry ? 'Would award' : 'Awarded';
        $this->info("{$verb} bonuses to {$totalAwarded} customer(s).");

        return self::SUCCESS;
    }
}
