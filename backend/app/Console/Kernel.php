<?php

namespace App\Console;

use App\Console\Commands\EvaluateBatchExpiryCommand;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected $commands = [
        EvaluateBatchExpiryCommand::class,
    ];

    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Quét lô cận date (<= 2 ngày) & khóa lô quá hạn lúc 00:00 mỗi ngày
        $schedule->command('batches:evaluate-expiry --discount=30')
            ->dailyAt('00:00')
            ->withoutOverlapping();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        if (file_exists(base_path('routes/console.php'))) {
            require base_path('routes/console.php');
        }
    }
}