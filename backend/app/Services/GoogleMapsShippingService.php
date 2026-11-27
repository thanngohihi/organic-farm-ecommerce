<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Throwable;

class GoogleMapsShippingService
{
    // Tọa độ dự phòng mặc định nếu chưa cấu hình trong .env
    private const DEFAULT_FARM_LAT = 10.9735;
    private const DEFAULT_FARM_LNG = 106.4945;
    private const DEFAULT_FARM_ORIGIN = 'Nông trại Củ Chi, TP.HCM';

    public function getFarmLocation(): array
    {
        $origin = trim((string) env('FARM_ORIGIN_NAME', self::DEFAULT_FARM_ORIGIN));
        $latRaw = env('FARM_LATITUDE', self::DEFAULT_FARM_LAT);
        $lngRaw = env('FARM_LONGITUDE', self::DEFAULT_FARM_LNG);

        return [
            'origin'    => $origin !== '' ? $origin : self::DEFAULT_FARM_ORIGIN,
            'latitude'  => is_numeric($latRaw) ? (float) $latRaw : self::DEFAULT_FARM_LAT,
            'longitude' => is_numeric($lngRaw) ? (float) $lngRaw : self::DEFAULT_FARM_LNG,
        ];
    }

    public function normalizeShippingType(?string $shippingType): string
    {
        return $shippingType === 'hoa_toc' ? 'hoa_toc' : 'binh_thuong';
    }

    public function calculateFeeByDistance(float $distanceKm, string $shippingType = 'binh_thuong'): float
    {
        $km = max(1.0, $distanceKm);
        $type = $this->normalizeShippingType($shippingType);

        if ($type === 'hoa_toc') {
            if ($km <= 40.0) {
                return (float) (25000 + ((int) ceil($km) * 5000));
            }

            if ($km <= 150.0) {
                return (float) (215000 + ((int) ceil(($km - 40.0) / 10.0) * 10000));
            }

            if ($km <= 600.0) {
                return (float) (330000 + ((int) ceil(($km - 150.0) / 50.0) * 15000));
            }

            // Hỏa tốc liên vùng (Nam -> Bắc > 600km): chuyển phát lạnh hàng không
            return 380000.0;
        }

        // Giao hàng bình thường (tiêu chuẩn)
        if ($km <= 40.0) {
            return (float) (15000 + ((int) ceil($km) * 3000));
        }

        if ($km <= 150.0) {
            return (float) (140000 + ((int) ceil(($km - 40.0) / 10.0) * 8000));
        }

        if ($km <= 600.0) {
            return (float) (230000 + ((int) ceil(($km - 150.0) / 50.0) * 12000));
        }

        // Giao hàng bình thường đường dài Nam -> Bắc: xe tải lạnh đường bộ
        return 250000.0;
    }

    /**
     * Tính toán khoảng cách (km), thời gian giao dự kiến và phí ship động.
     * Ưu tiên Google Maps Distance Matrix API nếu có GOOGLE_MAPS_API_KEY,
     * sau đó dùng tọa độ GPS (Haversine) hoặc ước lượng theo khu vực địa chỉ.
     */
    public function calculateShippingFee(
        string $customerAddress,
        ?float $latitude = null,
        ?float $longitude = null,
        string $shippingType = 'binh_thuong'
    ): array {
        $farm = $this->getFarmLocation();
        $normalizedType = $this->normalizeShippingType($shippingType);

        // 1. Thử Google Distance Matrix API nếu có API Key trong .env
        $googleResult = $this->tryGoogleDistanceMatrix($customerAddress, $latitude, $longitude, $farm);
        if ($googleResult !== null) {
            $distanceKm = max(1.0, round($googleResult['distance_km'], 2));
            $projection = $this->buildDeliveryProjection($distanceKm, $googleResult['duration_text'], $normalizedType);

            return [
                'origin'             => $farm['origin'],
                'destination'        => $customerAddress,
                'distance_km'        => $distanceKm,
                'shipping_type'      => $normalizedType,
                'duration_text'      => $projection['duration_text'],
                'estimated_delivery' => $projection['estimated_delivery'],
                'shipping_method'    => $projection['shipping_method'],
                'shipping_fee'       => $projection['shipping_fee'],
                'calculation_mode'   => 'google_distance_matrix',
            ];
        }

        // 2. Nếu có tọa độ từ bản đồ Leaflet -> tính khoảng cách Haversine thực tế
        if ($latitude !== null && $longitude !== null) {
            $straightKm = $this->haversineKm($farm['latitude'], $farm['longitude'], $latitude, $longitude);
            // Nhân hệ số đường bộ ~1.25 và tối thiểu 1km
            $roadKm = max(1.0, round($straightKm * 1.25, 2));
            $projection = $this->buildDeliveryProjection($roadKm, null, $normalizedType);

            return [
                'origin'             => $farm['origin'],
                'destination'        => $customerAddress,
                'distance_km'        => $roadKm,
                'shipping_type'      => $normalizedType,
                'duration_text'      => $projection['duration_text'],
                'estimated_delivery' => $projection['estimated_delivery'],
                'shipping_method'    => $projection['shipping_method'],
                'shipping_fee'       => $projection['shipping_fee'],
                'calculation_mode'   => 'gps_haversine',
            ];
        }

        // 3. Thử lấy tọa độ qua OpenStreetMap Nominatim nếu không có tọa độ trực tiếp
        $geoResult = $this->tryNominatimGeocode($customerAddress);
        if ($geoResult !== null) {
            $straightKm = $this->haversineKm(
                $farm['latitude'],
                $farm['longitude'],
                $geoResult['lat'],
                $geoResult['lng']
            );
            $roadKm = max(1.0, round($straightKm * 1.25, 2));
            $projection = $this->buildDeliveryProjection($roadKm, null, $normalizedType);

            return [
                'origin'             => $farm['origin'],
                'destination'        => $customerAddress,
                'distance_km'        => $roadKm,
                'shipping_type'      => $normalizedType,
                'duration_text'      => $projection['duration_text'],
                'estimated_delivery' => $projection['estimated_delivery'],
                'shipping_method'    => $projection['shipping_method'],
                'shipping_fee'       => $projection['shipping_fee'],
                'calculation_mode'   => 'osm_nominatim',
            ];
        }

        // 4. Fallback thông minh theo quận/huyện/tỉnh từ chuỗi địa chỉ
        $estimatedKm = $this->estimateDistanceByAddressKeyword($customerAddress);
        $projection = $this->buildDeliveryProjection($estimatedKm, null, $normalizedType);

        return [
            'origin'             => $farm['origin'],
            'destination'        => $customerAddress,
            'distance_km'        => $estimatedKm,
            'shipping_type'      => $normalizedType,
            'duration_text'      => $projection['duration_text'],
            'estimated_delivery' => $projection['estimated_delivery'],
            'shipping_method'    => $projection['shipping_method'],
            'shipping_fee'       => $projection['shipping_fee'],
            'calculation_mode'   => 'zone_estimate',
        ];
    }

    private function buildDeliveryProjection(
        float $distanceKm,
        ?string $googleDurationText = null,
        string $shippingType = 'binh_thuong'
    ): array {
        $nowVn = now('Asia/Ho_Chi_Minh');
        $type = $this->normalizeShippingType($shippingType);
        $shippingFee = $this->calculateFeeByDistance($distanceKm, $type);

        if ($type === 'hoa_toc') {
            if ($distanceKm <= 40.0) {
                $travelMins = max(20, (int) round($distanceKm * 2.5));
                $durationText = $googleDurationText ?: $this->formatDuration($travelMins);
                $etaStart = $nowVn->copy()->addMinutes($travelMins + 10);
                $etaEnd = $nowVn->copy()->addMinutes($travelMins + 35);

                if ($nowVn->hour >= 20 || $etaEnd->hour >= 22 || $etaEnd->day !== $nowVn->day) {
                    $tomorrow = $nowVn->copy()->addDay()->format('d/m/Y');
                    $estimatedDelivery = "Sáng mai {$tomorrow}, khoảng 08:00 – 10:00 (Hỏa tốc)";
                } else {
                    $today = $nowVn->format('d/m/Y');
                    $estimatedDelivery = "Hôm nay ({$today}), khoảng {$etaStart->format('H:i')} – {$etaEnd->format('H:i')} ({$durationText})";
                }

                return [
                    'shipping_fee'       => $shippingFee,
                    'duration_text'      => $durationText,
                    'estimated_delivery' => $estimatedDelivery,
                    'shipping_method'    => 'Giao hàng hỏa tốc nội vùng',
                ];
            }

            if ($distanceKm <= 150.0) {
                $durationText = '4 – 8 giờ (Xe lạnh hỏa tốc trong ngày / hôm sau)';
                $tomorrow = $nowVn->copy()->addDay()->format('d/m/Y');
                $estimatedDelivery = $nowVn->hour < 13
                    ? "Tối nay ({$nowVn->format('d/m/Y')}) hoặc sáng mai ({$tomorrow})"
                    : "Trong ngày mai ({$tomorrow})";

                return [
                    'shipping_fee'       => $shippingFee,
                    'duration_text'      => $durationText,
                    'estimated_delivery' => $estimatedDelivery,
                    'shipping_method'    => 'Giao hàng hỏa tốc liên tỉnh cận vùng',
                ];
            }

            $day1 = $nowVn->copy()->addDay()->format('d/m/Y');
            $day2 = $nowVn->copy()->addDays(2)->format('d/m/Y');

            if ($distanceKm <= 600.0) {
                return [
                    'shipping_fee'       => $shippingFee,
                    'duration_text'      => '1 – 2 ngày (Xe tải lạnh hỏa tốc liên tỉnh)',
                    'estimated_delivery' => "Từ {$day1} – {$day2} (1 – 2 ngày)",
                    'shipping_method'    => 'Giao hàng hỏa tốc xe tải lạnh liên tỉnh',
                ];
            }

            return [
                'shipping_fee'       => $shippingFee,
                'duration_text'      => '1 – 2 ngày (Vận chuyển lạnh hàng không hỏa tốc Nam – Bắc)',
                'estimated_delivery' => "Từ {$day1} – {$day2} (1 – 2 ngày)",
                'shipping_method'    => 'Giao hàng hỏa tốc hàng không Nam – Bắc (Air Cold-Chain)',
            ];
        }

        // Giao hàng bình thường (tiêu chuẩn)
        if ($distanceKm <= 40.0) {
            $today = $nowVn->format('d/m/Y');
            $tomorrow = $nowVn->copy()->addDay()->format('d/m/Y');
            $estimatedDelivery = $nowVn->hour < 14
                ? "Hôm nay ({$today}), khoảng 16:00 – 20:00"
                : "Ngày mai ({$tomorrow}), khoảng 08:00 – 12:00";

            return [
                'shipping_fee'       => $shippingFee,
                'duration_text'      => '4 – 8 giờ (Giao tiêu chuẩn trong ngày / sáng mai)',
                'estimated_delivery' => $estimatedDelivery,
                'shipping_method'    => 'Giao hàng bình thường nội vùng',
            ];
        }

        $day1 = $nowVn->copy()->addDay()->format('d/m/Y');
        $day2 = $nowVn->copy()->addDays(2)->format('d/m/Y');
        $day3 = $nowVn->copy()->addDays(3)->format('d/m/Y');
        $day4 = $nowVn->copy()->addDays(4)->format('d/m/Y');

        if ($distanceKm <= 150.0) {
            return [
                'shipping_fee'       => $shippingFee,
                'duration_text'      => '1 – 2 ngày (Giao tiêu chuẩn cận vùng)',
                'estimated_delivery' => "Từ {$day1} – {$day2} (1 – 2 ngày)",
                'shipping_method'    => 'Giao hàng bình thường liên tỉnh cận vùng',
            ];
        }

        if ($distanceKm <= 600.0) {
            return [
                'shipping_fee'       => $shippingFee,
                'duration_text'      => '2 – 3 ngày (Xe tải lạnh tiêu chuẩn)',
                'estimated_delivery' => "Từ {$day2} – {$day3} (2 – 3 ngày)",
                'shipping_method'    => 'Giao hàng bình thường liên tỉnh',
            ];
        }

        return [
            'shipping_fee'       => $shippingFee,
            'duration_text'      => '3 – 4 ngày (Xe tải lạnh đường bộ Nam – Bắc)',
            'estimated_delivery' => "Từ {$day3} – {$day4} (3 – 4 ngày)",
            'shipping_method'    => 'Giao hàng bình thường đường bộ Nam – Bắc',
        ];
    }

    private function tryGoogleDistanceMatrix(string $address, ?float $lat, ?float $lng, array $farm): ?array
    {
        $apiKey = trim((string) env('GOOGLE_MAPS_API_KEY', ''));
        if ($apiKey === '') {
            return null;
        }

        try {
            $destination = ($lat !== null && $lng !== null) ? "{$lat},{$lng}" : $address;
            $response = Http::timeout(5)->get('https://maps.googleapis.com/maps/api/distancematrix/json', [
                'origins'      => $farm['latitude'] . ',' . $farm['longitude'],
                'destinations' => $destination,
                'mode'         => 'driving',
                'language'     => 'vi',
                'key'          => $apiKey,
            ]);

            if (!$response->ok()) {
                return null;
            }

            $data = $response->json();
            $element = $data['rows'][0]['elements'][0] ?? null;
            if (!$element || ($element['status'] ?? '') !== 'OK') {
                return null;
            }

            $meters = (float) ($element['distance']['value'] ?? 0);
            if ($meters <= 0) {
                return null;
            }

            return [
                'distance_km'   => max(1.0, $meters / 1000),
                'duration_text' => (string) ($element['duration']['text'] ?? '35 phút'),
            ];
        } catch (Throwable) {
            return null;
        }
    }

    private function tryNominatimGeocode(string $address): ?array
    {
        try {
            $response = Http::timeout(3)
                ->withHeaders(['User-Agent' => 'OrganicFarmEcommerce/1.0'])
                ->get('https://nominatim.openstreetmap.org/search', [
                    'q'      => $address,
                    'format' => 'jsonv2',
                    'limit'  => 1,
                ]);

            if (!$response->ok()) {
                return null;
            }

            $items = $response->json();
            if (!is_array($items) || empty($items[0]['lat']) || empty($items[0]['lon'])) {
                return null;
            }

            return [
                'lat' => (float) $items[0]['lat'],
                'lng' => (float) $items[0]['lon'],
            ];
        } catch (Throwable) {
            return null;
        }
    }

    private function haversineKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(max(0, 1 - $a)));
        return $earthRadius * $c;
    }

    private function estimateDistanceByAddressKeyword(string $address): float
    {
        $norm = mb_strtolower($address);

        $zones = [
            'củ chi'      => 7.5,
            'cu chi'      => 7.5,
            'hóc môn'     => 14.0,
            'hoc mon'     => 14.0,
            'trảng bàng'  => 15.0,
            'bến cát'     => 18.0,
            'thủ dầu một' => 20.0,
            'bình dương'  => 26.0,
            'quận 12'     => 19.5,
            'q12'         => 19.5,
            'gò vấp'      => 23.0,
            'tân bình'    => 25.0,
            'tân phú'     => 24.5,
            'bình thạnh'  => 27.5,
            'phú nhuận'   => 26.5,
            'quận 1'      => 29.0,
            'quận 3'      => 28.0,
            'quận 5'      => 29.5,
            'quận 10'     => 28.5,
            'thủ đức'     => 31.0,
            'quận 7'      => 35.0,
            'bình chánh'  => 32.0,
            'tây ninh'    => 55.0,
            'long an'     => 52.0,
            'biên hòa'    => 45.0,
            'đồng nai'    => 55.0,
            'vũng tàu'    => 110.0,
            'cần thơ'     => 175.0,
            'đà lạt'      => 310.0,
            'lâm đồng'    => 310.0,
            'nha trang'   => 430.0,
            'khánh hòa'   => 430.0,
            'quy nhơn'    => 650.0,
            'đà nẵng'     => 950.0,
            'da nang'     => 950.0,
            'huế'         => 1050.0,
            'nghệ an'     => 1280.0,
            'vinh'        => 1280.0,
            'thanh hóa'   => 1400.0,
            'ninh bình'   => 1480.0,
            'nam định'    => 1500.0,
            'thái bình'   => 1520.0,
            'hải dương'   => 1560.0,
            'bắc ninh'    => 1580.0,
            'hà nội'      => 1550.0,
            'ha noi'      => 1550.0,
            'hải phòng'   => 1600.0,
            'hai phong'   => 1600.0,
            'quảng ninh'  => 1680.0,
            'hạ long'     => 1680.0,
            'thái nguyên' => 1630.0,
        ];

        foreach ($zones as $keyword => $km) {
            if (str_contains($norm, $keyword)) {
                return $km;
            }
        }

        return 22.0;
    }

    private function formatDuration(int $minutes): string
    {
        if ($minutes < 60) {
            return "{$minutes} phút";
        }
        $hours = intdiv($minutes, 60);
        $rem = $minutes % 60;
        return $rem > 0 ? "{$hours} giờ {$rem} phút" : "{$hours} giờ";
    }
}
