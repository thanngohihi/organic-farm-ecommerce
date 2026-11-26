<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\FefoWarehouseService;
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
        protected FefoWarehouseService $fefoService
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
            'payment_method'     => ['required', 'in:cod,momo,vnpay'],
            'use_loyalty_points' => ['nullable', 'integer', 'min:0'],
            'items'              => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity'   => ['required', 'numeric', 'min:0.1'],
        ], [
            'delivery_address.required' => 'Vui lòng nhập địa chỉ giao hàng.',
            'distance_km.required'      => 'Vui lòng cung cấp khoảng cách giao hàng.',
            'payment_method.required'   => 'Vui lòng chọn phương thức thanh toán.',
            'items.required'            => 'Giỏ hàng không được để trống.',
        ]);

        try {
            $order = DB::transaction(function () use ($request, $validated) {
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
                $shippingFee = 15000 + (ceil($distanceKm) * 5000);

                $pointsUsed = (int) ($validated['use_loyalty_points'] ?? 0);
                if ($pointsUsed > (int) $customer->loyalty_points) {
                    throw new RuntimeException(
                        "Số điểm Loyalty sử dụng ({$pointsUsed}) vượt quá số điểm hiện có ({$customer->loyalty_points})."
                    );
                }

                $loyaltyDiscount = $pointsUsed * 1000;
                $totalAmount = max(0, ($subtotal + $shippingFee) - $loyaltyDiscount);

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
                    'subtotal'         => $subtotal,
                    'shipping_fee'     => $shippingFee,
                    'loyalty_discount' => $loyaltyDiscount,
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

                return $order->load('items');
            });

            $payUrl = null;
            $qrCodeUrl = null;
            if ($order->payment_method === 'momo') {
                $momoResult = $this->momoService->createPaymentLink($order->order_code, (float) $order->total_amount);
                $payUrl = $momoResult['pay_url'] ?? null;
                $qrCodeUrl = $momoResult['qr_code_url'] ?? null;
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Đặt hàng thành công. Hệ thống tự động xuất kho theo nguyên tắc FEFO.',
                'data'    => [
                    'id'               => $order->id,
                    'order_code'       => $order->order_code,
                    'delivery_address' => $order->delivery_address,
                    'distance_km'      => (float) $order->distance_km,
                    'subtotal'         => (float) $order->subtotal,
                    'shipping_fee'     => (float) $order->shipping_fee,
                    'loyalty_discount' => (float) $order->loyalty_discount,
                    'total_amount'     => (float) $order->total_amount,
                    'payment_method'   => $order->payment_method,
                    'payment_status'   => $order->payment_status,
                    'order_status'     => $order->order_status,
                    'payment_url'      => $payUrl,
                    'qr_code_url'      => $qrCodeUrl,
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
}