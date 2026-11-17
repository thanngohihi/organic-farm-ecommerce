<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\InventoryLog;
use Illuminate\Support\Facades\DB;
use Exception;

class InventoryFefoService
{
    /**
     * Thuật toán xuất kho tự động theo lô FEFO (First Expired, First Out).
     */
    public function exportByFefo(int $productId, float $quantityNeeded, int $orderId): array
    {
        return DB::transaction(function () use ($productId, $quantityNeeded, $orderId) {
            $batches = Batch::where('product_id', $productId)
                ->where('current_quantity', '>', 0)
                ->where('expiry_date', '>', now())
                ->orderBy('expiry_date', 'asc')
                ->lockForUpdate()
                ->get();

            $totalAvailable = $batches->sum('current_quantity');
            if ($totalAvailable < $quantityNeeded) {
                throw new Exception("Tổng tồn kho ({$totalAvailable}kg) không đủ đáp ứng đơn hàng ({$quantityNeeded}kg).");
            }

            $deductions = [];
            $remainingNeeded = $quantityNeeded;

            foreach ($batches as $batch) {
                if ($remainingNeeded <= 0) break;

                $deduct = min($batch->current_quantity, $remainingNeeded);
                $batch->current_quantity -= $deduct;
                $batch->save();

                InventoryLog::create([
                    'batch_id' => $batch->id,
                    'order_id' => $orderId,
                    'change_type' => 'EXPORT_FEFO',
                    'quantity' => -$deduct,
                    'note' => "Trừ kho tự động FEFO cho đơn hàng #{$orderId}"
                ]);

                $deductions[] = [
                    'batch_id' => $batch->id,
                    'batch_code' => $batch->batch_code,
                    'deducted_quantity' => $deduct,
                    'expiry_date' => $batch->expiry_date->format('Y-m-d'),
                ];

                $remainingNeeded -= $deduct;
            }

            return $deductions;
        });
    }

    /**
     * Ghi nhận xuất hủy / hao hụt kho.
     */
    public function recordWaste(int $batchId, float $quantityWasted, string $reason, int $staffId): Batch
    {
        return DB::transaction(function () use ($batchId, $quantityWasted, $reason, $staffId) {
            $batch = Batch::lockForUpdate()->findOrFail($batchId);

            if ($batch->current_quantity < $quantityWasted) {
                throw new Exception("Số lượng xuất hủy vượt quá tồn kho hiện tại của lô ({$batch->current_quantity}kg).");
            }

            $batch->current_quantity -= $quantityWasted;
            $batch->save();

            InventoryLog::create([
                'batch_id' => $batch->id,
                'user_id' => $staffId,
                'change_type' => 'WASTE_EXPORT',
                'quantity' => -$quantityWasted,
                'note' => "Xuất hủy hao hụt: {$reason}"
            ]);

            return $batch;
        });
    }
}
