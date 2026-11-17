<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\MediaUploadController;
use App\Http\Controllers\Api\V1\ShippingController;
use App\Http\Controllers\Api\V1\OrderController;

/*
|--------------------------------------------------------------------------
| API Routes - Version 1 (Organic Farm E-Commerce)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // =========================================================================
    // 1. PUBLIC ROUTES (Dành cho Guest, Đăng nhập & Tính phí Ship)
    // =========================================================================
    Route::prefix('auth')->group(function () {
        Route::get('/guest-session', [AuthController::class, 'guestSession']); // Role 1: Guest
        Route::post('/register', [AuthController::class, 'register']);         // Đăng ký Customer
        Route::post('/login', [AuthController::class, 'login']);               // Đăng nhập chung
    });

    // API Public: Tính phí ship động theo km (Google Maps API)
    Route::post('/shipping/calculate-km', [ShippingController::class, 'calculateKm']);


    // =========================================================================
    // 2. PROTECTED ROUTES (Yêu cầu Sanctum Bearer Token & Phân quyền Role)
    // =========================================================================
    Route::middleware('auth:sanctum')->group(function () {

        // --- Thông tin tài khoản & Đăng xuất ---
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // --- Upload Media lên Cloudinary ---
        Route::post('/media/upload', [MediaUploadController::class, 'upload'])
            ->middleware('role:customer,farm_staff,sales,admin');


        // --- NHÓM ROUTE DÀNH RIÊNG CHO CUSTOMER (Role 2 - Người 3 phụ trách) ---
        Route::prefix('customer')->middleware('role:customer')->group(function () {
            // API 2 (Tuần 2): Đặt đơn hàng mua lẻ
            Route::post('/orders/checkout-single', [OrderController::class, 'checkoutSingle']);
        });


        // --- NHÓM ROUTE DÀNH RIÊNG CHO FARM STAFF (Role 3) & ADMIN (Role 5) ---
        Route::prefix('farm')->middleware('role:farm_staff,admin')->group(function () {
            // Người 2 sẽ viết tiếp API Quản lý Lô (Batches), Nhật ký canh tác (Farming Logs), Sinh mã QR tại đây
        });


        // --- NHÓM ROUTE DÀNH RIÊNG CHO SALES (Role 4) & ADMIN (Role 5) ---
        Route::prefix('sales')->middleware('role:sales,admin')->group(function () {
            // Người 2 & Người 3 sẽ viết tiếp API Duyệt đơn, Điều phối ship, Xử lý khiếu nại tại đây
        });


        // --- NHÓM ROUTE DÀNH RIÊNG CHO ADMIN (Role 5 - Toàn quyền) ---
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::post('/staff-accounts', [AuthController::class, 'createStaffAccount']);
        });

    });
});