<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_id',
        'order_id',
        'user_id',
        'change_type', // IMPORT, EXPORT_FEFO, WASTE_EXPORT
        'quantity',
        'note',
    ];

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }
}
