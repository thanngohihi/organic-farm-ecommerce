<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WasteRecord extends Model
{
    use HasFactory;

    protected $table = 'waste_records';

    protected $fillable = [
        'batch_id',
        'recorded_by',
        'quantity',
        'reason',
        'evidence_image_url',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class, 'batch_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}