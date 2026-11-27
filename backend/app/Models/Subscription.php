<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use HasFactory;

    protected $table = 'subscriptions';

    protected $fillable = [
        'customer_id',
        'subscription_code',
        'package_name',
        'weight_per_delivery',
        'delivery_days',
        'delivery_address',
        'distance_km',
        'total_price',
        'payment_method',
        'payment_status',
        'momo_trans_id',
        'start_date',
        'end_date',
        'status',
    ];

    protected $casts = [
        'weight_per_delivery' => 'decimal:2',
        'delivery_days'       => 'array',
        'distance_km'         => 'decimal:2',
        'total_price'         => 'decimal:2',
        'start_date'          => 'date',
        'end_date'            => 'date',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(DeliverySchedule::class, 'subscription_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'subscription_id');
    }
}
