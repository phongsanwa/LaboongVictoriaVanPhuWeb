<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\StoreMonthlyCost;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class OnboardingController extends Controller
{
    public function index()
    {
        $this->ensureFirstSetup();

        return view('onboarding');
    }

    public function store(Request $request)
    {
        $this->ensureFirstSetup();

        $request->validate([
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'min:6'],
            'stores' => ['required', 'array', 'min:1'],
            'stores.*.name' => ['required', 'string'],
            'stores.*.costs' => ['nullable', 'array'],
        ]);

        $firstStoreName = $request->input('stores.0.name');

        $user = DB::transaction(function () use ($request, $firstStoreName) {
            $user = User::create([
                'name' => $firstStoreName . ' chủ',
                'email' => $request->email,
                'phone' => 'setup_' . time(),
                'password' => Hash::make($request->password),
                'user_type' => 'admin',
            ]);

            $costLabels = [
                'rent' => 'Tiền thuê mặt bằng',
                'salary' => 'Lương nhân viên',
                'utility' => 'Điện nước',
                'depreciation' => 'Khấu hao',
            ];
            $currentYearMonth = Carbon::now()->format('Y-m');

            foreach ($request->stores as $storeData) {
                // Onboarding only asks for the name; the rest is editable later in /admin/stores.
                $store = Store::create([
                    'name'           => $storeData['name'],
                    'address'        => '',
                    'city'           => '',
                    'phone'          => '',
                    'opening_time'   => '07:00:00',
                    'closing_time'   => '22:00:00',
                    'operating_days' => [0, 1, 2, 3, 4, 5, 6],
                    'status'         => 'active',
                ]);

                if (!empty($storeData['costs'])) {
                    $costsArray = [];
                    foreach ($costLabels as $key => $label) {
                        $amount = isset($storeData['costs'][$key]) ? (float) $storeData['costs'][$key] : 0;
                        $costsArray[] = ['label' => $label, 'amount' => $amount];
                    }

                    StoreMonthlyCost::create([
                        'store_id' => $store->id,
                        'year_month' => $currentYearMonth,
                        'costs' => $costsArray,
                    ]);
                }
            }

            return $user;
        });

        Auth::login($user);

        return redirect('/admin');
    }

    /** First-run only: once an admin exists, /setup must not mint new admin accounts. */
    private function ensureFirstSetup(): void
    {
        abort_if(User::where('user_type', 'admin')->exists(), 404);
    }
}
