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

        // 2. Cập nhật trạng thái đơn hàng hoặc gói định kỳ trong DB
        try {
            DB::transaction(function () use ($orderCode, $transId, $isPaid, $result) {
                $target = $this->resolveMoMoTarget($orderCode, true);

                if (!$target) {
                    Log::warning("[MoMo IPN] Không tìm thấy đơn hàng hoặc gói định kỳ: {$orderCode}");
                    return;
                }

                // Tránh xử lý bản ghi đã được cập nhật trước đó (idempotent)
                if ($target['record']->payment_status !== 'cho_thanh_toan') {
                    Log::info("[MoMo IPN] {$target['label']} {$orderCode} đã được xử lý trước đó. Bỏ qua.");
                    return;
                }

                if ($isPaid) {
                    $earnedPoints = $this->markMoMoTargetPaid($target, $transId);
                    Log::info("[MoMo IPN] {$target['label']} {$orderCode} thanh toán THÀNH CÔNG. MoMo Trans ID: {$transId}. Cộng {$earnedPoints} điểm Loyalty.");
                } else {
                    DB::table($target['table'])
                        ->where('id', $target['record']->id)
                        ->update([
                            'payment_status' => 'that_bai',
                            'momo_trans_id'  => $transId ?: null,
                            'updated_at'     => now(),
                        ]);

                    Log::info("[MoMo IPN] {$target['label']} {$orderCode} thanh toán THẤT BẠI/HỦY. Message: {$result['message']}");
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

    /**
     * GET /api/v1/momo-mock-checkout
     * Trang xác nhận thanh toán MoMo Demo nội bộ khi chưa cấu hình Sandbox Key.
     */
    public function mockCheckoutPage(Request $request)
    {
        $orderCode = trim((string) $request->query('order_code', ''));
        $target = $orderCode !== '' ? $this->resolveMoMoTarget($orderCode) : null;

        if (!$target) {
            return response(
                '<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>Không tìm thấy đơn hàng hoặc gói định kỳ MoMo</h2></body></html>',
                404
            )->header('Content-Type', 'text/html; charset=UTF-8');
        }

        $frontendUrl = e($this->resolveSafeFrontendUrl($request));
        $safeCode = e($target['code']);
        $safeLabel = e($target['label']);
        $amountFormatted = number_format($target['amount'], 0, ',', '.');
        $alreadyPaid = $target['record']->payment_status === 'da_thanh_toan';
        $confirmUrl = e(url('/api/v1/momo-mock-checkout/confirm'));

        $body = $alreadyPaid
            ? "<p style='color:#047857;font-weight:bold'>{$safeLabel} {$safeCode} đã được thanh toán thành công!</p>
               <a href='{$frontendUrl}' style='display:inline-block;margin-top:16px;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold'>Quay lại cửa hàng</a>"
            : "<form method='POST' action='{$confirmUrl}'>
                 <input type='hidden' name='order_code' value='{$safeCode}' />
                 <input type='hidden' name='return_url' value='{$frontendUrl}' />
                 <button type='submit' style='padding:14px 28px;background:#ae2070;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:bold;cursor:pointer'>Xác nhận thanh toán MoMo ({$amountFormatted}đ)</button>
               </form>
               <a href='{$frontendUrl}' style='display:inline-block;margin-top:16px;font-size:13px;color:#6b7280;text-decoration:underline'>Quay lại cửa hàng</a>";

        $html = "<!DOCTYPE html><html lang='vi'><head><meta charset='UTF-8'><title>MoMo Demo Checkout</title></head>
        <body style='font-family:system-ui,sans-serif;background:#fdf2f8;padding:40px 16px;margin:0'>
          <div style='max-width:440px;margin:0 auto;background:#fff;border-radius:20px;padding:28px;text-align:center;box-shadow:0 10px 30px rgba(174,32,112,.12)'>
            <div style='display:inline-block;padding:8px 16px;border-radius:999px;background:#fce7f3;color:#9d174d;font-weight:700;font-size:12px'>CỔNG THANH TOÁN MOMO DEMO</div>
            <h2 style='margin:16px 0 8px;color:#111827'>{$safeLabel} #{$safeCode}</h2>
            <p style='margin:0 0 24px;font-size:28px;font-weight:800;color:#ae2070'>{$amountFormatted}đ</p>
            {$body}
          </div>
        </body></html>";

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * POST /api/v1/momo-mock-checkout/confirm
     * Xác nhận thanh toán MoMo Demo: đánh dấu đã thanh toán & cộng điểm Loyalty.
     */
    public function confirmMockCheckout(Request $request)
    {
        $orderCode = trim((string) $request->input('order_code', ''));
        $frontendUrl = e($this->resolveSafeFrontendUrl($request));

        $paidLabel = DB::transaction(function () use ($orderCode) {
            $target = $orderCode !== '' ? $this->resolveMoMoTarget($orderCode, true) : null;
            if (!$target) {
                return null;
            }
            if ($target['record']->payment_status === 'cho_thanh_toan') {
                $this->markMoMoTargetPaid($target, 'MOMO_DEMO_' . now()->format('YmdHis'));
            }
            return $target['label'];
        });

        if ($paidLabel === null) {
            return response('Không tìm thấy đơn hàng hoặc gói định kỳ.', 404);
        }

        $safeCode = e($orderCode);
        $safeLabel = e($paidLabel);
        $html = "<!DOCTYPE html><html lang='vi'><head><meta charset='UTF-8'><title>Thanh toán thành công</title></head>
        <body style='font-family:system-ui,sans-serif;background:#ecfdf5;padding:40px 16px;margin:0'>
          <div style='max-width:440px;margin:0 auto;background:#fff;border-radius:20px;padding:32px;text-align:center;box-shadow:0 10px 30px rgba(5,150,105,.12)'>
            <h2 style='color:#065f46;margin:0 0 8px'>Thanh toán MoMo thành công!</h2>
            <p style='color:#4b5563;font-size:14px;margin:0 0 24px'>{$safeLabel} <strong>#{$safeCode}</strong> đã được xác nhận và cộng điểm Loyalty vào tài khoản của bạn.</p>
            <a href='{$frontendUrl}' style='display:inline-block;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold'>Quay về cửa hàng</a>
          </div>
        </body></html>";

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * Tìm bản ghi MoMo theo mã đơn lẻ (ORD-...) hoặc mã gói định kỳ (SUBPKG-...).
     */
    private function resolveMoMoTarget(string $code, bool $lockForUpdate = false): ?array
    {
        $orderQuery = DB::table('orders')->where('order_code', $code);
        if ($lockForUpdate) {
            $orderQuery->lockForUpdate();
        }
        $order = $orderQuery->first();
        if ($order) {
            return [
                'table'  => 'orders',
                'code'   => $order->order_code,
                'label'  => 'Đơn hàng',
                'amount' => (float) $order->total_amount,
                'record' => $order,
            ];
        }

        $subQuery = DB::table('subscriptions')->where('subscription_code', $code);
        if ($lockForUpdate) {
            $subQuery->lockForUpdate();
        }
        $subscription = $subQuery->first();
        if ($subscription) {
            return [
                'table'  => 'subscriptions',
                'code'   => $subscription->subscription_code,
                'label'  => 'Gói định kỳ',
                'amount' => (float) $subscription->total_price,
                'record' => $subscription,
            ];
        }

        return null;
    }

    /**
     * Đánh dấu đơn hoặc gói định kỳ đã thanh toán MoMo và cộng điểm Loyalty (10.000đ = 1 điểm).
     */
    private function markMoMoTargetPaid(array $target, string $transId): int
    {
        $updatePayload = [
            'payment_status' => 'da_thanh_toan',
            'momo_trans_id'  => $transId,
            'updated_at'     => now(),
        ];

        if ($target['table'] === 'orders' && ($target['record']->order_status ?? 'cho_xac_nhan') === 'cho_xac_nhan') {
            $updatePayload['order_status'] = 'da_xac_nhan';
        }

        DB::table($target['table'])
            ->where('id', $target['record']->id)
            ->update($updatePayload);

        $earnedPoints = (int) floor($target['amount'] / 10000);
        if ($earnedPoints > 0 && !empty($target['record']->customer_id)) {
            DB::table('users')
                ->where('id', $target['record']->customer_id)
                ->increment('loyalty_points', $earnedPoints);
        }

        return $earnedPoints;
    }

    /**
     * Chỉ cho phép quay về origin local (localhost / 127.0.0.1) để giữ đúng phiên đăng nhập Frontend.
     */
    private function resolveSafeFrontendUrl(Request $request): string
    {
        $default = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
        $candidate = trim((string) ($request->input('return_url') ?: $request->header('referer', '')));
        if ($candidate !== '') {
            $parsed = parse_url($candidate);
            $scheme = strtolower((string) ($parsed['scheme'] ?? ''));
            $host = strtolower((string) ($parsed['host'] ?? ''));
            if (in_array($scheme, ['http', 'https'], true) && in_array($host, ['localhost', '127.0.0.1'], true)) {
                $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';
                return "{$scheme}://{$host}{$port}";
            }
        }
        return $default;
    }
}
