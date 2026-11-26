<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\WasteRecord;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class FefoWarehouseService
{
    public function __construct(private readonly MediaUploadService $mediaUploadService) {}

    public function exportByFefo(int $productId, float $quantityNeeded): array
    {
        if ($quantityNeeded <= 0) {
            throw new RuntimeException('Số lượng xuất kho phải lớn hơn 0.');
        }

        return DB::transaction(function () use ($productId, $quantityNeeded) {
            $today = now()->toDateString();

            $batches = Batch::query()
                ->where('product_id', $productId)
                ->whereIn('status', ['con_hang', 'sap_het_han'])
                ->where('current_quantity', '>', 0)
                ->whereDate('expiry_date', '>=', $today)
                ->orderBy('expiry_date', 'asc')
                ->orderBy('id', 'asc')
                ->lockForUpdate()
                ->get();

            $totalAvailable = (float) $batches->sum('current_quantity');
            if ($totalAvailable < $quantityNeeded) {
                throw new RuntimeException(
                    "Không đủ tồn kho FEFO cho sản phẩm #{$productId}. Cần {$quantityNeeded}, hiện có {$totalAvailable}."
                );
            }

            $remaining = $quantityNeeded;
            $allocations = [];

            foreach ($batches as $batch) {
                if ($remaining <= 0) {
                    break;
                }

                $currentQty = (float) $batch->current_quantity;
                $deductQty = round(min($currentQty, $remaining), 2);
                $newQty = round($currentQty - $deductQty, 2);

                $batch->update([
                    'current_quantity' => max(0, $newQty),
                    'status'           => $newQty <= 0 ? 'het_hang' : $batch->status,
                    'is_flash_sale'    => $newQty <= 0 ? false : $batch->is_flash_sale,
                ]);

                $allocations[] = [
                    'batch_id'           => $batch->id,
                    'batch_code'         => $batch->batch_code,
                    'expiry_date'        => $batch->expiry_date->toDateString(),
                    'quantity_deducted'  => $deductQty,
                    'remaining_in_batch' => max(0, $newQty),
                    'status'             => $batch->fresh()->status,
                ];

                $remaining = round($remaining - $deductQty, 2);
            }

            return [
                'product_id'      => $productId,
                'quantity_needed' => $quantityNeeded,
                'allocations'     => $allocations,
            ];
        });
    }

    public function recordWaste(int $batchId, int $userId, float $quantity, string $reason, $evidenceFile = null): array
    {
        return DB::transaction(function () use ($batchId, $userId, $quantity, $reason, $evidenceFile) {
            /** @var Batch $batch */
            $batch = Batch::query()->lockForUpdate()->findOrFail($batchId);

            if ($quantity > (float) $batch->current_quantity) {
                throw new RuntimeException(
                    "Số lượng xuất hủy ({$quantity}) vượt quá tồn kho hiện tại ({$batch->current_quantity}) của lô {$batch->batch_code}."
                );
            }

            $evidenceUrl = $evidenceFile
                ? $this->mediaUploadService->uploadMedia($evidenceFile, 'organic_farm/waste')
                : null;

            $newCurrent = round((float) $batch->current_quantity - $quantity, 2);
            $newWasted = round((float) $batch->wasted_quantity + $quantity, 2);

            $batch->update([
                'current_quantity' => $newCurrent,
                'wasted_quantity'  => $newWasted,
                'status'           => $newCurrent <= 0 ? 'het_hang' : $batch->status,
                'is_flash_sale'    => $newCurrent <= 0 ? false : $batch->is_flash_sale,
            ]);

            $wasteRecord = WasteRecord::query()->create([
                'batch_id'           => $batch->id,
                'recorded_by'        => $userId,
                'quantity'           => $quantity,
                'reason'             => $reason,
                'evidence_image_url' => $evidenceUrl,
            ]);

            return [
                'waste_record' => $wasteRecord,
                'batch'        => $batch->fresh(),
            ];
        });
    }
}