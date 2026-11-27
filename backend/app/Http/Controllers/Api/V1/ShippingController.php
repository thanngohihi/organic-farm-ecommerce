<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\GoogleMapsShippingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShippingController extends Controller
{
    public function __construct(
        protected GoogleMapsShippingService $shippingService
    ) {}

    /**
     * GET /api/v1/shipping/farm-location
     * Trả về tọa độ & địa chỉ mặc định của Doanh nghiệp / Nông trại từ .env
     */
    public function farmLocation(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data'   => $this->shippingService->getFarmLocation(),
        ], 200);
    }

    /**
     * API: Tính khoảng cách (km) và Phí vận chuyển động từ Nông trại Củ Chi
     * Endpoint: POST /api/v1/shipping/calculate-km
     */
    public function calculateKm(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_address' => ['required', 'string', 'max:500'],
            'latitude'         => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'        => ['nullable', 'numeric', 'between:-180,180'],
            'shipping_type'    => ['nullable', 'in:binh_thuong,hoa_toc'],
        ], [
            'customer_address.required' => 'Vui lòng nhập địa chỉ giao hàng của bạn.',
            'customer_address.string'   => 'Địa chỉ giao hàng phải là dạng chuỗi ký tự.',
            'customer_address.max'      => 'Địa chỉ giao hàng không được vượt quá 500 ký tự.',
            'shipping_type.in'          => 'Hình thức giao hàng chỉ hỗ trợ bình thường hoặc hỏa tốc.',
        ]);

        $lat = isset($validated['latitude']) ? (float) $validated['latitude'] : null;
        $lng = isset($validated['longitude']) ? (float) $validated['longitude'] : null;
        $shippingType = $validated['shipping_type'] ?? 'binh_thuong';

        $result = $this->shippingService->calculateShippingFee(
            $validated['customer_address'],
            $lat,
            $lng,
            $shippingType
        );

        return response()->json([
            'status' => 'success',
            'data'   => [
                'distance_km'        => $result['distance_km'],
                'shipping_type'      => $result['shipping_type'],
                'duration_text'      => $result['duration_text'],
                'estimated_delivery' => $result['estimated_delivery'],
                'shipping_method'    => $result['shipping_method'],
                'shipping_fee'       => $result['shipping_fee'],
                'farm_origin'        => $result['origin'],
                'calculation_mode'   => $result['calculation_mode'],
            ],
        ], 200);
    }
}
