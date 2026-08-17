<?php

namespace App\Services;

use App\Mail\BulkEmail;
use App\Models\Customer;
use App\Models\EmailBlast;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Gửi email hàng loạt theo lô nhỏ. Dùng chung cho:
 *  - EmailController::sendChunk (frontend điều khiển, gửi ngay)
 *  - Command emails:dispatch (cron gửi theo lịch / gửi nốt phần còn lại)
 */
class EmailBlastSender
{
    /** Gửi tối đa $limit người nhận đang chờ; trả về tiến trình hiện tại. */
    public function sendChunk(EmailBlast $blast, int $limit): array
    {
        $pending = $blast->recipients()
            ->where('status', 'pending')
            ->limit($limit)
            ->get();

        $customerIds = $pending->pluck('customer_id')->filter()->all();
        $customers = Customer::with('user')->whereIn('id', $customerIds)->get()->keyBy('id');

        foreach ($pending as $r) {
            $c = $r->customer_id ? $customers->get($r->customer_id) : null;
            $vars = [
                '{name}'   => $r->name ?: ($c?->user?->name ?? 'bạn'),
                '{ten}'    => $r->name ?: ($c?->user?->name ?? 'bạn'),
                '{phone}'  => $c?->user?->phone ?? '',
                '{sdt}'    => $c?->user?->phone ?? '',
                '{points}' => (string) (int) ($c?->total_points ?? 0),
                '{diem}'   => (string) (int) ($c?->total_points ?? 0),
            ];

            $subject = strtr($blast->subject, $vars);
            $body    = strtr($blast->body ?? '', $vars);

            try {
                Mail::to($r->email)->send(new BulkEmail($subject, $body, (bool) $blast->attach_qr));
                $r->update(['status' => 'sent', 'error' => null, 'sent_at' => now()]);
            } catch (\Throwable $e) {
                Log::warning('BulkEmail failed', ['to' => $r->email, 'error' => $e->getMessage()]);
                $r->update(['status' => 'failed', 'error' => mb_substr($e->getMessage(), 0, 300)]);
            }
        }

        return $this->progress($blast);
    }

    /** Tính lại tiến trình từ bảng recipients (chuẩn khi gửi nhiều đợt). */
    public function progress(EmailBlast $blast): array
    {
        $counts = $blast->recipients()
            ->selectRaw('status, COUNT(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status');

        $sent    = (int) ($counts['sent'] ?? 0);
        $failed  = (int) ($counts['failed'] ?? 0);
        $pending = (int) ($counts['pending'] ?? 0);
        $done    = $pending === 0;
        $status  = !$done ? 'sending' : ($failed > 0 ? 'partial' : 'sent');

        $blast->update(['sent_count' => $sent, 'failed_count' => $failed, 'status' => $status]);

        return [
            'total'   => $blast->total,
            'sent'    => $sent,
            'failed'  => $failed,
            'pending' => $pending,
            'done'    => $done,
            'status'  => $status,
        ];
    }
}
