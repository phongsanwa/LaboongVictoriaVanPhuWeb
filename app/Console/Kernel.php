<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        // Award birthday bonuses every day at 08:00
        $schedule->command('birthday:award')
            ->dailyAt('08:00')
            ->withoutOverlapping()
            ->appendOutputTo(storage_path('logs/birthday-award.log'));

        // Gửi email đã hẹn giờ + gửi nốt chiến dịch còn dở (mỗi phút)
        $schedule->command('emails:dispatch')
            ->everyMinute()
            ->withoutOverlapping();
    }

    protected function commands(): void
    {
        $this->load(__DIR__ . '/Commands');
        require base_path('routes/console.php');
    }
}
