<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FarmingLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_id',
        'staff_id',
        'activity_date',
        'title',
        'description',
        'media_url',
    ];

    protected $casts = [
        'activity_date' => 'date',
    ];

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }
}
