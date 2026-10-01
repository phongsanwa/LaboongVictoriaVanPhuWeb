<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Models\StoreMonthlyCost;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class OnboardingController extends Controller
{
    public function index()
    {
        return view('onboarding');
    }

    public function store(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'min:6'],
            'stores' => ['required', 'array', 'min:1'],
            'stores.*.name' => ['required', 'string'],
            'stores.*.costs' => ['nullable', 'array'],
        ]);

        $firstStoreName = $request->input('stores.0.name');

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
            $store = Store::create([
                'name' => $storeData['name'],
                'is_active' => true,
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

        Auth::login($user);

        return redirect('/admin');
    }
}
