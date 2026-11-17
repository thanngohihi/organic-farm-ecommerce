<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\MediaUploadController;
use App\Http\Controllers\Api\FarmingLogController;
use App\Http\Controllers\Api\BatchController;

Route::prefix('v1')->group(function () {

    //1. PUBLIC ROUTES (Dành cho Guest & Mở phiên đăng nhập)

    Route::prefix('auth')->group(function () {  
        Route::get('/guest-session', [AuthController::class, 'guestSession']); // Role 1: Guest
        Route::post('/register', [AuthController::class, 'register']);         // Đăng ký Customer
        Route::post('/login', [AuthController::class, 'login']);               // Đăng nhập chung
    });

    // API QR Code có thể để Public để khách hàng quét xem trực tiếp hoặc đưa vào Protected tùy ý
    Route::get('/batches/qr/{id}', [BatchController::class, 'generateQr']);

    //2. PROTECTED ROUTES (Yêu cầu Sanctum Bearer Token)
    Route::middleware('auth:sanctum')->group(function () {

        // Thông tin tài khoản & Đăng xuất
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Upload Media lên Cloudinary (Customer được upload ảnh khiếu nại; Staff/Sales/Admin upload nhật ký/sản phẩm)
        Route::post('/media/upload', [MediaUploadController::class, 'upload'])
            ->middleware('role:customer,farm_staff,sales,admin');

        // --- NHÓM ROUTE DÀNH RIÊNG CHO CUSTOMER (Role 2) ---
        Route::prefix('customer')->middleware('role:customer')->group(function () {
            // Người 3 sẽ viết tiếp API Đặt hàng lẻ, Gói định kỳ Subscription, Khiếu nại tại đây
        });

        // --- NHÓM ROUTE DÀNH RIÊNG CHO FARM STAFF (Role 3) & ADMIN (Role 5) ---
        Route::prefix('farm')->middleware('role:farm_staff,admin')->group(function () {
            // Người 2 sẽ viết tiếp API Quản lý Lô (Batches), Nhật ký canh tác (Farming Logs), Sinh mã QR tại đây
            // Đảm bảo Sales không sửa được Nhật ký canh tác, và Farm Staff không xem được Doanh thu
            Route::post('/farming-logs', [FarmingLogController::class, 'store']);       // Thêm nhật ký canh tác
            Route::post('/batches/waste-record', [BatchController::class, 'recordWaste']); // Ghi nhận xuất hủy/hao hụt
            Route::post('/batches/fefo-export', [BatchController::class, 'fefoExport']);   // Thuật toán trừ kho FEFO khi chốt đơn  
        });

        // --- NHÓM ROUTE DÀNH RIÊNG CHO SALES (Role 4) & ADMIN (Role 5) ---
        Route::prefix('sales')->middleware('role:sales,admin')->group(function () {
            // Người 2 & Người 3 sẽ viết tiếp API Duyệt đơn, Điều phối ship, Xử lý khiếu nại, Flash Sale tại đây
        });

        // --- NHÓM ROUTE DÀNH RIÊNG CHO ADMIN (Role 5 - Toàn quyền) ---
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            Route::post('/staff-accounts', [AuthController::class, 'createStaffAccount']);
            // Người 2 sẽ viết tiếp API Dashboard Thống kê doanh thu & tỷ lệ hao hụt tại đây
        });
    });
});