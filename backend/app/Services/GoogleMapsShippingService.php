<?php

namespace App\Services;

class GoogleMapsShippingService
{
    /**
     * Tính toán khoảng cách (km) và phí ship dựa trên địa chỉ khách hàng [2]
     */
    public function calculateShippingFee(string $customerAddress): array
    {
        // Trong Tuần 2, Service này trả về dữ liệu tính toán mẫu [2]
        $simulatedDistanceKm = 18.5;
        $baseFee = 15000;
        $feePerKm = 5000;

        $totalFee = $baseFee + (ceil($simulatedDistanceKm) * $feePerKm);

        return [
            'origin'       => 'Nông trại Củ Chi, TP.HCM',
            'destination'  => $customerAddress,
            'distance_km'  => $simulatedDistanceKm,
            'shipping_fee' => $totalFee,
        ];
    }
}