
<?php

use Illuminate\Support\Facades\Route;

Route::get('/test', function () {
    return response()->json([
        'success' => true,
        'message' => 'API Organic Farm Ecommerce is working!'
    ]);
});
