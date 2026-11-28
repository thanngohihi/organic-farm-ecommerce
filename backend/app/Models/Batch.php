<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Batch extends Model
{
    public const FLASH_SALE_WINDOW_DAYS = 3;
    public const DEFAULT_FLASH_SALE_DISCOUNT = 30;

    protected $table = 'batches';

    protected $fillable = [
        'batch_code',
        'product_id',
        'farm_staff_id',
        'harvest_date',
        'expiry_date',
        'initial_quantity',
        'current_quantity',
        'wasted_quantity',
        'is_flash_sale',
        'discount_percent',
        'qr_code_url',
        'status',
    ];

    protected $casts = [
        'harvest_date' => 'date',
        'expiry_date' => 'date',
        'initial_quantity' => 'decimal:2',
        'current_quantity' => 'decimal:2',
        'wasted_quantity' => 'decimal:2',
        'is_flash_sale' => 'boolean',
        'discount_percent' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function farmStaff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'farm_staff_id');
    }

    public function farmingLogs(): HasMany
    {
        return $this->hasMany(FarmingLog::class, 'batch_id');
    }

    /**
     * Xác định trạng thái ban đầu khi nhập lô hàng:
     * - Còn 0..3 ngày trước HSD: tự động bật Siêu Sale (giảm giá).
     * - Còn > 3 ngày trước HSD: bán với giá gốc.
     */
    public static function resolveInitialStateForExpiry(
        string $expiryDate,
        int $discountPercent = self::DEFAULT_FLASH_SALE_DISCOUNT
    ): array {
        $cutoffDate = now()->addDays(self::FLASH_SALE_WINDOW_DAYS)->toDateString();
        $isNearExpiry = $expiryDate <= $cutoffDate;

        return [
            'status'           => $isNearExpiry ? 'sap_het_han' : 'con_hang',
            'is_flash_sale'    => $isNearExpiry,
            'discount_percent' => $isNearExpiry ? max(0, min(90, $discountPercent)) : 0,
        ];
    }

    /**
     * Đồng bộ trạng thái lô hàng theo quy tắc HSD FEFO 3 ngày:
     * - Quá HSD (< hôm nay): khóa ngừng bán (qua_han), tắt Flash Sale.
     * - Trong vòng 3 ngày trước HSD (hôm nay .. hôm nay + 3 ngày): bật Siêu Sale (sap_het_han).
     * - Còn > 3 ngày trước HSD: giữ nguyên con_hang (bán giá gốc).
     */
    public static function syncExpiryStatuses(
        int $discountPercent = self::DEFAULT_FLASH_SALE_DISCOUNT,
        bool $overrideExistingFlashSale = false
    ): array {
        $today = now()->toDateString();
        $cutoffDate = now()->addDays(self::FLASH_SALE_WINDOW_DAYS)->toDateString();
        $safeDiscount = max(0, min(90, $discountPercent));

        $expiredCount = self::query()
            ->whereDate('expiry_date', '<', $today)
            ->where('current_quantity', '>', 0)
            ->where('status', '!=', 'qua_han')
            ->update([
                'status'           => 'qua_han',
                'is_flash_sale'    => false,
                'discount_percent' => 0,
            ]);

        $nearQuery = self::query()
            ->whereDate('expiry_date', '>=', $today)
            ->whereDate('expiry_date', '<=', $cutoffDate)
            ->where('current_quantity', '>', 0);

        if ($overrideExistingFlashSale) {
            $nearQuery->whereIn('status', ['con_hang', 'sap_het_han']);
        } else {
            $nearQuery->where('status', 'con_hang');
        }

        $nearExpiryCount = $nearQuery->update([
            'status'           => 'sap_het_han',
            'is_flash_sale'    => true,
            'discount_percent' => $safeDiscount,
        ]);

        return [
            'expired_count'     => $expiredCount,
            'near_expiry_count' => $nearExpiryCount,
        ];
    }
}
