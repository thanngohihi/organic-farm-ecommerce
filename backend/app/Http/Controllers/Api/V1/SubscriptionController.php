<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DeliverySchedule;
use App\Models\Subscription;
use App\Services\GoogleMapsShippingService;
use App\Services\MoMoPaymentService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SubscriptionController extends Controller
{
    public function __construct(
        private readonly GoogleMapsShippingService $shippingService,
        private readonly MoMoPaymentService $momoService
    ) {}

    /**
     * GET /api/v1/subscriptions (hoặc /api/v1/customer/subscriptions)
     * Danh sách gói định kỳ của khách hàng hiện tại kèm lịch giao.
     */
    public function index(Request $request): JsonResponse
    {
        $subscriptions = Subscription::query()
            ->with([
                'schedules' => fn ($q) => $q->with('order:id,order_code,order_status,total_amount,created_at')
                    ->orderBy('delivery_date', 'asc'),
            ])
            ->where('customer_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $subscriptions,
        ], 200);
    }

    /**
     * POST /api/v1/subscriptions (hoặc /api/v1/customer/subscriptions)
     * Khách hàng đăng ký Gói rau củ định kỳ & tự động khởi tạo danh sách delivery_schedules.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'package_name'        => ['required', 'string', 'max:150'],
            'weight_per_delivery' => ['required', 'numeric', 'min:0.5', 'max:100'],
            'delivery_days'       => ['required', 'array', 'min:1'],
            'delivery_days.*'     => ['string'],
            'delivery_address'    => ['required', 'string', 'min:5', 'max:500'],
            'start_date'          => ['required', 'date'],
            'end_date'            => ['required', 'date', 'after_or_equal:start_date'],
            'total_price'         => ['required', 'numeric', 'min:0'],
            'payment_method'      => ['nullable', 'in:cod,momo'],
            'delivery_schedule'   => ['nullable', 'array'],
            'delivery_schedule.*' => ['date'],
            'latitude'            => ['nullable', 'numeric'],
            'longitude'           => ['nullable', 'numeric'],
        ], [
            'package_name.required'        => 'Vui lòng chọn gói nông sản định kỳ.',
            'weight_per_delivery.required' => 'Vui lòng cung cấp khối lượng mỗi lần giao.',
            'delivery_days.required'       => 'Vui lòng chọn ít nhất một ngày giao trong tuần.',
            'delivery_address.required'    => 'Vui lòng nhập địa chỉ giao hàng chi tiết.',
            'end_date.after_or_equal'      => 'Ngày kết thúc gói phải lớn hơn hoặc bằng ngày bắt đầu.',
        ]);

        $shipping = $this->shippingService->calculateShippingFee(
            trim($validated['delivery_address']),
            isset($validated['latitude']) ? (float) $validated['latitude'] : null,
            isset($validated['longitude']) ? (float) $validated['longitude'] : null
        );

        $scheduleDates = $this->resolveScheduleDates(
            $validated['start_date'],
            $validated['end_date'],
            $validated['delivery_days'],
            $validated['delivery_schedule'] ?? null
        );

        if (empty($scheduleDates)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không có ngày giao nào phù hợp trong khoảng thời gian đã chọn.',
            ], 422);
        }

        $paymentMethod = $validated['payment_method'] ?? 'cod';
        $subscriptionCode = 'SUBPKG-' . now()->format('Ymd') . '-' . strtoupper(Str::random(5));

        $subscription = DB::transaction(function () use (
            $request,
            $validated,
            $shipping,
            $scheduleDates,
            $paymentMethod,
            $subscriptionCode
        ) {
            $sub = Subscription::query()->create([
                'customer_id'         => $request->user()->id,
                'subscription_code'   => $subscriptionCode,
                'package_name'        => trim($validated['package_name']),
                'weight_per_delivery' => round((float) $validated['weight_per_delivery'], 2),
                'delivery_days'       => array_values($validated['delivery_days']),
                'delivery_address'    => trim($validated['delivery_address']),
                'distance_km'         => $shipping['distance_km'],
                'total_price'         => round((float) $validated['total_price'], 2),
                'payment_method'      => $paymentMethod,
                'payment_status'      => 'cho_thanh_toan',
                'start_date'          => $validated['start_date'],
                'end_date'            => $validated['end_date'],
                'status'              => 'dang_hoat_dong',
            ]);

            $now = now();
            $rows = array_map(fn (string $dateStr) => [
                'subscription_id' => $sub->id,
                'order_id'        => null,
                'delivery_date'   => $dateStr,
                'status'          => 'cho_tao_don',
                'created_at'      => $now,
                'updated_at'      => $now,
            ], $scheduleDates);

            DeliverySchedule::query()->insert($rows);

            return $sub->load(['schedules' => fn ($q) => $q->orderBy('delivery_date', 'asc')]);
        });

        $responseData = $subscription->toArray();
        $message = 'Đăng ký gói rau củ định kỳ thành công! Hệ thống sẽ tự động tạo đơn hàng trước mỗi lịch giao.';

        if ($paymentMethod === 'momo') {
            $momoResult = $this->momoService->createPaymentLink(
                $subscription->subscription_code,
                (float) $subscription->total_price
            );
            $responseData['payment_url'] = $momoResult['pay_url'] ?? null;
            $responseData['qr_code_url'] = $momoResult['qr_code_url'] ?? null;
            $message = 'Đăng ký gói rau củ định kỳ thành công! Vui lòng thanh toán qua ví MoMo để hoàn tất.';
        }

        return response()->json([
            'status'  => 'success',
            'message' => $message,
            'data'    => $responseData,
        ], 201);
    }

    /**
     * PATCH /api/v1/subscriptions/{id}/status
     * Khách hàng tạm dừng, kích hoạt lại hoặc hủy gói định kỳ của chính mình.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:dang_hoat_dong,tam_dung,da_huy'],
        ]);

        $subscription = Subscription::query()
            ->where('id', $id)
            ->where('customer_id', $request->user()->id)
            ->first();

        if (!$subscription) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy gói định kỳ thuộc tài khoản của bạn.',
            ], 404);
        }

        if (in_array($subscription->status, ['het_han', 'da_huy'], true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gói định kỳ này đã kết thúc hoặc đã hủy, không thể thay đổi trạng thái.',
            ], 422);
        }

        if (
            in_array($validated['status'], ['tam_dung', 'dang_hoat_dong'], true)
            && $subscription->payment_method === 'momo'
            && $subscription->payment_status !== 'da_thanh_toan'
        ) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gói MoMo chưa thanh toán. Vui lòng hoàn tất thanh toán MoMo hoặc hủy gói nếu không sử dụng.',
            ], 422);
        }

        $result = DB::transaction(function () use ($subscription, $validated) {
            $shiftedCount = 0;
            $updatePayload = ['status' => $validated['status']];

            if ($validated['status'] === 'da_huy') {
                DeliverySchedule::query()
                    ->where('subscription_id', $subscription->id)
                    ->where('status', 'cho_tao_don')
                    ->update(['status' => 'da_huy']);
            } elseif (
                $subscription->status === 'tam_dung'
                && $validated['status'] === 'dang_hoat_dong'
            ) {
                $todayStr = now()->toDateString();
                $today = Carbon::parse($todayStr)->startOfDay();

                $missedSchedules = DeliverySchedule::query()
                    ->where('subscription_id', $subscription->id)
                    ->where('status', 'cho_tao_don')
                    ->whereDate('delivery_date', '<', $todayStr)
                    ->orderBy('delivery_date', 'asc')
                    ->orderBy('id', 'asc')
                    ->lockForUpdate()
                    ->get();

                if ($missedSchedules->isNotEmpty()) {
                    $latestFutureDate = DeliverySchedule::query()
                        ->where('subscription_id', $subscription->id)
                        ->whereDate('delivery_date', '>=', $todayStr)
                        ->max('delivery_date');

                    $cursor = $latestFutureDate
                        ? Carbon::parse($latestFutureDate)->startOfDay()->addDay()
                        : $today->copy();

                    if ($cursor->lt($today)) {
                        $cursor = $today->copy();
                    }

                    $targetWeekdays = $this->extractTargetWeekdays((array) $subscription->delivery_days);
                    $maxRescheduledDate = null;

                    foreach ($missedSchedules as $missed) {
                        $weekdays = !empty($targetWeekdays)
                            ? $targetWeekdays
                            : [Carbon::parse($missed->delivery_date)->dayOfWeek];

                        $guard = 0;
                        while (!in_array($cursor->dayOfWeek, $weekdays, true) && $guard < 366) {
                            $cursor->addDay();
                            $guard++;
                        }

                        $nextDateStr = $cursor->toDateString();
                        $missed->update(['delivery_date' => $nextDateStr]);
                        $maxRescheduledDate = $nextDateStr;
                        $shiftedCount++;
                        $cursor->addDay();
                    }

                    $currentEndStr = $subscription->end_date?->toDateString();
                    if ($maxRescheduledDate && (!$currentEndStr || $maxRescheduledDate > $currentEndStr)) {
                        $updatePayload['end_date'] = $maxRescheduledDate;
                    }
                }
            }

            $subscription->update($updatePayload);

            return [
                'subscription'  => $subscription->fresh()->load(['schedules' => fn ($q) => $q->orderBy('delivery_date', 'asc')]),
                'shifted_count' => $shiftedCount,
            ];
        });

        $message = 'Đã cập nhật trạng thái gói định kỳ.';
        if ($result['shifted_count'] > 0) {
            $newEnd = $result['subscription']->end_date?->format('d/m/Y') ?? '';
            $message = "Đã kích hoạt lại gói định kỳ và dời {$result['shifted_count']} lượt giao bị lỡ trong lúc tạm dừng nối tiếp đến ngày {$newEnd}.";
        }

        return response()->json([
            'status'  => 'success',
            'message' => $message,
            'data'    => $result['subscription'],
        ], 200);
    }

    /**
     * POST /api/v1/subscriptions/{id}/momo-payment
     * Tạo lại liên kết/QR thanh toán MoMo cho gói định kỳ đang chờ thanh toán.
     */
    public function retryMoMoPayment(Request $request, int $id): JsonResponse
    {
        $subscription = Subscription::query()
            ->with('schedules')
            ->where('id', $id)
            ->where('customer_id', $request->user()->id)
            ->first();

        if (!$subscription) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy gói định kỳ thuộc tài khoản của bạn.',
            ], 404);
        }

        if (in_array($subscription->status, ['da_huy', 'het_han'], true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gói định kỳ đã hủy hoặc hết hạn, không thể thanh toán.',
            ], 422);
        }

        if ($subscription->payment_method !== 'momo') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gói này sử dụng hình thức Tiền mặt (COD).',
            ], 422);
        }

        if ($subscription->payment_status === 'da_thanh_toan') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Gói định kỳ này đã được thanh toán MoMo trước đó.',
            ], 422);
        }

        if (empty($subscription->subscription_code)) {
            $subscription->subscription_code = 'SUBPKG-' . now()->format('Ymd') . '-' . strtoupper(Str::random(5));
        }
        if ($subscription->payment_status === 'that_bai') {
            $subscription->payment_status = 'cho_thanh_toan';
        }
        $subscription->save();

        $momoResult = $this->momoService->createPaymentLink(
            $subscription->subscription_code,
            (float) $subscription->total_price
        );

        $responseData = $subscription->fresh()->load('schedules')->toArray();
        $responseData['payment_url'] = $momoResult['pay_url'] ?? null;
        $responseData['qr_code_url'] = $momoResult['qr_code_url'] ?? null;

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã khởi tạo lại liên kết thanh toán MoMo cho gói định kỳ.',
            'data'    => $responseData,
        ], 200);
    }

    private function resolveScheduleDates(
        string $startDate,
        string $endDate,
        array $deliveryDays,
        ?array $providedDates
    ): array {
        if (!empty($providedDates)) {
            $valid = [];
            foreach ($providedDates as $d) {
                $iso = Carbon::parse($d)->toDateString();
                if ($iso >= $startDate && $iso <= $endDate) {
                    $valid[] = $iso;
                }
            }
            $valid = array_values(array_unique($valid));
            sort($valid);
            return $valid;
        }

        $targetWeekdays = $this->extractTargetWeekdays($deliveryDays);

        if (empty($targetWeekdays)) {
            return [];
        }

        $dates = [];
        $cursor = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->startOfDay();

        while ($cursor->lte($end)) {
            if (in_array($cursor->dayOfWeek, $targetWeekdays, true)) {
                $dates[] = $cursor->toDateString();
            }
            $cursor->addDay();
        }

        return $dates;
    }

    private function extractTargetWeekdays(array $deliveryDays): array
    {
        $weekdayMap = [
            'sunday'    => 0,
            'monday'    => 1,
            'tuesday'   => 2,
            'wednesday' => 3,
            'thursday'  => 4,
            'friday'    => 5,
            'saturday'  => 6,
            'thứ ba'    => 2,
            'thứ sáu'   => 5,
            'thứ bảy'   => 6,
        ];

        $targetWeekdays = [];
        foreach ($deliveryDays as $day) {
            $key = mb_strtolower(trim((string) $day));
            if (isset($weekdayMap[$key])) {
                $targetWeekdays[] = $weekdayMap[$key];
            }
        }

        return array_values(array_unique($targetWeekdays));
    }
}
