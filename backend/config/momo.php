<?php

/**
 * Cấu hình tích hợp Cổng thanh toán MoMo Sandbox
 * Tài liệu: https://developers.momo.vn/v3/docs/payment/api/wallet
 *
 * Cách lấy thông tin Sandbox:
 * 1. Đăng ký tài khoản Developer tại: https://developers.momo.vn
 * 2. Vào Dashboard → Tạo ứng dụng mới (Môi trường: Sandbox)
 * 3. Copy Partner Code, Access Key, Secret Key điền vào file .env
 *
 * Lưu ý quan trọng:
 * - Không bao giờ commit giá trị Key thật vào file này.
 * - Toàn bộ giá trị nhạy cảm đều đọc qua env() từ file .env
 */

return [

    // ----- THÔNG TIN XÁC THỰC SANDBOX (Lấy từ MoMo Developer Dashboard) -----
    'partner_code' => env('MOMO_PARTNER_CODE', ''),
    'access_key'   => env('MOMO_ACCESS_KEY', ''),
    'secret_key'   => env('MOMO_SECRET_KEY', ''),

    // ----- ENDPOINT API MOMO (Dùng URL Sandbox khi đang phát triển) -----
    // Sandbox : https://test-payment.momo.vn/v2/gateway/api/create
    // Production: https://payment.momo.vn/v2/gateway/api/create
    'endpoint' => env('MOMO_ENDPOINT', 'https://test-payment.momo.vn/v2/gateway/api/create'),

    // ----- URL CALLBACK -----
    // ipn_url     : MoMo gọi vào đây sau khi khách hoàn tất thanh toán (server-to-server)
    // redirect_url: Trình duyệt của khách được điều hướng về đây sau khi thanh toán
    'ipn_url'      => env('MOMO_IPN_URL', env('APP_URL', 'http://localhost:8000') . '/api/v1/payments/momo/ipn-callback'),
    'redirect_url' => env('MOMO_REDIRECT_URL', env('APP_URL', 'http://localhost:8000') . '/payment/momo/result'),

];
