<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Batch extends Model
{
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
}
