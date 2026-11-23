<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MoMoPaymentService
{
    //Thông tin xác thực Sandbox MoMo đọc từ config/momo.php
    protected string $partnerCode;
    protected string $accessKey;
    protected string $secretKey;
    protected string $endpoint;
    protected string $ipnUrl;
    protected string $redirectUrl;

    public function __construct()
    {
        $this->partnerCode  = config('momo.partner_code', '');
        $this->accessKey    = config('momo.access_key', '');
        $this->secretKey    = config('momo.secret_key', '');
        $this->endpoint     = config('momo.endpoint', 'https://test-payment.momo.vn/v2/gateway/api/create');
        $this->ipnUrl       = config('momo.ipn_url', url('/api/v1/payments/momo/ipn-callback'));
        $this->redirectUrl  = config('momo.redirect_url', url('/payment/momo/result'));
    }

    // == 1. TẠO LINK THANH TOÁN MOMO (Gọi từ OrderController) ==

    /**
     * Gọi API MoMo Sandbox để lấy link thanh toán (payUrl) và mã QR.
     *
     * @param  string $orderCode  Mã đơn hàng duy nhất (VD: ORD-20261120-1234)
     * @param  float  $amount     Số tiền thanh toán (VND, không có chữ số thập phân)
     * @return array{pay_url: string, qr_code_url: string, request_id: string}
     */
    public function createPaymentLink(string $orderCode, float $amount): array
    {
        // 1. Nếu chưa cấu hình MoMo Sandbox → trả về URL mock để Frontend demo trước
        if (empty($this->partnerCode) || empty($this->accessKey) || empty($this->secretKey)) {
            Log::info("[MoMo] Chưa cấu hình Sandbox. Trả về mock URL cho đơn: {$orderCode}");
            return $this->mockPaymentResponse($orderCode, (int) $amount);
        }

        $requestId   = $orderCode . '_' . time();
        $orderInfo   = "Thanh toán đơn hàng Nông Sản Hữu Cơ #{$orderCode}";
        $requestType = 'captureWallet';
        $extraData   = '';

        // 2. Tạo chữ ký HMAC-SHA256
        $rawHash = "accessKey={$this->accessKey}"
                 . "&amount={$amount}"
                 . "&extraData={$extraData}"
                 . "&ipnUrl={$this->ipnUrl}"
                 . "&orderId={$orderCode}"
                 . "&orderInfo={$orderInfo}"
                 . "&partnerCode={$this->partnerCode}"
                 . "&redirectUrl={$this->redirectUrl}"
                 . "&requestId={$requestId}"
                 . "&requestType={$requestType}";

        $signature = hash_hmac('sha256', $rawHash, $this->secretKey);

        // 3. Gọi API Sandbox MoMo
        $payload = [
            'partnerCode' => $this->partnerCode,
            'partnerName' => 'Organic Farm E-Commerce',
            'storeId'     => 'OrganicFarmStore',
            'requestId'   => $requestId,
            'amount'      => (int) $amount,
            'orderId'     => $orderCode,
            'orderInfo'   => $orderInfo,
            'redirectUrl' => $this->redirectUrl,
            'ipnUrl'      => $this->ipnUrl,
            'lang'        => 'vi',
            'extraData'   => $extraData,
            'requestType' => $requestType,
            'signature'   => $signature,
        ];

        try {
            $response = Http::timeout(15)->post($this->endpoint, $payload)->json();

            if (isset($response['resultCode']) && $response['resultCode'] === 0) {
                Log::info("[MoMo] Tạo link thanh toán thành công cho đơn: {$orderCode}");
                return [
                    'pay_url'    => $response['payUrl']    ?? '',
                    'qr_code_url' => $response['qrCodeUrl'] ?? '',
                    'request_id' => $requestId,
                ];
            }

            // MoMo trả về lỗi (ví dụ: thông tin sai, hết hạn token...)
            Log::error("[MoMo] Lỗi từ API Sandbox", [
                'order_code'  => $orderCode,
                'result_code' => $response['resultCode'] ?? 'N/A',
                'message'     => $response['message'] ?? 'Unknown',
            ]);

            // Fallback: trả về mock URL để không làm gián đoạn luồng đặt hàng
            return $this->mockPaymentResponse($orderCode, (int) $amount);

        } catch (\Exception $e) {
            Log::error("[MoMo] Lỗi kết nối đến Sandbox MoMo: " . $e->getMessage());
            return $this->mockPaymentResponse($orderCode, (int) $amount);
        }
    }

    // == 2. XỬ LÝ IPN CALLBACK (MoMo gọi vào sau khi khách thanh toán xong) ==

    /**
     * Xác thực chữ ký HMAC-SHA256 từ MoMo IPN và trả về trạng thái thanh toán.
     *
     * @param  array $ipnData  Toàn bộ payload JSON từ MoMo IPN gửi đến
     * @return array{is_valid: bool, is_paid: bool, order_code: string, trans_id: string, message: string}
     */
    public function verifyIpnCallback(array $ipnData): array
    {
        // 1. Lấy các trường cần thiết từ payload IPN
        $partnerCode  = $ipnData['partnerCode']  ?? '';
        $orderId      = $ipnData['orderId']       ?? '';
        $requestId    = $ipnData['requestId']     ?? '';
        $amount       = $ipnData['amount']        ?? 0;
        $orderInfo    = $ipnData['orderInfo']     ?? '';
        $orderType    = $ipnData['orderType']     ?? '';
        $transId      = $ipnData['transId']       ?? '';
        $resultCode   = $ipnData['resultCode']    ?? -1;
        $message      = $ipnData['message']       ?? '';
        $payType      = $ipnData['payType']       ?? '';
        $responseTime = $ipnData['responseTime']  ?? '';
        $extraData    = $ipnData['extraData']     ?? '';
        $receivedSig  = $ipnData['signature']     ?? '';

        // 2. Tái tạo chuỗi raw hash và ký lại bằng Secret Key của mình
        $rawHash = "accessKey={$this->accessKey}"
                 . "&amount={$amount}"
                 . "&extraData={$extraData}"
                 . "&message={$message}"
                 . "&orderId={$orderId}"
                 . "&orderInfo={$orderInfo}"
                 . "&orderType={$orderType}"
                 . "&partnerCode={$partnerCode}"
                 . "&payType={$payType}"
                 . "&requestId={$requestId}"
                 . "&responseTime={$responseTime}"
                 . "&resultCode={$resultCode}"
                 . "&transId={$transId}";

        $expectedSig = hash_hmac('sha256', $rawHash, $this->secretKey);

        // 3. So sánh chữ ký (dùng hash_equals để tránh timing attack)
        $isValid = hash_equals($expectedSig, $receivedSig);

        if (!$isValid) {
            Log::warning("[MoMo IPN] Chữ ký không hợp lệ cho đơn: {$orderId}");
        }

        // 4. resultCode = 0 → Thanh toán thành công; khác 0 → Thất bại / Hủy
        $isPaid = $isValid && ((int) $resultCode === 0);

        Log::info("[MoMo IPN] Nhận callback", [
            'order_code'  => $orderId,
            'trans_id'    => $transId,
            'result_code' => $resultCode,
            'is_valid'    => $isValid,
            'is_paid'     => $isPaid,
        ]);

        return [
            'is_valid'   => $isValid,
            'is_paid'    => $isPaid,
            'order_code' => $orderId,
            'trans_id'   => (string) $transId,
            'message'    => $message,
        ];
    }

    // == 3. HELPER: Mock URL khi chưa cấu hình Sandbox (Demo / Test nhanh) ==

    private function mockPaymentResponse(string $orderCode, int $amount): array
    {
        return [
            'pay_url'     => "https://test-payment.momo.vn/mock?orderId={$orderCode}&amount={$amount}",
            'qr_code_url' => "https://api.qrserver.com/v1/create-qr-code/?data=MOMO-{$orderCode}&size=200x200",
            'request_id'  => $orderCode . '_mock',
        ];
    }
}
