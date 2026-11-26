<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FarmingLog extends Model
{
    use HasFactory;

    protected $table = 'farming_logs';

    protected $fillable = [
        'batch_id',
        'farm_staff_id',
        'stage',
        'title',
        'description',
        'media_urls',
        'soil_water_test_url',
        'logged_at',
    ];

    protected $casts = [
        'media_urls' => 'array',
        'logged_at'  => 'datetime',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class, 'batch_id');
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'farm_staff_id');
    }

    public function farmStaff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'farm_staff_id');
    }
}
