<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Complaint extends Model
{
    use HasFactory;

    protected $table = 'complaints';

    protected $fillable = [
        'order_id',
        'customer_id',
        'handled_by_sales_id',
        'reason',
        'evidence_media_urls',
        'resolution_type',
        'refund_amount',
        'compensation_order_id',
        'sales_note',
        'status',
    ];

    protected $casts = [
        'evidence_media_urls' => 'array',
        'refund_amount'       => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by_sales_id');
    }

    public function compensationOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'compensation_order_id');
    }
}
