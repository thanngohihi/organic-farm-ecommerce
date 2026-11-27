<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\CustomerVoucher;
use App\Models\DeliverySchedule;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\FefoWarehouseService;
use App\Services\GoogleMapsShippingService;
use App\Services\MoMoPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class OrderController extends Controller
{
    public function __construct(
        protected MoMoPaymentService $momoService,
        protected FefoWarehouseService $fefoService,
        protected GoogleMapsShippingService $shippingService
    ) {}

    /**
     * API: Đặt đơn hàng mua lẻ (Checkout Single - FEFO)
     * Endpoint: POST /api/v1/customer/orders/checkout-single
     */
    public function checkoutSingle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'delivery_address'   => ['required', 'string', 'max:500'],
            'distance_km'        => ['required', 'numeric', 'min:0'],
            'shipping_type'      => ['nullable', 'in:binh_thuong,hoa_toc'],
            'payment_method'     => ['required', 'in:cod,momo,vnpay'],
            'use_loyalty_points' => ['nullable', 'integer', 'min:0'],
            'voucher_code'       => ['nullable', 'string', 'max:30'],
            'items'              => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity'   => ['required', 'numeric', 'min:0.1'],
        ], [
            'delivery_address.required' => 'Vui lòng nhập địa chỉ giao hàng.',
            'distance_km.required'      => 'Vui lòng cung cấp khoảng cách giao hàng.',
            'shipping_type.in'          => 'Hình thức giao hàng chỉ hỗ trợ bình thường hoặc hỏa tốc.',
            'payment_method.required'   => 'Vui lòng chọn phương thức thanh toán.',
            'items.required'            => 'Giỏ hàng không được để trống.',
        ]);

        try {
            $checkoutData = DB::transaction(function () use ($request, $validated) {
                $customer = User::query()->lockForUpdate()->findOrFail($request->user()->id);

                $subtotal = 0.0;
                $orderItemsPayload = [];

                foreach ($validated['items'] as $item) {
                    $product = Product::query()
                        ->where('is_active', true)
                        ->find($item['product_id']);

                    if (!$product) {
                        throw new RuntimeException("Sản phẩm ID {$item['product_id']} không tồn tại hoặc đã ngừng kinh doanh.");
                    }

                    $quantity = round((float) $item['quantity'], 2);
                    $fefoResult = $this->fefoService->exportByFefo($product->id, $quantity);
                    $basePrice = (float) $product->base_price;

                    foreach ($fefoResult['allocations'] as $allocation) {
                        $discount = ($allocation['is_flash_sale'] && $allocation['discount_percent'] > 0)
                            ? (int) $allocation['discount_percent']
                            : 0;
                        $unitPrice = $discount > 0
                            ? round($basePrice * (1 - ($discount / 100)), 0)
                            : $basePrice;
                        $deductedQty = (float) $allocation['deducted_quantity'];
                        $lineTotal = round($unitPrice * $deductedQty, 2);

                        $subtotal += $lineTotal;

                        $orderItemsPayload[] = [
                            'product_id'  => $product->id,
                            'batch_id'    => $allocation['batch_id'],
                            'quantity'    => $deductedQty,
                            'unit_price'  => $unitPrice,
                            'total_price' => $lineTotal,
                        ];
                    }
                }

                $subtotal = round($subtotal, 2);
                $distanceKm = round((float) $validated['distance_km'], 2);
                $shippingType = $this->shippingService->normalizeShippingType($validated['shipping_type'] ?? 'binh_thuong');
                $shippingFee = $this->shippingService->calculateFeeByDistance($distanceKm, $shippingType);

                $pointsUsed = (int) ($validated['use_loyalty_points'] ?? 0);
                if ($pointsUsed > (int) $customer->loyalty_points) {
                    throw new RuntimeException(
                        "Số điểm Loyalty sử dụng ({$pointsUsed}) vượt quá số điểm hiện có ({$customer->loyalty_points})."
                    );
                }

                $loyaltyDiscount = $pointsUsed * 1000;
                $voucherDiscount = 0.0;
                $appliedVoucher = null;
                $giftNote = null;

                if (!empty($validated['voucher_code'])) {
                    $voucherCode = trim($validated['voucher_code']);
                    $appliedVoucher = CustomerVoucher::query()
                        ->with('giftProduct')
                        ->where('voucher_code', $voucherCode)
                        ->where('customer_id', $customer->id)
                        ->lockForUpdate()
                        ->first();

                    if (!$appliedVoucher) {
                        throw new RuntimeException("Mã voucher \"{$voucherCode}\" không tồn tại hoặc không thuộc tài khoản của bạn.");
                    }

                    if ($appliedVoucher->status !== 'chua_dung') {
                        throw new RuntimeException("Mã voucher \"{$voucherCode}\" đã được sử dụng hoặc đã hết hạn.");
                    }

                    if ($appliedVoucher->voucher_type === 'free_ship') {
                        $voucherDiscount = min($shippingFee, (float) $appliedVoucher->discount_amount);
                    } elseif ($appliedVoucher->voucher_type === 'percent_discount') {
                        $voucherDiscount = min(50000.0, round($subtotal * 0.10, 0));
                    } elseif ($appliedVoucher->voucher_type === 'free_gift') {
                        $giftProduct = $appliedVoucher->giftProduct;
                        if (!$giftProduct || !$giftProduct->is_active) {
                            $giftProduct = Product::query()
                                ->where('is_active', true)
                                ->where('name', 'like', '%Cà Chua%')
                                ->first()
                                ?? Product::query()->where('is_active', true)->first();
                        }

                        if (!$giftProduct) {
                            throw new RuntimeException('Hiện không tìm thấy sản phẩm quà tặng khả dụng để áp dụng voucher.');
                        }

                        $giftFefo = $this->fefoService->exportByFefo($giftProduct->id, 1.0);
                        foreach ($giftFefo['allocations'] as $allocation) {
                            $orderItemsPayload[] = [
                                'product_id'  => $giftProduct->id,
                                'batch_id'    => $allocation['batch_id'],
                                'quantity'    => (float) $allocation['deducted_quantity'],
                                'unit_price'  => 0,
                                'total_price' => 0,
                            ];
                        }

                        $giftNote = "Tặng kèm 1 {$giftProduct->unit} {$giftProduct->name} (0đ - xuất kho FEFO)";
                    }
                }

                $totalDiscount = round($loyaltyDiscount + $voucherDiscount, 2);
                $totalAmount = max(0, ($subtotal + $shippingFee) - $totalDiscount);

                if ($pointsUsed > 0) {
                    $customer->loyalty_points = max(0, (int) $customer->loyalty_points - $pointsUsed);
                    $customer->save();
                }

                $orderCode = 'ORD-' . date('Ymd') . '-' . strtoupper(Str::random(6));

                $order = Order::query()->create([
                    'customer_id'      => $customer->id,
                    'order_code'       => $orderCode,
                    'delivery_address' => $validated['delivery_address'],
                    'distance_km'      => $distanceKm,
                    'shipping_type'    => $shippingType,
                    'subtotal'         => $subtotal,
                    'shipping_fee'     => $shippingFee,
                    'loyalty_discount' => $totalDiscount,
                    'total_amount'     => $totalAmount,
                    'payment_method'   => $validated['payment_method'],
                    'payment_status'   => 'cho_thanh_toan',
                    'order_status'     => 'cho_xac_nhan',
                ]);

                foreach ($orderItemsPayload as $itemPayload) {
                    OrderItem::query()->create(array_merge($itemPayload, [
                        'order_id' => $order->id,
                    ]));
                }

                if ($appliedVoucher) {
                    $appliedVoucher->status   = 'da_dung';
                    $appliedVoucher->order_id = $order->id;
                    $appliedVoucher->used_at  = now();
                    $appliedVoucher->save();
                }

                return [
                    'order'           => $order->load(['items.product:id,name,unit', 'items.batch:id,batch_code']),
                    'applied_voucher' => $appliedVoucher ? [
                        'voucher_code'    => $appliedVoucher->voucher_code,
                        'voucher_name'    => $appliedVoucher->voucher_name,
                        'voucher_type'    => $appliedVoucher->voucher_type,
                        'discount_amount' => $voucherDiscount,
                        'gift_note'       => $giftNote,
                    ] : null,
                ];
            });

            $order = $checkoutData['order'];

            $payUrl = null;
            $qrCodeUrl = null;
            if ($order->payment_method === 'momo') {
                $momoResult = $this->momoService->createPaymentLink($order->order_code, (float) $order->total_amount);
                $payUrl = $momoResult['pay_url'] ?? null;
                $qrCodeUrl = $momoResult['qr_code_url'] ?? null;
            }

            $orderMessage = $order->payment_method === 'momo'
                ? 'Đã khởi tạo giao dịch MoMo. Vui lòng hoàn tất thanh toán để xác nhận đơn hàng.'
                : 'Đặt hàng thành công! Đơn hàng của bạn đã được ghi nhận.';

            return response()->json([
                'status'  => 'success',
                'message' => $orderMessage,
                'data'    => [
                    'id'               => $order->id,
                    'order_code'       => $order->order_code,
                    'delivery_address' => $order->delivery_address,
                    'distance_km'      => (float) $order->distance_km,
                    'shipping_type'    => $order->shipping_type,
                    'subtotal'         => (float) $order->subtotal,
                    'shipping_fee'     => (float) $order->shipping_fee,
                    'loyalty_discount' => (float) $order->loyalty_discount,
                    'total_amount'     => (float) $order->total_amount,
                    'payment_method'   => $order->payment_method,
                    'payment_status'   => $order->payment_status,
                    'order_status'     => $order->order_status,
                    'payment_url'      => $payUrl,
                    'qr_code_url'      => $qrCodeUrl,
                    'applied_voucher'  => $checkoutData['applied_voucher'],
                    'items'            => $order->items,
                ],
            ], 201);
        } catch (RuntimeException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 422);
        } catch (Throwable $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi xử lý đặt hàng: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/v1/customer/orders/status/{orderCode}
     * Kiểm tra trạng thái thanh toán MoMo & xử lý đơn hàng.
     */
    public function orderStatusByCode(Request $request, string $orderCode): JsonResponse
    {
        $order = Order::query()
            ->with(['items.product:id,name,unit', 'items.batch:id,batch_code'])
            ->where('order_code', trim($orderCode))
            ->where('customer_id', $request->user()->id)
            ->first();

        if (!$order) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy đơn hàng.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $order,
        ], 200);
    }

    /**
     * POST /api/v1/customer/orders/{orderCode}/cancel-pending-momo
     * Hủy giao dịch MoMo chưa thanh toán, hoàn lại tồn kho FEFO, voucher & điểm Loyalty đã giữ.
     */
    public function cancelPendingMoMo(Request $request, string $orderCode): JsonResponse
    {
        $order = Order::query()
            ->where('order_code', trim($orderCode))
            ->where('customer_id', $request->user()->id)
            ->first();

        if (!$order) {
            return response()->json(['status' => 'error', 'message' => 'Không tìm thấy đơn hàng.'], 404);
        }

        if ($order->payment_method !== 'momo' || $order->payment_status !== 'cho_thanh_toan') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Chỉ có thể hủy giao dịch MoMo đang chờ thanh toán.',
            ], 422);
        }

        DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()->with('items')->lockForUpdate()->findOrFail($order->id);

            foreach ($lockedOrder->items as $item) {
                $batch = Batch::query()->lockForUpdate()->find($item->batch_id);
                if ($batch) {
                    $batch->current_quantity = round((float) $batch->current_quantity + (float) $item->quantity, 2);
                    if ($batch->status === 'het_hang' && $batch->current_quantity > 0) {
                        $batch->status = ($batch->expiry_date && $batch->expiry_date->lte(now()->addDays(2)))
                            ? 'sap_het_han'
                            : 'con_hang';
                    }
                    $batch->save();
                }
            }

            if ((float) $lockedOrder->loyalty_discount > 0 && $lockedOrder->customer_id) {
                $refundPoints = intdiv((int) round((float) $lockedOrder->loyalty_discount), 1000);
                if ($refundPoints > 0) {
                    User::query()->where('id', $lockedOrder->customer_id)->increment('loyalty_points', $refundPoints);
                }
            }

            CustomerVoucher::query()
                ->where('order_id', $lockedOrder->id)
                ->update([
                    'status'   => 'chua_dung',
                    'order_id' => null,
                    'used_at'  => null,
                ]);

            $lockedOrder->update([
                'order_status'   => 'da_huy',
                'payment_status' => 'that_bai',
            ]);
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã hủy giao dịch MoMo chưa thanh toán và hoàn lại giỏ hàng cho bạn.',
        ], 200);
    }

    /**
     * POST /api/v1/customer/orders/{orderCode}/confirm-received
     * Khách hàng chỉ được xác nhận đã nhận hàng sau khi Sales đã nhấn Xác nhận đã giao hoàn tất (da_giao_hang).
     */
    public function confirmReceived(Request $request, string $orderCode): JsonResponse
    {
        $order = Order::query()
            ->where('order_code', trim($orderCode))
            ->where('customer_id', $request->user()->id)
            ->first();

        if (!$order) {
            return response()->json(['status' => 'error', 'message' => 'Không tìm thấy đơn hàng.'], 404);
        }

        if ($order->order_status !== 'da_giao_hang') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Chỉ có thể nhấn "Đã nhận hàng" sau khi Sales đã xác nhận giao hàng hoàn tất.',
            ], 422);
        }

        $updated = DB::transaction(function () use ($order) {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);
            $wasPaid = $locked->payment_status === 'da_thanh_toan';

            $locked->order_status = 'hoan_thanh';
            if ($locked->payment_status === 'cho_thanh_toan') {
                $locked->payment_status = 'da_thanh_toan';
            }
            $locked->save();

            if (!$wasPaid && (float) $locked->total_amount > 0 && $locked->customer_id) {
                $earnedPoints = (int) floor((float) $locked->total_amount / 10000);
                if ($earnedPoints > 0) {
                    User::query()->where('id', $locked->customer_id)->increment('loyalty_points', $earnedPoints);
                }
            }

            if ($locked->subscription_id) {
                DeliverySchedule::query()
                    ->where('order_id', $locked->id)
                    ->update(['status' => 'da_giao']);
            }

            return $locked->fresh();
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã xác nhận nhận hàng thành công!',
            'data'    => $updated,
        ], 200);
    }
}