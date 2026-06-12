<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\Customer;
use App\Models\CustomerPoint;
use App\Models\CustomerTier;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PosController extends Controller
{
    /** đồng required to earn 1 point */
    private const PER_POINT = 10000;

    /** Avatar gradients cycled by customer id. */
    private const AVATARS = [
        'linear-gradient(140deg,#0F623F,#1AA86A)',
        'linear-gradient(140deg,#FF8A5B,#FF6FA5)',
        'linear-gradient(140deg,#1E8FA8,#4FC3D9)',
        'linear-gradient(140deg,#C99A2E,#E0B84A)',
        'linear-gradient(140deg,#6B4FA0,#9B6FD0)',
    ];

    public function index()
    {
        $staff = Auth::user()->staff()->with(['user', 'store'])->first();

        return view('pos.points', [
            'posData' => [
                'staff' => [
                    'name' => $staff->user->name,
                    'role' => $staff->role === 'manager' ? 'Quản lý' : 'Thu ngân',
                    'store' => $staff->store->name,
                ],
                'perPoint' => self::PER_POINT,
            ],
        ]);
    }

    /** Look up a customer by member code or phone number, without charging anything yet. */
    public function lookup(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string']]);

        $customer = $this->findCustomer($request->string('code')->trim()->toString());

        if (!$customer) {
            return response()->json(['message' => 'Không tìm thấy khách hàng với mã này'], 404);
        }

        return response()->json(['customer' => $this->present($customer)]);
    }

    /** Charge a bill amount to a customer and record the earned points. */
    public function charge(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
            'amount' => ['required', 'integer', 'min:' . self::PER_POINT, 'max:99999999'],
        ]);

        $customer = $this->findCustomer(trim($data['code']));

        if (!$customer) {
            return response()->json(['message' => 'Không tìm thấy khách hàng với mã này'], 404);
        }

        $staff = Auth::user()->staff;
        $basePoints = intdiv($data['amount'], self::PER_POINT);
        $multiplier = $this->multiplierFor($customer);
        $earned = (int) floor($basePoints * $multiplier);
        $pointsBefore = $customer->total_points;

        DB::transaction(function () use ($customer, $staff, $data, $earned, $multiplier) {
            $code = 'TXN' . now()->format('Ymd') . str_pad((string) (Transaction::whereDate('created_at', now())->count() + 1), 4, '0', STR_PAD_LEFT);

            $transaction = Transaction::create([
                'transaction_code' => $code,
                'customer_id' => $customer->id,
                'store_id' => $staff->store_id,
                'staff_id' => $staff->id,
                'total_amount' => $data['amount'],
                'discount_amount' => 0,
                'points_earned' => $earned,
                'point_multiplier' => $multiplier,
                'payment_method' => 'cash',
                'status' => 'completed',
            ]);

            CustomerPoint::create([
                'customer_id' => $customer->id,
                'transaction_id' => $transaction->id,
                'point_type' => 'purchase',
                'points' => $earned,
                'description' => 'Tích điểm mua hàng tại ' . $staff->store->name,
                'expires_at' => now()->addYear(),
            ]);

            $customer->total_points += $earned;
            $customer->lifetime_points += $earned;
            $customer->total_spent += $data['amount'];
            $customer->last_purchase_at = now();

            $nextTier = CustomerTier::where('min_points', '<=', $customer->lifetime_points)
                ->orderByDesc('min_points')
                ->first();

            if ($nextTier && $nextTier->id !== $customer->tier_id) {
                $customer->tier_id = $nextTier->id;
            }

            $customer->save();
        });

        $customer->refresh()->load('tier');

        return response()->json([
            'customer' => $this->present($customer),
            'earned' => $earned,
            'multiplier' => $multiplier,
            'pointsBefore' => $pointsBefore,
        ]);
    }

    /** Resolves a customer by referral code, "LBVP-XXXXX" id, or phone number. */
    private function findCustomer(string $code): ?Customer
    {
        if ($code === '') {
            return null;
        }

        $customer = Customer::with(['user', 'tier'])->where('referral_code', $code)->first();

        if ($customer) {
            return $customer;
        }

        if (preg_match('/^LBVP-(\d+)$/i', $code, $m)) {
            return Customer::with(['user', 'tier'])->find((int) $m[1]);
        }

        $user = User::where('phone', $code)->first();

        return $user ? Customer::with(['user', 'tier'])->where('user_id', $user->id)->first() : null;
    }

    /** Best applicable point multiplier: the customer's tier rate, or a running x2 campaign for them, whichever is higher. */
    private function multiplierFor(Customer $customer): float
    {
        $multiplier = (float) ($customer->tier->point_multiplier ?? 1.00);

        $today = now()->toDateString();

        $campaign = Campaign::where('campaign_type', 'double_points')
            ->where('status', 'active')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->where(function ($q) use ($customer) {
                $q->where('target_audience', 'all_customers')
                    ->orWhere(function ($q2) use ($customer) {
                        $q2->where('target_audience', 'specific_tier')->where('tier_id', $customer->tier_id);
                    });
            })
            ->orderByDesc('multiplier')
            ->first();

        if ($campaign && $campaign->multiplier) {
            $multiplier = max($multiplier, (float) $campaign->multiplier);
        }

        return $multiplier;
    }

    private function present(Customer $customer): array
    {
        return [
            'name' => $customer->user->name,
            'id' => $customer->referral_code ?? ('LBVP-' . str_pad((string) $customer->id, 5, '0', STR_PAD_LEFT)),
            'tier' => $customer->tier->name ?? '',
            'points' => $customer->total_points,
            'av' => self::AVATARS[$customer->id % count(self::AVATARS)],
        ];
    }
}
