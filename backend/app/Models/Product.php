<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use RuntimeException;

class Product extends Model
{
    public const DECIMAL_UNITS = ['kg', 'gram'];

    protected $table = 'products';

    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'sku',
        'unit',
        'base_price',
        'certification',
        'certification_doc_url',
        'thumbnail_url',
        'description',
        'is_active',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(Batch::class, 'product_id');
    }

    public static function allowsDecimalQuantity(?string $unit): bool
    {
        return in_array(mb_strtolower(trim((string) $unit)), self::DECIMAL_UNITS, true);
    }

    /**
     * Kiểm tra và chuẩn hóa số lượng theo đơn vị tính của sản phẩm.
     * Chỉ đơn vị khối lượng (kg, gram) cho phép số thập phân; đơn vị đếm (nải, bó, hộp...) bắt buộc số nguyên.
     */
    public static function validateQuantityForUnit(
        float $quantity,
        ?string $unit,
        string $fieldLabel = 'Số lượng'
    ): float {
        $normalizedUnit = trim((string) $unit) ?: 'kg';

        if (!is_finite($quantity) || $quantity <= 0) {
            throw new RuntimeException("{$fieldLabel} phải lớn hơn 0.");
        }

        if (!self::allowsDecimalQuantity($normalizedUnit)) {
            if (abs($quantity - round($quantity)) > 0.0001) {
                throw new RuntimeException(
                    "{$fieldLabel} theo đơn vị \"{$normalizedUnit}\" phải là số nguyên (không được nhập số thực)."
                );
            }

            $intQty = (int) round($quantity);
            if ($intQty < 1) {
                throw new RuntimeException(
                    "{$fieldLabel} theo đơn vị \"{$normalizedUnit}\" phải từ 1 trở lên."
                );
            }

            return (float) $intQty;
        }

        return round($quantity, 2);
    }
}
