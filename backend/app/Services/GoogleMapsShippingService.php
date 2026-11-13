<?php

namespace App\Services;

class GoogleMapsShippingService
{
    public function calculateShippingFee(string $customerAddress): array
    {
        $simulatedDistanceKm = 12.5;
        $baseFee = 15000;
        $feePerKm = 5000;
        
        $totalFee = $baseFee + ($simulatedDistanceKm * $feePerKm);

        return [
            'origin' => 'Nong trai Huu co Cu Chi',
            'destination' => $customerAddress,
            'distance_km' => $simulatedDistanceKm,
            'shipping_fee' => $totalFee
        ];
    }
}
