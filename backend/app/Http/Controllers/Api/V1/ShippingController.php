<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\GoogleMapsShippingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShippingController
{
    /**
     * Service xử lý tính khoảng cách & phí vận chuyển [2]
     *
     * @var GoogleMapsShippingService
     */
    protected $shippingService;

    /**
     * Inject GoogleMapsShippingService vào Controller [2]
     */
    public function __construct(GoogleMapsShippingService $shippingService)
    {
        $this->shippingService = $shippingService;
    }

    /**
     * API: Tính khoảng cách (km) và Phí vận chuyển động từ Nông trại Củ Chi [3]
     * Endpoint: POST /api/v1/shipping/calculate-km [3]
     */
    public function calculateKm(Request $request): JsonResponse
    {
        // 1. Validate dữ liệu gửi lên từ Frontend (Người 4) [3]
        $validated = $request->validate([
            'customer_address' => ['required', 'string', 'max:500'],
            'latitude'         => ['nullable', 'numeric'],
            'longitude'        => ['nullable', 'numeric'],
        ], [
            'customer_address.required' => 'Vui lòng nhập địa chỉ giao hàng của bạn.',
            'customer_address.string'   => 'Địa chỉ giao hàng phải là dạng chuỗi ký tự.',
            'customer_address.max'      => 'Địa chỉ giao hàng không được vượt quá 500 ký tự.',
        ]);

        // 2. Gọi hàm tính phí vận chuyển từ GoogleMapsShippingService [2]
        $result = $this->shippingService->calculateShippingFee($validated['customer_address']);

        // 3. Trả về Response JSON theo đúng chuẩn Postman Collection API Specification [4]
        return response()->json([
            'status' => 'success',
            'data'   => [
                'distance_km'   => $result['distance_km'],
                'duration_text' => '35 phút',
                'shipping_fee'  => $result['shipping_fee'],
                'farm_origin'   => $result['origin'],
            ],
        ], 200);
    }
}