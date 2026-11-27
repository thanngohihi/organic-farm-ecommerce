<?php

namespace App\Console\Commands;

use App\Services\SubscriptionOrderGeneratorService;
use Illuminate\Console\Command;

class GenerateSubscriptionOrdersCommand extends Command
{
    protected $signature = 'subscriptions:generate-orders {--date= : Ngày quét lịch giao (YYYY-MM-DD), mặc định hôm nay}';

    protected $description = 'Tự động quét gói định kỳ (Thứ Ba & Thứ Sáu) và tạo đơn hàng xuất kho FEFO';

    public function handle(SubscriptionOrderGeneratorService $generatorService): int
    {
        $targetDate = $this->option('date') ?: now()->toDateString();
        $result = $generatorService->processDueSchedules($targetDate);

        $this->info(
            "Đã quét ngày {$result['cutoff_date']}: tạo {$result['created_count']} đơn hàng định kỳ, " .
            "{$result['failed_count']} lịch thiếu hàng, đóng {$result['expired_subscriptions']} gói hết hạn."
        );

        foreach ($result['failed_schedules'] as $failed) {
            $this->warn($failed['message']);
        }

        return self::SUCCESS;
    }
}
