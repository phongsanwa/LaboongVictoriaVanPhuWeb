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
        $order = Order::with(['customer.user', 'items.product', 'items.toppings', 'discounts', 'store'])
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

        // Mỗi kênh chạy độc lập: một kênh lỗi (VD email SMTP) không được chặn các kênh còn lại.
        foreach ($recipients as $email) {
            try {
                Mail::to($email)->send(new OrderPlaced($order));
            } catch (\Throwable $e) {
                Log::error('Order email failed', ['order_id' => $this->orderId, 'to' => $email, 'error' => $e->getMessage()]);
            }
        }

        // Gửi thêm qua Telegram (nếu đã bật & cấu hình trong Cài đặt)
        try {
            if (\App\Support\TelegramNotifier::enabled()) {
                \App\Support\TelegramNotifier::send(\App\Support\TelegramNotifier::formatOrder($order));
            }
        } catch (\Throwable $e) {
            Log::error('Order Telegram failed', ['order_id' => $this->orderId, 'error' => $e->getMessage()]);
        }

        // Gửi thêm qua ntfy.sh (thông báo đẩy có chuông to)
        try {
            if (\App\Support\NtfyNotifier::enabled()) {
                $n = \App\Support\NtfyNotifier::formatOrder($order);
                \App\Support\NtfyNotifier::send($n['title'], $n['message'], $n['click']);
            }
        } catch (\Throwable $e) {
            Log::error('Order ntfy failed', ['order_id' => $this->orderId, 'error' => $e->getMessage()]);
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
