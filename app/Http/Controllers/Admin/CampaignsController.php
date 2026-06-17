<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Customer;
use App\Models\CustomerTier;
use App\Models\Reward;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class CampaignsController extends Controller
{
    /** Maps the editor's campaign "type" to campaigns.campaign_type. */
    private const TYPE_MAP = [
        'x2' => 'double_points',
        'discount' => 'discount_promotion',
        'voucher' => 'free_item',
    ];

    /** Maps campaigns.status to the UI's status keys. */
    private const STATUS_MAP = [
        'active' => 'running',
        'scheduled' => 'scheduled',
        'ended' => 'ended',
        'draft' => 'draft',
    ];

    public function index()
    {
        $admin = Auth::user();
        $audiences = $this->audiences();

        $campaigns = Campaign::with('reward')->orderByDesc('id')
            ->get()
            ->map(fn (Campaign $c) => $this->present($c, $audiences))
            ->values();

        $rewards = Reward::where('status', 'active')
            ->orderBy('category')
            ->orderBy('name')
            ->get(['id', 'name', 'points_required', 'category', 'image_url'])
            ->map(fn ($r) => [
                'id'       => $r->id,
                'name'     => $r->name,
                'points'   => $r->points_required,
                'category' => $r->category,
                'image'    => $r->image_url,
            ])->values();

        return view('admin.campaigns', [
            'campaignsData' => [
                'admin' => [
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'campaigns' => $campaigns,
                'audiences' => $audiences,
                'rewards'   => $rewards,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $status = $data['start_date'] > Carbon::now()->toDateString() ? 'scheduled' : 'active';

        $campaign = Campaign::create([
            ...$data,
            'status' => $status,
            'current_participants' => 0,
            'opened_count' => 0,
            'push_sent' => false,
            'created_by' => Auth::id(),
        ]);

        return response()->json(['campaign' => $this->present($campaign, $this->audiences())]);
    }

    public function update(Request $request, Campaign $campaign)
    {
        $data = $this->validated($request);

        $campaign->update($data);

        return response()->json(['campaign' => $this->present($campaign, $this->audiences())]);
    }

    public function toggle(Campaign $campaign)
    {
        $campaign->status = $campaign->status === 'active' ? 'scheduled' : 'active';
        $campaign->save();

        return response()->json(['campaign' => $this->present($campaign, $this->audiences())]);
    }

    public function push(Campaign $campaign)
    {
        $campaign->push_sent = true;
        $campaign->save();

        return response()->json(['campaign' => $this->present($campaign, $this->audiences())]);
    }

    private function validated(Request $request): array
    {
        $audienceKeys = array_keys($this->audiences());

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(array_keys(self::TYPE_MAP))],
            'value'     => ['nullable', 'numeric', 'min:1', 'max:100'],
            'reward_id' => ['nullable', 'integer', 'exists:rewards,id'],
            'start'     => ['required', 'date'],
            'end'       => ['required', 'date', 'after_or_equal:start'],
            'condition' => ['nullable', 'string', 'max:500'],
            'audience'  => ['required', Rule::in($audienceKeys)],
        ]);

        [$targetAudience, $tierId] = $this->resolveAudience($data['audience']);

        return [
            'name' => $data['name'],
            'description' => $data['condition'] ?: null,
            'campaign_type' => self::TYPE_MAP[$data['type']],
            'target_audience' => $targetAudience,
            'tier_id' => $tierId,
            'start_date' => $data['start'],
            'end_date' => $data['end'],
            'multiplier'       => $data['type'] === 'x2' ? (float) ($data['value'] ?? 2) : null,
            'discount_percent' => $data['type'] === 'discount' ? $data['value'] : null,
            'reward_id'        => $data['type'] === 'voucher' ? ($data['reward_id'] ?? null) : null,
        ];
    }

    private function resolveAudience(string $key): array
    {
        if ($key === 'all') {
            return ['all_customers', null];
        }

        if ($key === 'new') {
            return ['new_customers', null];
        }

        return ['specific_tier', (int) substr($key, 5)];
    }

    /** Audience definitions (label/icon/size) keyed the same way the editor's "audience" field is. */
    private function audiences(): array
    {
        $audiences = [
            'all' => [
                'label' => 'Tất cả khách hàng',
                'ic' => 'users',
                'size' => Customer::count(),
            ],
            'new' => [
                'label' => 'Khách hàng mới',
                'ic' => 'sparkle2',
                'size' => Customer::where('created_at', '>=', Carbon::now()->subDays(30))->count(),
            ],
        ];

        foreach (CustomerTier::orderBy('level')->get() as $tier) {
            $audiences['tier_' . $tier->id] = [
                'label' => $tier->name,
                'ic' => 'star',
                'size' => Customer::where('tier_id', $tier->id)->count(),
            ];
        }

        return $audiences;
    }

    private function audienceKey(Campaign $campaign): string
    {
        return match ($campaign->target_audience) {
            'all_customers' => 'all',
            'new_customers' => 'new',
            'specific_tier' => 'tier_' . $campaign->tier_id,
            default => 'all',
        };
    }

    private function present(Campaign $campaign, array $audiences): array
    {
        $audienceKey = $this->audienceKey($campaign);
        $reward = $campaign->reward;

        return [
            'id'   => 'CMP' . (700 + $campaign->id),
            'dbId' => $campaign->id,
            'name' => $campaign->name,
            'type' => array_flip(self::TYPE_MAP)[$campaign->campaign_type] ?? 'voucher',
            'value' => $campaign->discount_percent !== null
                ? (int) $campaign->discount_percent
                : ($campaign->multiplier !== null ? (float) $campaign->multiplier : null),
            'reward_id'   => $campaign->reward_id,
            'rewardName'  => $reward?->name,
            'rewardImage' => $reward?->image_url,
            'audience'    => $audienceKey,
            'start' => $campaign->start_date->toDateString(),
            'end' => $campaign->end_date->toDateString(),
            'condition' => $campaign->description ?? '',
            'status' => self::STATUS_MAP[$campaign->status] ?? $campaign->status,
            'reach' => $audiences[$audienceKey]['size'] ?? 0,
            'opened' => $campaign->opened_count,
            'converted' => $campaign->current_participants,
            'pushSent' => (bool) $campaign->push_sent,
        ];
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
