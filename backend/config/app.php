
<?php

use Illuminate\Support\Facades\Facade;
use Illuminate\Support\ServiceProvider;

return [

    'name' => env('APP_NAME', 'Organic Farm Ecommerce'),

    'env' => env('APP_ENV', 'production'),

    'debug' => (bool) env('APP_DEBUG', true),

    'url' => env('APP_URL', 'http://localhost:8000'),

    'asset_url' => env('ASSET_URL'),

    'timezone' => 'Asia/Ho_Chi_Minh',

    'locale' => 'vi',

    'fallback_locale' => 'en',

    'faker_locale' => 'vi_VN',

    'key' => env('APP_KEY'),

    'cipher' => 'AES-256-CBC',

    'previous_keys' => [],

    'maintenance' => [
        'driver' => 'file',
    ],

   'providers' => ServiceProvider::defaultProviders()->merge([
        App\Providers\AppServiceProvider::class,
    ])->toArray(),

    'aliases' => Facade::defaultAliases()->merge([

    ])->toArray(),

];
