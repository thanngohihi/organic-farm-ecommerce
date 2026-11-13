<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Batch extends Model
{
    protected $fillable = [
        'batch_code', 'product_id', 'initial_quantity', 'current_quantity',
        'harvest_date', 'expiration_date', 'farm_location', 'status'
    ];
}
