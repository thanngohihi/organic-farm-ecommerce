<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'success' => true,
        'message' => 'Organic Farm Ecommerce Backend is running!'
    ]);
});
