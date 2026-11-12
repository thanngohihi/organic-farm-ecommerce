<?php

namespace App\Services;

use App\Models\Batch;
use Exception;

class FefoInventoryService
{
    /**
     * Thuat toan tu dong xuat kho theo nguyen tac FEFO (First Expired, First Out)
     */
    public function allocateInventoryForOrder(int $productId, int $requestedQuantity): array
    {
        $availableBatches = Batch::where('product_id', $productId)
            ->where('current_quantity', '>', 0)
            ->where('expiration_date', '>=', now()->toDateString())
            ->orderBy('expiration_date', 'asc')
            ->get();

        $totalAvailable = $availableBatches->sum('current_quantity');

        if ($totalAvailable < $requestedQuantity) {
            throw new Exception("Kho khong du so luong ton cho san pham ID: {$productId}. Ton kho kha dung: {$totalAvailable}");
        }

        $allocatedItems = [];
        $remainingToFulfill = $requestedQuantity;

        foreach ($availableBatches as $batch) {
            if ($remainingToFulfill <= 0) break;

            $takeQuantity = min($batch->current_quantity, $remainingToFulfill);
            
            $batch->current_quantity -= $takeQuantity;
            $batch->save();

            $allocatedItems[] = [
                'batch_id' => $batch->id,
                'batch_code' => $batch->batch_code,
                'expiration_date' => $batch->expiration_date,
                'quantity' => $takeQuantity
            ];

            $remainingToFulfill -= $takeQuantity;
        }

        return $allocatedItems;
    }
}
