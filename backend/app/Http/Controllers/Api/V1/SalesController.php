<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Complaint;
use App\Models\DeliverySchedule;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\Services\FefoWarehouseService;
use App\Services\SubscriptionOrderGeneratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class SalesController extends Controller
{
    public function __construct(
        private readonly FefoWarehouseService $fefoService,
        private readonly SubscriptionOrderGeneratorService $subscriptionGenerator
    ) {}

    /**
     * GET /api/v1/sales/orders
     * Danh sách đơn hàng cho Sales điều phối giao nhận & duyệt đơn.
     */
    public function orders(Request $request): JsonResponse
    {
        $query = Order::query()
            ->with([
                'customer:id,full_name,phone,email',
                'subscription:id,package_name,delivery_days',
                'items.product:id,name,unit',
                'items.batch:id,batch_code,expiry_date',
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($request->filled('order_status')) {
            $query->where('order_status', $request->query('order_status'));
        }

        $orders = $query->get()->map(function (Order $order) {
            $distanceKm = (float) $order->distance_km;
            $shippingType = $order->shipping_type ?: 'binh_thuong';
            $isExpress = $shippingType === 'hoa_toc';

            return [
                'id'                    => $order->id,
                'order_code'            => $order->order_code,
                'customer_id'           => $order->customer_id,
                'customer_name'         => $order->customer?->full_name ?? 'Khách hàng',
                'phone'                 => $order->customer?->phone ?? '',
                'email'                 => $order->customer?->email ?? '',
                'address'               => $order->delivery_address,
                'delivery_address'      => $order->delivery_address,
                'distance_km'           => $distanceKm,
                'shipping_type'         => $shippingType,
                'is_express'            => $isExpress,
                'subscription_id'       => $order->subscription_id,
                'order_type'            => $order->order_status === 'da_giao_bu'
                    ? 'Đơn giao bù 0đ'
                    : ($order->subscription_id
                        ? 'Gói định kỳ (' . ($order->subscription?->package_name ?? 'Subscription') . ')'
                        : 'Đơn lẻ'),
                'subtotal'              => (float) $order->subtotal,
                'shipping_fee'          => (float) $order->shipping_fee,
                'loyalty_discount'      => (float) $order->loyalty_discount,
                'total_amount'          => (float) $order->total_amount,
                'payment_method'        => $order->payment_method,
                'payment_status'        => $order->payment_status,
                'momo_trans_id'         => $order->momo_trans_id,
                'order_status'          => $order->order_status,
                'delivery_partner'      => $order->delivery_partner,
                'delivery_tracking_url' => $order->delivery_tracking_url,
                'created_at'            => $order->created_at?->toIso8601String(),
                'items'                 => $order->items->map(fn (OrderItem $item) => [
                    'id'         => $item->id,
                    'product_id' => $item->product_id,
                    'name'       => $item->product?->name ?? "Sản phẩm #{$item->product_id}",
                    'unit'       => $item->product?->unit ?? 'kg',
                    'qty'        => (float) $item->quantity,
                    'quantity'   => (float) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'batch_code' => $item->batch?->batch_code,
                ])->values(),
            ];
        });

        // Cảnh báo lịch giao Subscription thất bại vì thiếu hàng (nếu có)
        $failedSchedules = DeliverySchedule::query()
            ->with(['subscription:id,package_name,weight_per_delivery,customer_id', 'subscription.customer:id,full_name,phone'])
            ->where('status', 'that_bai')
            ->orderByDesc('delivery_date')
            ->limit(20)
            ->get()
            ->map(fn (DeliverySchedule $s) => [
                'schedule_id'    => $s->id,
                'delivery_date'  => $s->delivery_date?->toDateString(),
                'package_name'   => $s->subscription?->package_name,
                'weight_kg'      => (float) ($s->subscription?->weight_per_delivery ?? 0),
                'customer_name'  => $s->subscription?->customer?->full_name,
                'customer_phone' => $s->subscription?->customer?->phone,
            ]);

        return response()->json([
            'status'          => 'success',
            'data'            => $orders,
            'schedule_alerts' => $failedSchedules,
        ], 200);
    }

    /**
     * PUT /api/v1/sales/orders/{id}/status
     * Sales duyệt đơn, điều phối đơn vị giao hàng hỏa tốc, hoàn tất giao hàng.
     */
    public function updateOrderStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'order_status'          => ['required', 'in:cho_xac_nhan,da_xac_nhan,dang_giao_hang,da_giao_hang,hoan_thanh,da_huy'],
            'delivery_partner'      => ['nullable', 'string', 'max:50'],
            'delivery_tracking_url' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $updatedOrder = DB::transaction(function () use ($id, $validated) {
                $order = Order::query()->lockForUpdate()->find($id);
                if (!$order) {
                    return null;
                }

                $nextStatus = $validated['order_status'];
                $wasAlreadyPaid = $order->payment_status === 'da_thanh_toan';

                $updatePayload = [
                    'order_status' => $nextStatus,
                ];

                if (!empty($validated['delivery_partner'])) {
                    $updatePayload['delivery_partner'] = trim($validated['delivery_partner']);
                } elseif ($nextStatus === 'dang_giao_hang' && empty($order->delivery_partner)) {
                    $updatePayload['delivery_partner'] = ($order->shipping_type === 'hoa_toc')
                        ? 'Grab'
                        : 'Giao nội bộ nông trại';
                }

                if (!empty($validated['delivery_tracking_url'])) {
                    $updatePayload['delivery_tracking_url'] = trim($validated['delivery_tracking_url']);
                } elseif ($nextStatus === 'dang_giao_hang' && empty($order->delivery_tracking_url)) {
                    $updatePayload['delivery_tracking_url'] = "https://track.organicfarm.vn/express/{$order->order_code}";
                }

                // Khi Sales xác nhận đã giao hoàn tất (da_giao_hang) hoặc hoàn thành (hoan_thanh),
                // cập nhật payment_status COD & cộng Loyalty (chờ khách nhấn Đã nhận hàng để sang hoan_thanh)
                if (in_array($nextStatus, ['da_giao_hang', 'hoan_thanh'], true) && $order->payment_status === 'cho_thanh_toan') {
                    $updatePayload['payment_status'] = 'da_thanh_toan';
                }

                $order->update($updatePayload);

                if (in_array($nextStatus, ['da_giao_hang', 'hoan_thanh'], true) && !$wasAlreadyPaid && (float) $order->total_amount > 0) {
                    $earnedPoints = (int) floor((float) $order->total_amount / 10000);
                    if ($earnedPoints > 0 && $order->customer_id) {
                        User::query()
                            ->where('id', $order->customer_id)
                            ->increment('loyalty_points', $earnedPoints);
                    }
                }

                // Đồng bộ DeliverySchedule nếu đơn thuộc gói Subscription
                if ($order->subscription_id) {
                    if (in_array($nextStatus, ['da_giao_hang', 'hoan_thanh'], true)) {
                        DeliverySchedule::query()
                            ->where('order_id', $order->id)
                            ->update(['status' => 'da_giao']);
                    } elseif ($nextStatus === 'da_huy') {
                        DeliverySchedule::query()
                            ->where('order_id', $order->id)
                            ->update(['status' => 'da_huy']);
                    }
                }

                return $order->fresh();
            });

            if (!$updatedOrder) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Không tìm thấy đơn hàng.',
                ], 404);
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Đã cập nhật trạng thái đơn hàng thành công.',
                'data'    => $updatedOrder,
            ], 200);
        } catch (Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi cập nhật trạng thái đơn hàng: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/v1/sales/subscriptions/generate-orders
     * Cho phép Sales/Admin kích hoạt quét lịch giao gói định kỳ (tương đương Cron-job Thứ 3 & Thứ 6).
     */
    public function generateSubscriptionOrders(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['nullable', 'date'],
        ]);

        $result = $this->subscriptionGenerator->processDueSchedules($validated['date'] ?? null);

        return response()->json([
            'status'  => 'success',
            'message' => "Đã xử lý {$result['processed_count']} lịch đến hạn: tạo {$result['created_count']} đơn hàng mới" .
                ($result['failed_count'] > 0 ? ", {$result['failed_count']} lịch thiếu hàng." : '.'),
            'data'    => $result,
        ], 200);
    }

    /**
     * POST /api/v1/sales/batches/{id}/flash-sale
     * Sales / Admin cấu hình nhanh % giảm giá Xả hàng (Flash Sale) cho lô sắp hết hạn.
     */
    public function configureFlashSale(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'is_flash_sale'    => ['required', 'boolean'],
            'discount_percent' => ['nullable', 'integer', 'min:0', 'max:90'],
        ]);

        $batch = Batch::query()->with('product:id,name,base_price')->find($id);
        if (!$batch) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy lô hàng.',
            ], 404);
        }

        if ($batch->status === 'qua_han' || (float) $batch->current_quantity <= 0) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lô hàng đã hết hạn hoặc hết tồn kho, không thể bật Flash Sale.',
            ], 422);
        }

        $enable = (bool) $validated['is_flash_sale'];
        $discount = $enable ? (int) ($validated['discount_percent'] ?? ($batch->discount_percent ?: 30)) : 0;

        $batch->update([
            'is_flash_sale'    => $enable,
            'discount_percent' => $discount,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => $enable
                ? "Đã bật Flash Sale giảm {$discount}% cho lô {$batch->batch_code}."
                : "Đã tắt Flash Sale cho lô {$batch->batch_code}.",
            'data'    => $batch->fresh(),
        ], 200);
    }

    /**
     * GET /api/v1/sales/complaints
     * Danh sách khiếu nại / yêu cầu đổi trả dành cho Sales/CSKH.
     */
    public function complaints(): JsonResponse
    {
        $complaints = Complaint::query()
            ->with([
                'order:id,order_code,total_amount,order_status,payment_status,delivery_address,created_at',
                'order.items.product:id,name,unit',
                'customer:id,full_name,phone,email',
                'handler:id,full_name',
                'compensationOrder:id,order_code,total_amount,order_status',
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(function (Complaint $c) {
                $evidence = is_array($c->evidence_media_urls) ? $c->evidence_media_urls : [];
                $orderTotal = (float) ($c->order?->total_amount ?? 0);

                return [
                    'id'                      => $c->id,
                    'order_id'                => $c->order_id,
                    'order_code'              => $c->order?->order_code ?? "ORD-#{$c->order_id}",
                    'customer_id'             => $c->customer_id,
                    'customer_name'           => $c->customer?->full_name ?? 'Khách hàng',
                    'customer_phone'          => $c->customer?->phone ?? '',
                    'reason'                  => $c->reason,
                    'evidence_media_urls'     => $evidence,
                    'evidence_url'            => $evidence[0] ?? null,
                    'resolution_type'         => $c->resolution_type,
                    'refund_amount'           => (float) $c->refund_amount,
                    'order_total_amount'      => $orderTotal,
                    'compensation_order_id'   => $c->compensation_order_id,
                    'compensation_order_code' => $c->compensationOrder?->order_code,
                    'sales_note'              => $c->sales_note,
                    'handled_by'              => $c->handler?->full_name,
                    'status'                  => $c->status,
                    'created_at'              => $c->created_at?->toIso8601String(),
                ];
            });

        return response()->json([
            'status' => 'success',
            'data'   => $complaints,
        ], 200);
    }

    /**
     * PUT /api/v1/sales/complaints/{id}/approve
     * Sales duyệt khiếu nại: Hoàn tiền (refund), Giao bù 0đ xuất kho FEFO (compensate), hoặc Từ chối (reject).
     */
    public function approveComplaint(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'action'        => ['required', 'in:refund,compensate,reject'],
            'refund_amount' => ['nullable', 'numeric', 'min:0'],
            'sales_note'    => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $result = DB::transaction(function () use ($request, $validated, $id) {
                $complaint = Complaint::query()
                    ->with(['order.items.product', 'customer'])
                    ->lockForUpdate()
                    ->find($id);

                if (!$complaint) {
                    return ['not_found' => true];
                }

                if (in_array($complaint->status, ['da_hoan_tat', 'tu_choi'], true)) {
                    throw new RuntimeException('Khiếu nại này đã được xử lý trước đó.');
                }

                $action = $validated['action'];
                $salesId = $request->user()->id;

                if ($action === 'refund') {
                    $orderTotal = (float) ($complaint->order?->total_amount ?? 0);
                    $refundAmt = isset($validated['refund_amount'])
                        ? round((float) $validated['refund_amount'], 2)
                        : $orderTotal;

                    $complaint->update([
                        'handled_by_sales_id' => $salesId,
                        'resolution_type'     => 'hoan_tien',
                        'refund_amount'       => $refundAmt,
                        'sales_note'          => trim((string) ($validated['sales_note'] ?? ''))
                            ?: 'Đã duyệt hoàn tiền ' . number_format($refundAmt, 0, ',', '.') . 'đ cho khách hàng.',
                        'status'              => 'da_hoan_tat',
                    ]);

                    if ($complaint->order && $complaint->order->payment_status === 'da_thanh_toan') {
                        $complaint->order->update(['payment_status' => 'da_hoan_tien']);
                    }

                    return [
                        'message'   => 'Đã duyệt hoàn tiền cho khiếu nại #' . $complaint->id . ' thành công!',
                        'complaint' => $complaint->fresh(['order', 'handler']),
                    ];
                }

                if ($action === 'compensate') {
                    $originOrder = $complaint->order;
                    if (!$originOrder) {
                        throw new RuntimeException('Không tìm thấy đơn hàng gốc để tạo đơn giao bù.');
                    }

                    // Gom số lượng theo product_id để xuất kho FEFO giao bù
                    $qtyByProduct = [];
                    foreach ($originOrder->items as $item) {
                        $pid = (int) $item->product_id;
                        $qtyByProduct[$pid] = round(($qtyByProduct[$pid] ?? 0) + (float) $item->quantity, 2);
                    }

                    if (empty($qtyByProduct)) {
                        throw new RuntimeException('Đơn hàng gốc không có sản phẩm nào để tạo đơn giao bù.');
                    }

                    $compItemsPayload = [];
                    foreach ($qtyByProduct as $productId => $qtyNeeded) {
                        $fefoResult = $this->fefoService->exportByFefo($productId, $qtyNeeded);
                        foreach ($fefoResult['allocations'] as $allocation) {
                            $deducted = (float) ($allocation['deducted_quantity'] ?? $allocation['quantity_deducted'] ?? 0);
                            $compItemsPayload[] = [
                                'product_id'  => $productId,
                                'batch_id'    => (int) $allocation['batch_id'],
                                'quantity'    => $deducted,
                                'unit_price'  => 0,
                                'total_price' => 0,
                            ];
                        }
                    }

                    $compCode = 'COMP-' . date('Ymd') . '-' . strtoupper(Str::random(5));

                    $compOrder = Order::query()->create([
                        'order_code'       => $compCode,
                        'customer_id'      => $complaint->customer_id,
                        'subscription_id'  => null,
                        'delivery_address' => $originOrder->delivery_address,
                        'distance_km'      => $originOrder->distance_km,
                        'subtotal'         => 0,
                        'shipping_fee'     => 0,
                        'loyalty_discount' => 0,
                        'total_amount'     => 0,
                        'payment_method'   => $originOrder->payment_method,
                        'payment_status'   => 'da_thanh_toan',
                        'order_status'     => 'da_giao_bu',
                        'delivery_partner' => 'Grab',
                    ]);

                    foreach ($compItemsPayload as $payload) {
                        OrderItem::query()->create(array_merge($payload, [
                            'order_id' => $compOrder->id,
                        ]));
                    }

                    $complaint->update([
                        'handled_by_sales_id'   => $salesId,
                        'resolution_type'       => 'giao_bu_hang',
                        'refund_amount'         => 0,
                        'compensation_order_id' => $compOrder->id,
                        'sales_note'            => trim((string) ($validated['sales_note'] ?? ''))
                            ?: "Đã tạo đơn giao bù 0đ mã {$compOrder->order_code} xuất kho FEFO.",
                        'status'                => 'da_hoan_tat',
                    ]);

                    return [
                        'message'            => "Đã duyệt và tạo đơn giao bù 0đ mã {$compOrder->order_code} (xuất kho FEFO)!",
                        'complaint'          => $complaint->fresh(['order', 'handler', 'compensationOrder']),
                        'compensation_order' => $compOrder->load(['items.product:id,name,unit', 'items.batch:id,batch_code']),
                    ];
                }

                // action === 'reject'
                $complaint->update([
                    'handled_by_sales_id' => $salesId,
                    'resolution_type'     => 'tu_choi',
                    'refund_amount'       => 0,
                    'sales_note'          => trim((string) ($validated['sales_note'] ?? ''))
                        ?: 'Yêu cầu khiếu nại chưa đủ điều kiện áp dụng hoàn tiền/đổi trả.',
                    'status'              => 'tu_choi',
                ]);

                return [
                    'message'   => 'Đã cập nhật từ chối khiếu nại #' . $complaint->id . '.',
                    'complaint' => $complaint->fresh(['order', 'handler']),
                ];
            });

            if (!empty($result['not_found'])) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Không tìm thấy khiếu nại.',
                ], 404);
            }

            return response()->json([
                'status'  => 'success',
                'message' => $result['message'],
                'data'    => $result['complaint'],
            ], 200);
        } catch (RuntimeException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 422);
        } catch (Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi xử lý khiếu nại: ' . $e->getMessage(),
            ], 500);
        }
    }
}
