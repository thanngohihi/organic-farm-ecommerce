<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\DeliverySchedule;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class SubscriptionOrderGeneratorService
{
    public function __construct(
        private readonly FefoWarehouseService $fefoService
    ) {}

    /**
     * Quét lịch giao đến hạn (mặc định <= hôm nay), tự động xuất kho FEFO
     * và sinh đơn hàng vào bảng orders/order_items. Nếu thiếu hàng -> đánh dấu that_bai.
     */
    public function processDueSchedules(?string $targetDate = null): array
    {
        $cutoffDate = $targetDate ?: now()->toDateString();
        $today = now()->toDateString();

        // Đóng các gói đã quá ngày kết thúc
        $expiredSubscriptions = Subscription::query()
            ->where('status', 'dang_hoat_dong')
            ->whereDate('end_date', '<', $today)
            ->update(['status' => 'het_han']);

        $schedules = DeliverySchedule::query()
            ->with('subscription.customer')
            ->where('status', 'cho_tao_don')
            ->whereDate('delivery_date', '<=', $cutoffDate)
            ->whereHas('subscription', function ($q) {
                $q->where('status', 'dang_hoat_dong')
                    ->where(function ($payQuery) {
                        $payQuery->where('payment_method', 'cod')
                            ->orWhere(function ($momoQuery) {
                                $momoQuery->where('payment_method', 'momo')
                                    ->where('payment_status', 'da_thanh_toan');
                            });
                    });
            })
            ->orderBy('delivery_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $createdOrders = [];
        $failedSchedules = [];

        foreach ($schedules as $schedule) {
            try {
                $outcome = DB::transaction(function () use ($schedule, $today) {
                    $lockedSchedule = DeliverySchedule::query()
                        ->with('subscription')
                        ->lockForUpdate()
                        ->find($schedule->id);

                    if (!$lockedSchedule || $lockedSchedule->status !== 'cho_tao_don') {
                        return null;
                    }

                    $subscription = $lockedSchedule->subscription;
                    if (!$subscription || $subscription->status !== 'dang_hoat_dong') {
                        return null;
                    }
                    if ($subscription->payment_method === 'momo' && $subscription->payment_status !== 'da_thanh_toan') {
                        return null;
                    }

                    $weightNeeded = round(max(0.5, (float) $subscription->weight_per_delivery), 2);

                    // Tìm tồn kho khả dụng các sản phẩm đang kinh doanh (FEFO - ưu tiên lô sắp hết hạn trước)
                    $candidateProducts = DB::table('batches')
                        ->join('products', 'batches.product_id', '=', 'products.id')
                        ->where('products.is_active', true)
                        ->whereIn('batches.status', ['con_hang', 'sap_het_han'])
                        ->where('batches.current_quantity', '>', 0)
                        ->whereDate('batches.expiry_date', '>=', $today)
                        ->groupBy('batches.product_id', 'products.name', 'products.base_price')
                        ->selectRaw('batches.product_id, products.name, products.base_price, SUM(batches.current_quantity) as total_qty, MIN(batches.expiry_date) as min_expiry')
                        ->orderBy('min_expiry', 'asc')
                        ->get();

                    $totalFarmAvailable = round((float) $candidateProducts->sum('total_qty'), 2);
                    if ($totalFarmAvailable < $weightNeeded) {
                        $lockedSchedule->update(['status' => 'that_bai']);

                        return [
                            'type'    => 'failed',
                            'message' => "Lịch giao #{$lockedSchedule->id} ({$lockedSchedule->delivery_date?->toDateString()}) gói \"{$subscription->package_name}\" thiếu hàng FEFO (cần {$weightNeeded}kg, kho còn {$totalFarmAvailable}kg). Sales cần liên hệ khách đổi sản phẩm tương đương.",
                            'schedule_id' => $lockedSchedule->id,
                        ];
                    }

                    $remainingToAllocate = $weightNeeded;
                    $orderItemsPayload = [];
                    $totalDeliveriesCount = max(
                        1,
                        DeliverySchedule::query()->where('subscription_id', $subscription->id)->count()
                    );
                    $perDeliveryAmount = round((float) $subscription->total_price / $totalDeliveriesCount, 0);

                    foreach ($candidateProducts as $prod) {
                        if ($remainingToAllocate <= 0) {
                            break;
                        }

                        $takeQty = round(min((float) $prod->total_qty, $remainingToAllocate), 2);
                        if ($takeQty <= 0) {
                            continue;
                        }

                        $fefoResult = $this->fefoService->exportByFefo((int) $prod->product_id, $takeQty);
                        $allocatedUnitPrice = round($perDeliveryAmount / max(0.5, $weightNeeded), 2);

                        foreach ($fefoResult['allocations'] as $allocation) {
                            $deducted = (float) ($allocation['deducted_quantity'] ?? $allocation['quantity_deducted'] ?? 0);
                            $orderItemsPayload[] = [
                                'product_id'  => (int) $prod->product_id,
                                'batch_id'    => (int) $allocation['batch_id'],
                                'quantity'    => $deducted,
                                'unit_price'  => $allocatedUnitPrice,
                                'total_price' => round($allocatedUnitPrice * $deducted, 2),
                            ];
                        }

                        $remainingToAllocate = round($remainingToAllocate - $takeQty, 2);
                    }

                    $orderCode = 'SUB-' . now()->format('Ymd') . '-' . strtoupper(Str::random(5));
                    $subPaymentMethod = $subscription->payment_method ?: 'cod';
                    $isPrepaidMoMo = $subPaymentMethod === 'momo'
                        && $subscription->payment_status === 'da_thanh_toan';

                    $order = Order::query()->create([
                        'order_code'       => $orderCode,
                        'customer_id'      => $subscription->customer_id,
                        'subscription_id'  => $subscription->id,
                        'delivery_address' => $subscription->delivery_address,
                        'distance_km'      => (float) $subscription->distance_km,
                        'subtotal'         => $perDeliveryAmount,
                        'shipping_fee'     => 0,
                        'loyalty_discount' => 0,
                        'total_amount'     => $perDeliveryAmount,
                        'payment_method'   => $subPaymentMethod,
                        'payment_status'   => $isPrepaidMoMo ? 'da_thanh_toan' : 'cho_thanh_toan',
                        'order_status'     => 'da_xac_nhan',
                    ]);

                    foreach ($orderItemsPayload as $itemPayload) {
                        OrderItem::query()->create(array_merge($itemPayload, [
                            'order_id' => $order->id,
                        ]));
                    }

                    $lockedSchedule->update([
                        'order_id' => $order->id,
                        'status'   => 'da_tao_don',
                    ]);

                    return [
                        'type'       => 'created',
                        'order_id'   => $order->id,
                        'order_code' => $order->order_code,
                        'schedule_id' => $lockedSchedule->id,
                    ];
                });

                if ($outcome !== null) {
                    if ($outcome['type'] === 'created') {
                        $createdOrders[] = $outcome;
                    } else {
                        $failedSchedules[] = $outcome;
                    }
                }
            } catch (Throwable $e) {
                $schedule->update(['status' => 'that_bai']);
                $failedSchedules[] = [
                    'type'        => 'failed',
                    'schedule_id' => $schedule->id,
                    'message'     => "Lịch giao #{$schedule->id} phát sinh lỗi: " . $e->getMessage(),
                ];
            }
        }

        return [
            'cutoff_date'           => $cutoffDate,
            'expired_subscriptions' => $expiredSubscriptions,
            'processed_count'       => $schedules->count(),
            'created_count'         => count($createdOrders),
            'failed_count'          => count($failedSchedules),
            'created_orders'        => $createdOrders,
            'failed_schedules'      => $failedSchedules,
        ];
    }
}
