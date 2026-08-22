<?php

namespace App\Http\Controllers;

use App\Http\Controllers\CheckinController;
use App\Support\AdminAccess;
use App\Models\Campaign;
use App\Models\CustomerPoint;
use App\Models\DailyCheckin;
use App\Models\Reward;
use App\Models\Store;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class HomeController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $customer = $user->customer()->with(['tier', 'store'])->first();

        if (!$customer) {
            return view('welcome', ['homeData' => [
                'member' => ['name' => $user->name, 'id' => '—', 'tier' => '—'],
                'points' => 0,
                'goal' => 0,
                'reward' => '',
                'promos' => [],
                'transactions' => [],
                'store' => null,
                'pointsThisWeek' => 0,
                'checkin' => ['streak' => 0, 'last' => null, 'today' => false],
                'checkinConfig' => CheckinController::checkinConfig(),
                'checkinEnabled' => CheckinController::isEnabled(),
                'news' => $this->buildNews(),
                'adminAccess' => AdminAccess::canEnter($user),
                'iosGuideHtml' => \App\Models\AppSetting::get('general', [])['ios_guide_html'] ?? null,
                'banners' => $this->buildBanners(),
                'stores' => $this->buildStores(),
                'staffEntry' => $this->staffEntry($user),
            ]]);
        }

        $member = [
            'name' => $user->name,
            'id' => $customer->referral_code ?? ('LBVP-' . str_pad((string) $customer->id, 5, '0', STR_PAD_LEFT)),
            'tier' => $customer->tier->name ?? '',
        ];

        $nextReward = Reward::where('status', 'active')
            ->where('points_required', '>', $customer->total_points)
            ->orderBy('points_required')
            ->first();

        if (!$nextReward) {
            $nextReward = Reward::where('status', 'active')->orderByDesc('points_required')->first();
        }

        $pointsThisWeek = (int) CustomerPoint::where('customer_id', $customer->id)
            ->where('points', '>', 0)
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->sum('points');

        $recentPoints = CustomerPoint::where('customer_id', $customer->id)
            ->orderByDesc('created_at')
            ->limit(3)
            ->get();

        $transactions = $recentPoints->map(function (CustomerPoint $cp) {
            $isEarn = $cp->points >= 0;

            return [
                'type' => $isEarn ? 'earn' : 'redeem',
                'icon' => $isEarn ? 'cup' : 'gift',
                'title' => $cp->description,
                'meta' => $this->formatTxDate($cp->created_at),
                'amt' => $cp->points,
            ];
        })->values()->all();

        $now = Carbon::now()->toDateString();
        $campaigns = Campaign::where('status', 'active')
            ->where('start_date', '<=', $now)
            ->where('end_date', '>=', $now)
            ->orderBy('id')
            ->get();

        $promos = $campaigns->map(function (Campaign $c) {
            return [
                'tag' => $this->campaignTag($c->campaign_type),
                'icon' => $this->campaignIcon($c->campaign_type),
                'bg' => $this->campaignBg($c->campaign_type),
                'title' => $c->name,
                'sub' => $c->description,
                'benefit' => $this->campaignBenefit($c),
                'start' => $c->start_date?->format('d/m/Y'),
                'end' => $c->end_date?->format('d/m/Y'),
            ];
        })->values()->all();

        $store = $customer->store ?: Store::where('status', 'active')->first();

        $today = Carbon::today()->toDateString();
        $lastCheckin = DailyCheckin::where('customer_id', $customer->id)->orderByDesc('checkin_date')->first();
        $checkinState = [
            'streak' => $lastCheckin ? $lastCheckin->streak : 0,
            'last' => $lastCheckin ? $lastCheckin->checkin_date->toDateString() : null,
            'today' => $lastCheckin && $lastCheckin->checkin_date->toDateString() === $today,
        ];
        $checkinConfig = CheckinController::checkinConfig();

        return view('welcome', ['homeData' => [
            'member' => $member,
            'points' => $customer->total_points,
            'goal' => $nextReward->points_required ?? 0,
            'reward' => $nextReward->name ?? '',
            'promos' => $promos,
            'transactions' => $transactions,
            'store' => $store,
            'pointsThisWeek' => $pointsThisWeek,
            'checkin' => $checkinState,
            'checkinConfig' => $checkinConfig,
            'checkinEnabled' => CheckinController::isEnabled(),
            'news' => $this->buildNews(),
            'adminAccess' => AdminAccess::canEnter($user),
            'iosGuideHtml' => \App\Models\AppSetting::get('general', [])['ios_guide_html'] ?? null,
            'banners' => $this->buildBanners(),
            'stores' => $this->buildStores(),
            'staffEntry' => $this->staffEntry($user),
        ]]);
    }

    /**
     * Nút truy cập khu nội bộ hiển thị ở trang chủ theo vai trò:
     * - admin / quản lý (manager): vào trang Quản trị (/admin)
     * - thu ngân (cashier): vào thẳng màn hình Tích điểm (/pos/points)
     * - khách thường: không có nút (null).
     */
    private function staffEntry(?\App\Models\User $user): ?array
    {
        if (!AdminAccess::canEnter($user)) {
            return null;
        }

        $role = $user->staff->role ?? null;

        if ($user->user_type !== 'admin' && $role === 'cashier') {
            return ['url' => '/pos/points', 'label' => 'Bán hàng'];
        }

        return ['url' => '/admin', 'label' => 'Quản trị'];
    }

    /** Tất cả cửa hàng đang hoạt động, hiển thị dạng danh sách ở trang chủ. */
    private function buildStores()
    {
        return Store::where('status', 'active')->orderBy('id')->get();
    }

    /** Banner đang bật cho trang chủ (mobile trống thì dùng desktop). */
    private function buildBanners(): array
    {
        return \App\Models\Banner::where('status', 'active')
            ->orderBy('sort_order')->orderByDesc('id')
            ->get()
            ->map(fn (\App\Models\Banner $b) => [
                'desktop'  => $b->image_desktop,
                'mobile'   => $b->image_mobile ?: $b->image_desktop,
                'link'     => $b->link_url,
                'title'    => $b->title,
                'subtitle' => $b->subtitle,
                'textPos'  => $b->text_position ?: 'none',
                'textAlign' => $b->text_align ?: 'left',
            ])->all();
    }

    /** Tin tức đang hiển thị cho trang chủ. */
    private function buildNews(): array
    {
        return \App\Models\NewsArticle::where('status', 'active')
            ->orderBy('sort_order')->orderByDesc('id')
            ->limit(12)
            ->get()
            ->map(fn (\App\Models\NewsArticle $n) => [
                'id'          => $n->id,
                'title'       => $n->title,
                'excerpt'     => $n->excerpt ?? '',
                'body'        => $n->body ?? '',
                'media_type'  => $n->media_type,
                'image_url'   => $n->image_url,
                'video_url'   => $n->video_url,
                'youtube_id'  => \App\Models\NewsArticle::youtubeId($n->youtube_url),
                'date'        => $n->published_at?->format('d/m/Y'),
            ])->all();
    }

    private function formatTxDate(Carbon $date): string
    {
        $time = $date->format('H:i');

        if ($date->isToday()) {
            return "Hôm nay · {$time}";
        }

        if ($date->isYesterday()) {
            return "Hôm qua · {$time}";
        }

        return $date->format('d/m') . " · {$time}";
    }

    private function campaignBenefit(Campaign $c): ?string
    {
        $fmt = fn ($n) => number_format((float) $n, 0, ',', '.');

        return match ($c->campaign_type) {
            'double_points' => 'Nhân ×' . ($c->multiplier ?: 2) . ' điểm tích luỹ cho mỗi đơn hàng',
            'bonus_points' => $c->bonus_points
                ? 'Tặng thêm ' . $fmt($c->bonus_points) . ' điểm thưởng'
                : null,
            'discount_promotion' => $c->discount_percent
                ? 'Giảm ' . rtrim(rtrim(number_format((float) $c->discount_percent, 1, '.', ''), '0'), '.') . '%'
                    . ($c->min_purchase ? ' cho đơn từ ' . $fmt($c->min_purchase) . 'đ' : '')
                : null,
            default => null,
        };
    }

    private function campaignTag(string $type): string
    {
        return match ($type) {
            'double_points' => 'Tích điểm x2',
            'bonus_points' => 'Thưởng điểm',
            'discount_promotion' => 'Ưu đãi',
            'free_item' => 'Hot',
            default => 'Khuyến mãi',
        };
    }

    private function campaignIcon(string $type): string
    {
        return match ($type) {
            'double_points' => 'spark',
            'bonus_points' => 'star',
            'discount_promotion' => 'spark',
            'free_item' => 'cup',
            default => 'gift',
        };
    }

    private function campaignBg(string $type): string
    {
        return match ($type) {
            'double_points' => 'linear-gradient(135deg,#6B4FA0,#9B7FD4)',
            'bonus_points' => 'linear-gradient(135deg,#FFB13D,#FF7A3D)',
            'discount_promotion' => 'linear-gradient(135deg,#FF8A5B,#FF6FA5)',
            'free_item' => 'linear-gradient(135deg,#0F623F,#1AA86A)',
            default => 'linear-gradient(135deg,#0F623F,#1AA86A)',
        };
    }
}
