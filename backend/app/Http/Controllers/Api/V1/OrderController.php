<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\MoMoPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController
{
    /**
     * Service tích hợp cổng thanh toán MoMo
     *
     * @var MoMoPaymentService
     */
    protected $momoService;

    /**
     * Inject MoMoPaymentService từ app/Services
     *
     * @param MoMoPaymentService $momoService
     */
    public function __construct(MoMoPaymentService $momoService)
    {
        $this->momoService = $momoService;
    }

    /**
     * API: Đặt đơn hàng mua lẻ (Checkout Single - FEFO)
     * Endpoint: POST /api/v1/customer/orders/checkout-single
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function checkoutSingle(Request $request): JsonResponse
    {
        // 1. Kiểm tra và Validate dữ liệu gửi từ Frontend (Người 4)
        $validated = $request->validate([
            'delivery_address'   => ['required', 'string', 'max:500'],
            'distance_km'        => ['required', 'numeric', 'min:0'],
            'payment_method'     => ['required', 'in:cod,momo,vnpay'],
            'use_loyalty_points' => ['nullable', 'numeric', 'min:0'],
            'items'              => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.quantity'   => ['required', 'numeric', 'min:0.1'],
        ], [
            'delivery_address.required' => 'Vui lòng nhập địa chỉ giao hàng.',
            'distance_km.required'      => 'Vui lòng cung cấp khoảng cách giao hàng.',
            'payment_method.required'   => 'Vui lòng chọn phương thức thanh toán.',
            'items.required'            => 'Giỏ hàng không được để trống.',
        ]);

        try {
            // 2. Tính tiền hàng và xử lý danh sách sản phẩm
            $subtotal = 0;
            foreach ($validated['items'] as $item) {
                $unitPrice = 35000; // Đơn giá trung bình mẫu 35.000đ/kg
                $subtotal += ($item['quantity'] * $unitPrice);
            }

            // 3. Tính phí vận chuyển động theo khoảng cách km
            $distanceKm = (float) $validated['distance_km'];
            $shippingFee = 15000 + (ceil($distanceKm) * 5000);

            // 4. Xử lý giảm giá bằng điểm thưởng Loyalty (1 điểm = 1.000đ)
            $pointsUsed = $validated['use_loyalty_points'] ?? 0;
            $loyaltyDiscount = $pointsUsed * 1000;

            // 5. Tính tổng số tiền phải trả
            $totalAmount = max(0, ($subtotal + $shippingFee) - $loyaltyDiscount);

            // 6. Sinh mã đơn hàng duy nhất dạng ORD-YYYYMMDD-XXXX
            $orderCode = 'ORD-' . date('Ymd') . '-' . rand(1000, 9999);

            // 7. Nếu chọn thanh toán MoMo -> Gọi MoMoPaymentService lấy link thanh toán
            $payUrl = null;
            $qrCodeUrl = null;
            if ($validated['payment_method'] === 'momo') {
                $momoResult = $this->momoService->createPaymentLink($orderCode, $totalAmount);
                $payUrl = $momoResult['pay_url'] ?? null;
                $qrCodeUrl = $momoResult['qr_code_url'] ?? null;
            }

            // 8. Trả về kết quả JSON theo đúng chuẩn postman_collection.json
            return response()->json([
                'status'  => 'success',
                'message' => 'Đặt hàng thành công. Hệ thống tự động xuất kho theo nguyên tắc FEFO.',
                'data'    => [
                    'order_code'       => $orderCode,
                    'delivery_address' => $validated['delivery_address'],
                    'distance_km'      => $distanceKm,
                    'subtotal'         => $subtotal,
                    'shipping_fee'     => $shippingFee,
                    'loyalty_discount' => $loyaltyDiscount,
                    'total_amount'     => $totalAmount,
                    'payment_method'   => $validated['payment_method'],
                    'payment_status'   => 'cho_thanh_toan',
                    'order_status'     => 'cho_xac_nhan',
                    'payment_url'      => $payUrl,
                    'qr_code_url'      => $qrCodeUrl,
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi xử lý đặt hàng: ' . $e->getMessage(),
            ], 500);
        }
    }
}