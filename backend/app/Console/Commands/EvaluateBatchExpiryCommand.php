<?php

namespace App\Console\Commands;

use App\Models\Batch;
use Illuminate\Console\Command;

class EvaluateBatchExpiryCommand extends Command
{
    protected $signature = 'batches:evaluate-expiry {--discount=30 : % giảm giá Flash Sale cho lô cận date}';

    protected $description = 'Quét lô cận date (<= 3 ngày) bật Siêu Sale (Flash Sale) và khóa lô quá hạn';

    public function handle(): int
    {
        $discountPercent = max(0, min(90, (int) $this->option('discount')));
        $result = Batch::syncExpiryStatuses($discountPercent, true);

        $this->info(
            "Quét xong: {$result['near_expiry_count']} lô bật Siêu Sale (Flash Sale), {$result['expired_count']} lô chuyển quá hạn."
        );

        return self::SUCCESS;
    }
}