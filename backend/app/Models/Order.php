<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    protected $table = 'orders';

    protected $fillable = [
        'customer_id',
        'subscription_id',
        'order_code',
        'delivery_address',
        'distance_km',
        'shipping_type',
        'subtotal',
        'shipping_fee',
        'loyalty_discount',
        'total_amount',
        'payment_method',
        'payment_status',
        'momo_trans_id',
        'order_status',
        'delivery_partner',
        'delivery_tracking_url',
    ];

    protected $casts = [
        'distance_km'      => 'decimal:2',
        'subtotal'         => 'decimal:2',
        'shipping_fee'     => 'decimal:2',
        'loyalty_discount' => 'decimal:2',
        'total_amount'     => 'decimal:2',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class, 'subscription_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }

    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class, 'order_id');
    }
}
