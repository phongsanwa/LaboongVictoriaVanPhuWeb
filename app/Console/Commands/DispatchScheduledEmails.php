<?php

namespace App\Console\Commands;

use App\Models\EmailBlast;
use App\Services\EmailBlastSender;
use Illuminate\Console\Command;

/**
 * Gửi email đã lên lịch (khi tới giờ) và gửi nốt các chiến dịch còn dở
 * (VD: admin đóng trang giữa chừng). Cho chạy mỗi phút qua cron:
 *   * * * * * cd /path && php artisan schedule:run >> /dev/null 2>&1
 */
class DispatchScheduledEmails extends Command
{
    protected $signature = 'emails:dispatch {--limit=200 : Số email tối đa gửi trong một lần chạy}';

    protected $description = 'Gửi email đã hẹn giờ và tiếp tục các chiến dịch email còn dở';

    private const CHUNK = 20;

    public function handle(EmailBlastSender $sender): int
    {
        // 1) Tới giờ hẹn → chuyển sang trạng thái đang gửi.
        $due = EmailBlast::where('status', 'scheduled')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->update(['status' => 'sending']);
        if ($due) $this->info("Kích hoạt {$due} chiến dịch tới giờ.");

        // 2) Các chiến dịch đang gửi còn người nhận chờ. Với đơn gửi ngay
        //    (không hẹn giờ), chỉ tiếp quản khi đã "nguội" >3 phút để không
        //    tranh gửi trùng với trang admin đang mở.
        $blasts = EmailBlast::where('status', 'sending')
            ->where(function ($q) {
                $q->whereNotNull('scheduled_at')
                  ->orWhere('updated_at', '<=', now()->subMinutes(3));
            })
            ->orderBy('id')
            ->get()
            ->filter(fn ($b) => $b->recipients()->where('status', 'pending')->exists());

        $budget = max(1, (int) $this->option('limit'));

        foreach ($blasts as $blast) {
            while ($budget > 0) {
                $p = $sender->sendChunk($blast, min(self::CHUNK, $budget));
                $budget -= self::CHUNK;
                if ($p['done']) {
                    $this->info("Chiến dịch #{$blast->id}: xong ({$p['sent']} gửi, {$p['failed']} lỗi).");
                    break;
                }
            }
            if ($budget <= 0) {
                $this->warn('Đạt hạn mức mỗi lần chạy — phần còn lại sẽ gửi ở lần sau.');
                break;
            }
        }

        return self::SUCCESS;
    }
}
