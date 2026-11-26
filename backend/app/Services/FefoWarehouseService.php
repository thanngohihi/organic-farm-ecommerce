<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\WasteRecord;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class FefoWarehouseService
{
    public function __construct(
        private readonly CloudinaryService $cloudinaryService
    ) {}

    /**
     * Xuất kho theo nguyên tắc FEFO (First Expired, First Out).
     * Ưu tiên trừ tồn kho ở các lô còn hạn có expiry_date gần nhất.
     *
     * @throws RuntimeException
     */
    public function exportByFefo(int $productId, float $quantity): array
    {
        if ($quantity <= 0) {
            throw new RuntimeException('Số lượng xuất kho phải lớn hơn 0.');
        }

        return DB::transaction(function () use ($productId, $quantity) {
            $today = now()->toDateString();

            $batches = Batch::query()
                ->where('product_id', $productId)
                ->where('current_quantity', '>', 0)
                ->whereIn('status', ['con_hang', 'sap_het_han'])
                ->whereDate('expiry_date', '>=', $today)
                ->orderBy('expiry_date', 'asc')
                ->orderBy('id', 'asc')
                ->lockForUpdate()
                ->get();

            $totalAvailable = round((float) $batches->sum('current_quantity'), 2);
            if ($totalAvailable < $quantity) {
                throw new RuntimeException(
                    "Không đủ tồn kho khả dụng để xuất FEFO (cần {$quantity}, hiện có {$totalAvailable})."
                );
            }

            $remaining = round($quantity, 2);
            $allocations = [];

            foreach ($batches as $batch) {
                if ($remaining <= 0) {
                    break;
                }

                $available = (float) $batch->current_quantity;
                $deduct = min($remaining, $available);
                $newQuantity = round($available - $deduct, 2);
                $wasFlashSale = (bool) $batch->is_flash_sale;
                $discountPercent = (int) ($batch->discount_percent ?? 0);

                $batch->current_quantity = max(0, $newQuantity);
                if ($batch->current_quantity <= 0) {
                    $batch->current_quantity = 0;
                    $batch->status = 'het_hang';
                    $batch->is_flash_sale = false;
                    $batch->discount_percent = 0;
                }
                $batch->save();

                $remaining = round($remaining - $deduct, 2);

                $allocations[] = [
                    'batch_id'           => $batch->id,
                    'batch_code'         => $batch->batch_code,
                    'expiry_date'        => $batch->expiry_date?->toDateString(),
                    'deducted_quantity'  => $deduct,
                    'remaining_quantity' => (float) $batch->current_quantity,
                    'status'             => $batch->status,
                    'is_flash_sale'      => $wasFlashSale,
                    'discount_percent'   => $discountPercent,
                ];
            }

            return [
                'product_id'         => $productId,
                'requested_quantity' => $quantity,
                'exported_quantity'  => $quantity,
                'allocations'        => $allocations,
            ];
        });
    }

    /**
     * Ghi nhận xuất hủy / hao hụt nông sản cho một lô hàng.
     *
     * @throws RuntimeException
     */
    public function recordWaste(
        int $batchId,
        int $recordedBy,
        float $quantity,
        string $reason,
        ?UploadedFile $evidence = null
    ): array {
        if ($quantity <= 0) {
            throw new RuntimeException('Số lượng xuất hủy phải lớn hơn 0.');
        }

        return DB::transaction(function () use ($batchId, $recordedBy, $quantity, $reason, $evidence) {
            $batch = Batch::query()->lockForUpdate()->find($batchId);

            if (!$batch) {
                throw new RuntimeException('Không tìm thấy lô hàng cần ghi nhận hao hụt.');
            }

            $available = (float) $batch->current_quantity;
            if ($quantity > $available) {
                throw new RuntimeException(
                    "Số lượng xuất hủy ({$quantity}) vượt quá tồn kho hiện tại ({$available})."
                );
            }

            $evidenceUrl = null;
            if ($evidence !== null) {
                if (!empty(config('cloudinary.cloud_url'))) {
                    $uploaded = $this->cloudinaryService->uploadSingleFile($evidence, 'waste_evidence');
                    $evidenceUrl = $uploaded['url'] ?? null;
                } else {
                    $path = Storage::disk('public')->putFile('waste_records', $evidence);
                    $evidenceUrl = asset("storage/{$path}");
                }
            }

            $wasteRecord = WasteRecord::query()->create([
                'batch_id'           => $batch->id,
                'recorded_by'        => $recordedBy,
                'quantity'           => $quantity,
                'reason'             => $reason,
                'evidence_image_url' => $evidenceUrl,
            ]);

            $newQuantity = round($available - $quantity, 2);
            $batch->current_quantity = max(0, $newQuantity);
            $batch->wasted_quantity = round((float) $batch->wasted_quantity + $quantity, 2);

            if ($batch->current_quantity <= 0) {
                $batch->current_quantity = 0;
                $batch->status = 'het_hang';
                $batch->is_flash_sale = false;
                $batch->discount_percent = 0;
            }
            $batch->save();

            return [
                'waste_record' => $wasteRecord,
                'batch'        => $batch->fresh(),
            ];
        });
    }
}
