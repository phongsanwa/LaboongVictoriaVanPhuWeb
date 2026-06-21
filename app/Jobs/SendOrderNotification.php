<?php

namespace App\Jobs;

use App\Mail\OrderPlaced;
use App\Models\Order;
use App\Models\Staff;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendOrderNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(private int $orderId) {}

    public function handle(): void
    {
        $order = Order::with(['customer.user', 'items.product', 'items.toppings'])
            ->findOrFail($this->orderId);

        $adminEmails = User::where('user_type', 'admin')
            ->whereNotNull('email')
            ->where('email', '!=', '')
            ->pluck('email');

        $staffEmails = Staff::with('user')
            ->whereIn('role', ['manager', 'cashier'])
            ->where('status', 'active')
            ->get()
            ->map(fn ($s) => $s->user?->email)
            ->filter(fn ($e) => $e && $e !== '');

        $recipients = $adminEmails->merge($staffEmails)->unique()->values();

        foreach ($recipients as $email) {
            Mail::to($email)->send(new OrderPlaced($order));
        }
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SendOrderNotification job failed', [
            'order_id' => $this->orderId,
            'error'    => $e->getMessage(),
        ]);
    }
}
