<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerPoint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PointsController extends Controller
{
    /** Maps customer_points.point_type to the ledger UI's earn/redeem/adjust types. */
    private const TYPE_MAP = [
        'purchase' => 'earn',
        'bonus' => 'earn',
        'referral' => 'earn',
        'campaign' => 'earn',
        'redemption' => 'redeem',
        'admin' => 'adjust',
    ];

    public function index()
    {
        $admin = Auth::user();

        $customers = Customer::with('user')->orderBy('id')->get();

        $customersData = $customers->map(fn ($c) => [
            'id' => 'KH' . (1000 + $c->id),
            'dbId' => $c->id,
            'name' => $c->user->name,
            'phone' => $c->user->phone,
            'points' => $c->total_points,
        ])->values();

        $points = CustomerPoint::with(['customer.user', 'transaction.store', 'transaction.staff.user'])
            ->orderByDesc('created_at')
            ->get();

        $ledger = $points->map(function (CustomerPoint $p) {
            $type = self::TYPE_MAP[$p->point_type] ?? 'earn';
            $tx = $p->transaction;

            return [
                'id' => 'GD' . (10000 + $p->id),
                'cust' => [
                    'id' => 'KH' . (1000 + $p->customer_id),
                    'dbId' => $p->customer_id,
                    'name' => $p->customer->user->name,
                ],
                'type' => $type,
                'desc' => $p->description,
                'reason' => $type === 'adjust' ? $p->description : null,
                'note' => null,
                'source' => match ($type) {
                    'redeem' => 'Đổi quà tại quầy',
                    'adjust' => 'Điều chỉnh thủ công',
                    default => $tx->store->name ?? '—',
                },
                'staff' => $type === 'earn' ? $tx?->staff?->user?->name : null,
                'ts' => $p->created_at->toIso8601String(),
                'points' => $p->points,
            ];
        })->values();

        $remaining = $customers->sum('total_points');
        $redeemed = (int) abs(CustomerPoint::where('points', '<', 0)->sum('points'));

        return view('admin.points', [
            'pointsData' => [
                'admin' => [
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'initials' => $this->initials($admin->name),
                ],
                'customers' => $customersData,
                'ledger' => $ledger,
                'stats' => [
                    'issued' => $remaining + $redeemed,
                    'redeemed' => $redeemed,
                    'remaining' => $remaining,
                    'count' => $ledger->count(),
                ],
            ],
        ]);
    }

    public function adjust(Request $request)
    {
        $data = $request->validate([
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'mode' => ['required', 'in:add,sub'],
            'amount' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $customer = Customer::with('user')->findOrFail($data['customer_id']);

        $delta = $data['mode'] === 'add'
            ? $data['amount']
            : -min($data['amount'], $customer->total_points);

        $description = $data['reason'] . (! empty($data['note']) ? ' — ' . $data['note'] : '');

        $point = DB::transaction(function () use ($customer, $delta, $description) {
            $customer->total_points += $delta;
            if ($delta > 0) {
                $customer->lifetime_points += $delta;
            }
            $customer->save();

            return CustomerPoint::create([
                'customer_id' => $customer->id,
                'point_type' => 'admin',
                'points' => $delta,
                'description' => $description,
            ]);
        });

        $verb = $data['mode'] === 'add' ? 'cộng' : 'trừ';

        return response()->json([
            'message' => 'Đã ' . $verb . ' ' . abs($delta) . ' điểm cho ' . $customer->user->name,
            'entry' => [
                'id' => 'GD' . (10000 + $point->id),
                'cust' => [
                    'id' => 'KH' . (1000 + $customer->id),
                    'dbId' => $customer->id,
                    'name' => $customer->user->name,
                ],
                'type' => 'adjust',
                'desc' => $data['mode'] === 'add' ? 'Cộng điểm thủ công' : 'Trừ điểm thủ công',
                'reason' => $description,
                'note' => null,
                'source' => 'Điều chỉnh thủ công',
                'staff' => Auth::user()->name,
                'ts' => $point->created_at->toIso8601String(),
                'points' => $delta,
            ],
            'customer' => [
                'dbId' => $customer->id,
                'points' => $customer->total_points,
            ],
        ]);
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name));
        $last = array_pop($parts);
        $first = $parts[0] ?? '';

        return mb_strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    }
}
