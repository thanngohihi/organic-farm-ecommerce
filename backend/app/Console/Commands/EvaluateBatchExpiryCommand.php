<?php

namespace App\Console\Commands;

use App\Models\Batch;
use Illuminate\Console\Command;

class EvaluateBatchExpiryCommand extends Command
{
    protected $signature = 'batches:evaluate-expiry {--discount=30 : % giảm giá Flash Sale cho lô cận date}';

    protected $description = 'Quét lô cận date (<= 2 ngày) bật Flash Sale và khóa lô quá hạn';

    public function handle(): int
    {
        $today = now()->toDateString();
        $cutoffDate = now()->addDays(2)->toDateString();
        $discountPercent = max(0, min(100, (int) $this->option('discount')));

        // Lô đã quá hạn (expiry_date < hôm nay) và còn tồn kho -> chuyển qua_han, tắt Flash Sale
        $expiredCount = Batch::query()
            ->whereDate('expiry_date', '<', $today)
            ->where('current_quantity', '>', 0)
            ->where('status', '!=', 'qua_han')
            ->update([
                'status'           => 'qua_han',
                'is_flash_sale'    => false,
                'discount_percent' => 0,
            ]);

        // Lô cận date (hôm nay <= expiry_date <= hôm nay + 2 ngày) và còn tồn kho -> bật sap_het_han & is_flash_sale
        $nearExpiryCount = Batch::query()
            ->whereDate('expiry_date', '>=', $today)
            ->whereDate('expiry_date', '<=', $cutoffDate)
            ->where('current_quantity', '>', 0)
            ->whereIn('status', ['con_hang', 'sap_het_han'])
            ->update([
                'status'           => 'sap_het_han',
                'is_flash_sale'    => true,
                'discount_percent' => $discountPercent,
            ]);

        $this->info("Quét xong: {$nearExpiryCount} lô bật Flash Sale, {$expiredCount} lô chuyển quá hạn.");

        return self::SUCCESS;
    }
}