<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * POST /api/v1/shipping/calculate-km
     * Tính phí giao hàng dựa trên khoảng cách km
     */
    public function calculateShipping(Request $request)
    {
        $address = $request->input('address', '');
        $distance = rand(2, 8); // Giả lập khoảng cách 2-8km
        $shippingFee = $distance * 5000;

        return response()->json([
            'status' => 'success',
            'distance_km' => $distance,
            'shipping_fee' => $shippingFee
        ]);
    }

    /**
     * POST /api/v1/orders/checkout-single
     * Đặt hàng thật: Tạo order trong MySQL & trừ kho FEFO trong bảng batches
     */
    public function checkoutSingle(Request $request)
    {
        $address = $request->input('address');
        $cartItems = $request->input('cart_items', []);
        $shippingFee = $request->input('shipping_fee', 0);

        if (empty($cartItems)) {
            return response()->json(['status' => 'error', 'message' => 'Giỏ hàng trống!'], 400);
        }

        DB::beginTransaction();
        try {
            $customerId = 1; // Khách hàng mẫu ID = 1
            $subtotal = 0;

            foreach ($cartItems as $item) {
                $subtotal += $item['price'] * $item['quantity'];
            }

            $totalAmount = $subtotal + $shippingFee;
            $orderCode = 'ORD-' . time() . rand(100, 999);

            // 1. Tạo Đơn hàng trong bảng orders
            $orderId = DB::table('orders')->insertGetId([
                'order_code' => $orderCode,
                'customer_id' => $customerId,
                'delivery_address' => $address,
                'distance_km' => round($shippingFee / 5000, 2),
                'subtotal' => $subtotal,
                'shipping_fee' => $shippingFee,
                'total_amount' => $totalAmount,
                'payment_method' => 'cod',
                'payment_status' => 'cho_thanh_toan',
                'order_status' => 'cho_xac_nhan',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // 2. Tạo Chi tiết đơn hàng trong order_items & Trừ kho FEFO
            foreach ($cartItems as $item) {
                $productId = $item['id'];
                $qtyNeeded = (float)$item['quantity'];

                $batch = DB::table('batches')
                    ->where('product_id', $productId)
                    ->where('status', 'con_hang')
                    ->where('current_quantity', '>', 0)
                    ->orderBy('expiry_date', 'asc')
                    ->first();

                $batchId = $batch ? $batch->id : 1;

                DB::table('order_items')->insert([
                    'order_id' => $orderId,
                    'product_id' => $productId,
                    'batch_id' => $batchId,
                    'quantity' => $qtyNeeded,
                    'unit_price' => $item['price'],
                    'total_price' => $item['price'] * $qtyNeeded,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Trừ tồn kho lô hàng
                if ($batch) {
                    $newQty = max(0, $batch->current_quantity - $qtyNeeded);
                    $newStatus = $newQty == 0 ? 'het_hang' : $batch->status;

                    DB::table('batches')
                        ->where('id', $batch->id)
                        ->update([
                            'current_quantity' => $newQty,
                            'status' => $newStatus,
                            'updated_at' => now()
                        ]);
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'order_id' => $orderCode,
                'message' => 'Đặt hàng thành công! Đơn hàng đã được lưu vào CSDL MySQL và tự động trừ kho FEFO.'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Lỗi khi tạo đơn hàng: ' . $e->getMessage()
            ], 500);
        }
    }
}
