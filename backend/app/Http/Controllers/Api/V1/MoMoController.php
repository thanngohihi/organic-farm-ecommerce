<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\MoMoPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MoMoController extends Controller
{
    protected MoMoPaymentService $momoService;

    public function __construct(MoMoPaymentService $momoService)
    {
        $this->momoService = $momoService;
    }

    // =========================================================================
    // API 1: TẠO LINK THANH TOÁN MOMO
    // POST /api/v1/payments/momo/create-payment
    // Middleware: auth:sanctum + role:customer
    // =========================================================================

    /**
     * Nhận order_code và amount từ Frontend (Người 4), gọi MoMo Sandbox,
     * trả về payUrl + qrCodeUrl để khách bấm vào thanh toán.
     */
    public function createPayment(Request $request): JsonResponse
    {
        // 1. Validate
        $validated = $request->validate([
            'order_code' => ['required', 'string', 'max:50'],
            'amount'     => ['required', 'numeric', 'min:1000'],
        ], [
            'order_code.required' => 'Vui lòng cung cấp mã đơn hàng.',
            'amount.required'     => 'Vui lòng cung cấp số tiền cần thanh toán.',
            'amount.min'          => 'Số tiền tối thiểu để thanh toán qua MoMo là 1.000đ.',
        ]);

        // 2. Kiểm tra đơn hàng thực sự tồn tại và thuộc về khách đang đăng nhập
        $order = DB::table('orders')
            ->where('order_code', $validated['order_code'])
            ->where('customer_id', $request->user()->id)
            ->where('payment_status', 'cho_thanh_toan')
            ->first();

        if (! $order) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy đơn hàng hợp lệ hoặc đơn hàng đã được thanh toán.',
            ], 404);
        }

        // 3. Gọi MoMoPaymentService để lấy link thanh toán
        try {
            $result = $this->momoService->createPaymentLink(
                $validated['order_code'],
                (float) $validated['amount']
            );

            Log::info("[MoMo] Tạo link thanh toán cho đơn: {$validated['order_code']}");

            return response()->json([
                'status'  => 'success',
                'message' => 'Tạo link thanh toán MoMo thành công.',
                'data'    => [
                    'order_code'  => $validated['order_code'],
                    'amount'      => (int) $validated['amount'],
                    'pay_url'     => $result['pay_url'],
                    'qr_code_url' => $result['qr_code_url'],
                    'request_id'  => $result['request_id'],
                    'note'        => 'Link thanh toán có hiệu lực trong 15 phút. Vui lòng hoàn tất trước khi hết hạn.',
                ],
            ], 200);

        } catch (\Exception $e) {
            Log::error("[MoMo] Lỗi tạo link thanh toán: " . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Hệ thống tạm thời không thể kết nối cổng thanh toán MoMo. Vui lòng thử lại hoặc chọn phương thức COD.',
            ], 503);
        }
    }

    // =========================================================================
    // API 2: NHẬN IPN CALLBACK TỪ MOMO (Webhook)
    // POST /api/v1/payments/momo/ipn-callback
    // Middleware: KHÔNG có (MoMo gọi trực tiếp từ server của họ)
    // =========================================================================

    /**
     * MoMo tự động POST đến endpoint này sau khi khách hoàn tất thanh toán.
     * Nhiệm vụ: Xác thực chữ ký → Cập nhật trạng thái đơn hàng trong DB.
     * Luôn trả về HTTP 200 để MoMo biết đã nhận (nếu không MoMo sẽ retry nhiều lần).
     */
    public function ipnCallback(Request $request): JsonResponse
    {
        $ipnData = $request->all();

        Log::info("[MoMo IPN] Nhận webhook từ MoMo", ['data' => $ipnData]);

        // 1. Xác thực chữ ký từ MoMo
        $result = $this->momoService->verifyIpnCallback($ipnData);

        if (! $result['is_valid']) {
            Log::warning("[MoMo IPN] Chữ ký HMAC không hợp lệ. Có thể là request giả mạo.");
            // Vẫn trả 200 để tránh MoMo retry không cần thiết
            return response()->json(['message' => 'Received'], 200);
        }

        $orderCode = $result['order_code'];
        $transId   = $result['trans_id'];
        $isPaid    = $result['is_paid'];

        // 2. Cập nhật trạng thái đơn hàng trong DB
        try {
            DB::transaction(function () use ($orderCode, $transId, $isPaid, $result) {
                $order = DB::table('orders')
                    ->where('order_code', $orderCode)
                    ->first();

                if (! $order) {
                    Log::warning("[MoMo IPN] Không tìm thấy đơn hàng: {$orderCode}");
                    return;
                }

                // Tránh xử lý đơn đã được cập nhật trước đó (idempotent)
                if ($order->payment_status !== 'cho_thanh_toan') {
                    Log::info("[MoMo IPN] Đơn {$orderCode} đã được xử lý trước đó. Bỏ qua.");
                    return;
                }

                if ($isPaid) {
                    // Thanh toán thành công → cập nhật payment_status & lưu mã giao dịch MoMo
                    DB::table('orders')
                        ->where('order_code', $orderCode)
                        ->update([
                            'payment_status' => 'da_thanh_toan',
                            'momo_trans_id'  => $transId,
                            'order_status'   => 'da_xac_nhan',
                            'updated_at'     => now(),
                        ]);

                    Log::info("[MoMo IPN] Đơn {$orderCode} thanh toán THÀNH CÔNG. MoMo Trans ID: {$transId}");
                } else {
                    // Thanh toán thất bại / bị hủy → chuyển trạng thái đơn sang thất bại
                    DB::table('orders')
                        ->where('order_code', $orderCode)
                        ->update([
                            'payment_status' => 'that_bai',
                            'momo_trans_id'  => $transId ?: null,
                            'updated_at'     => now(),
                        ]);

                    Log::info("[MoMo IPN] Đơn {$orderCode} thanh toán THẤT BẠI/HỦY. Message: {$result['message']}");
                }
            });

        } catch (\Exception $e) {
            Log::error("[MoMo IPN] Lỗi khi cập nhật DB: " . $e->getMessage(), [
                'order_code' => $orderCode,
                'trans_id'   => $transId,
            ]);
        }

        // 3. Luôn trả về HTTP 200 để MoMo biết đã nhận thành công
        return response()->json(['message' => 'Received'], 200);
    }
}
