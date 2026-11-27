<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AlertsAndStatsController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BatchController;
use App\Http\Controllers\Api\V1\CustomerAccountController;
use App\Http\Controllers\Api\V1\FarmingLogController;
use App\Http\Controllers\Api\V1\MediaUploadController;
use App\Http\Controllers\Api\V1\MoMoController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\SalesController;
use App\Http\Controllers\Api\V1\ShippingController;
use App\Http\Controllers\Api\V1\SubscriptionController;

/*
|--------------------------------------------------------------------------
| API Routes - Version 1 (Organic Farm E-Commerce)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // =========================================================================
    // 0. WEBHOOK & MOMO DEMO ROUTES (Không dùng auth Bearer)
    // =========================================================================
    Route::post('/payments/momo/ipn-callback', [MoMoController::class, 'ipnCallback']);
    Route::get('/momo-mock-checkout', [MoMoController::class, 'mockCheckoutPage']);
    Route::post('/momo-mock-checkout/confirm', [MoMoController::class, 'confirmMockCheckout']);

    // =========================================================================
    // 1. PUBLIC ROUTES (Dành cho Guest, Đăng nhập, Truy xuất QR & Tính phí Ship)
    // =========================================================================
    Route::prefix('auth')->group(function () {
        Route::get('/guest-session', [AuthController::class, 'guestSession']); // Role 1: Guest
        Route::post('/register', [AuthController::class, 'register']);         // Đăng ký Customer
        Route::post('/login', [AuthController::class, 'login']);               // Đăng nhập chung
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']); // Quên mật khẩu nhanh (Customer/Staff/Sales)
    });

    // API Public: Danh mục, Danh sách sản phẩm & Truy xuất nguồn gốc QR
    Route::get('/categories', [ProductController::class, 'categories']);
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/batches/qr/{id}', [BatchController::class, 'showByQr']);
    Route::get('/batches/{batchId}/farming-logs', [FarmingLogController::class, 'indexByBatch']);

    // API Public: Vị trí doanh nghiệp & Tính phí ship động theo km (Google Maps API / Haversine)
    Route::get('/shipping/farm-location', [ShippingController::class, 'farmLocation']);
    Route::post('/shipping/calculate-km', [ShippingController::class, 'calculateKm']);


    // =========================================================================
    // 2. PROTECTED ROUTES (Yêu cầu Sanctum Bearer Token & Phân quyền Role)
    // =========================================================================
    Route::middleware('auth:sanctum')->group(function () {

        // --- Thông tin tài khoản, Hồ sơ cá nhân & Đăng xuất ---
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/profile', [ProfileController::class, 'show']);
        Route::put('/auth/profile', [ProfileController::class, 'update']);
        Route::post('/auth/profile/avatar', [ProfileController::class, 'uploadAvatar'])
            ->middleware('role:customer');
        Route::put('/auth/change-password', [ProfileController::class, 'changePassword']);

        // --- Upload Media ---
        Route::post('/media/upload', [MediaUploadController::class, 'upload'])
            ->middleware('role:customer,farm_staff,sales,admin');

        // --- Cảnh báo lô cận hạn / Flash Sale (Người 2 - Tuần 3) ---
        Route::get('/alerts/near-expiry', [AlertsAndStatsController::class, 'nearExpiryAlerts'])
            ->middleware('role:farm_staff,sales,admin');

        // --- Gửi khiếu nại & Đăng ký gói định kỳ (khớp trực tiếp URL Frontend) ---
        Route::post('/complaints', [CustomerAccountController::class, 'storeComplaint'])
            ->middleware('role:customer');
        Route::get('/subscriptions', [SubscriptionController::class, 'index'])
            ->middleware('role:customer');
        Route::post('/subscriptions', [SubscriptionController::class, 'store'])
            ->middleware('role:customer');
        Route::patch('/subscriptions/{id}/status', [SubscriptionController::class, 'updateStatus'])
            ->middleware('role:customer');
        Route::post('/subscriptions/{id}/momo-payment', [SubscriptionController::class, 'retryMoMoPayment'])
            ->middleware('role:customer');


        // --- NHÓM ROUTE DÀNH RIÊNG CHO CUSTOMER (Role 2 - Người 3 & Người 1) ---
        Route::prefix('customer')->middleware('role:customer')->group(function () {
            // Đặt đơn hàng mua lẻ (FEFO) & theo dõi thanh toán / nhận hàng
            Route::post('/orders/checkout-single', [OrderController::class, 'checkoutSingle']);
            Route::get('/orders/status/{orderCode}', [OrderController::class, 'orderStatusByCode']);
            Route::post('/orders/{orderCode}/cancel-pending-momo', [OrderController::class, 'cancelPendingMoMo']);
            Route::post('/orders/{orderCode}/confirm-received', [OrderController::class, 'confirmReceived']);

            // Tạo link thanh toán MoMo
            Route::post('/payments/momo/create-payment', [MoMoController::class, 'createPayment']);

            // Gói định kỳ Subscription
            Route::get('/subscriptions', [SubscriptionController::class, 'index']);
            Route::post('/subscriptions', [SubscriptionController::class, 'store']);
            Route::patch('/subscriptions/{id}/status', [SubscriptionController::class, 'updateStatus']);
            Route::post('/subscriptions/{id}/momo-payment', [SubscriptionController::class, 'retryMoMoPayment']);

            // Hồ sơ giao dịch, khiếu nại & điểm Loyalty
            Route::get('/transactions', [CustomerAccountController::class, 'transactions']);
            Route::get('/complaints', [CustomerAccountController::class, 'myComplaints']);
            Route::post('/complaints', [CustomerAccountController::class, 'storeComplaint']);
            Route::get('/loyalty', [CustomerAccountController::class, 'loyalty']);
            Route::post('/loyalty/redeem', [CustomerAccountController::class, 'redeemLoyalty']);
        });


        // --- NHÓM ROUTE DÀNH RIÊNG CHO FARM STAFF (Role 3) & ADMIN (Role 5) ---
        Route::prefix('farm')->middleware('role:farm_staff,admin')->group(function () {
            Route::get('/categories', [ProductController::class, 'categories']);
            Route::post('/categories', [ProductController::class, 'storeCategory']);
            Route::delete('/categories/{id}', [ProductController::class, 'destroyCategory']);
            Route::post('/products', [ProductController::class, 'store']);

            Route::get('/batches', [BatchController::class, 'index']);
            Route::post('/batches', [BatchController::class, 'store']);
            Route::post('/batches/fefo-export', [BatchController::class, 'fefoExport']);
            Route::post('/batches/waste-record', [BatchController::class, 'recordWaste']);

            Route::get('/farming-logs', [FarmingLogController::class, 'index']);
            Route::post('/farming-logs', [FarmingLogController::class, 'store']);
            Route::delete('/farming-logs/{id}', [FarmingLogController::class, 'destroy']);
        });


        // --- NHÓM ROUTE DÀNH RIÊNG CHO SALES (Role 4) & ADMIN (Role 5) ---
        Route::prefix('sales')->middleware('role:sales,admin')->group(function () {
            Route::get('/orders', [SalesController::class, 'orders']);
            Route::put('/orders/{id}/status', [SalesController::class, 'updateOrderStatus']);
            Route::get('/complaints', [SalesController::class, 'complaints']);
            Route::put('/complaints/{id}/approve', [SalesController::class, 'approveComplaint']);
            Route::post('/batches/{id}/flash-sale', [SalesController::class, 'configureFlashSale']);
            Route::post('/subscriptions/generate-orders', [SalesController::class, 'generateSubscriptionOrders']);
        });


        // --- NHÓM ROUTE DÀNH RIÊNG CHO ADMIN (Role 5 - Toàn quyền) ---
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::get('/staff-accounts', [AuthController::class, 'staffAccounts']);
            Route::post('/staff-accounts', [AuthController::class, 'createStaffAccount']);
            Route::delete('/staff-accounts/{id}', [AuthController::class, 'destroyStaffAccount']);
            Route::get('/customers', [AuthController::class, 'customerAccounts']);
            Route::patch('/accounts/{id}/toggle-active', [AuthController::class, 'toggleAccountActive']);
            Route::delete('/accounts/{id}', [AuthController::class, 'destroyAccount']);
            Route::get('/dashboard-stats', [AlertsAndStatsController::class, 'dashboardStats']);
        });

    });
});
