<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MoMoPaymentService
{
    protected string $partnerCode;
    protected string $accessKey;
    protected string $secretKey;
    protected string $endpoint;
    protected string $ipnUrl;
    protected string $redirectUrl;

    public function __construct()
    {
        $this->partnerCode = config('momo.partner_code', '');
        $this->accessKey = config('momo.access_key', '');
        $this->secretKey = config('momo.secret_key', '');
        $this->endpoint = config(
            'momo.endpoint',
            'https://test-payment.momo.vn/v2/gateway/api/create'
        );
        $this->ipnUrl = config(
            'momo.ipn_url',
            url('/api/v1/payments/momo/ipn-callback')
        );
        $this->redirectUrl = config(
            'momo.redirect_url',
            url('/payment/momo/result')
        );
    }

    /**
     * Tạo link thanh toán MoMo.
     */
    public function createPaymentLink(string $orderCode, float $amount): array
    {
        // Chưa cấu hình MoMo Sandbox thì sử dụng mock.
        if (
            empty($this->partnerCode) ||
            empty($this->accessKey) ||
            empty($this->secretKey)
        ) {
            Log::info("[MoMo] Chưa cấu hình Sandbox. Mock đơn: {$orderCode}");

            return $this->mockPaymentResponse($orderCode, (int) $amount);
        }

        $requestId = $orderCode . '_' . time();
        $orderInfo = "Thanh toán đơn hàng Nông Sản Hữu Cơ #{$orderCode}";
        $requestType = 'captureWallet';
        $extraData = '';

        // Tạo chữ ký HMAC-SHA256.
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

        $payload = [
            'partnerCode' => $this->partnerCode,
            'partnerName' => 'Organic Farm E-Commerce',
            'storeId' => 'OrganicFarmStore',
            'requestId' => $requestId,
            'amount' => (int) $amount,
            'orderId' => $orderCode,
            'orderInfo' => $orderInfo,
            'redirectUrl' => $this->redirectUrl,
            'ipnUrl' => $this->ipnUrl,
            'lang' => 'vi',
            'extraData' => $extraData,
            'requestType' => $requestType,
            'signature' => $signature,
        ];

        try {
            $response = Http::timeout(15)
                ->post($this->endpoint, $payload)
                ->json();

            if (
                isset($response['resultCode']) &&
                $response['resultCode'] === 0
            ) {
                Log::info("[MoMo] Tạo link thành công: {$orderCode}");

                return [
                    'status' => 'success',
                    'pay_url' => $response['payUrl'] ?? '',
                    'qr_code_url' => $response['qrCodeUrl'] ?? '',
                    'request_id' => $requestId,
                    'order_code' => $orderCode,
                    'amount' => (int) $amount,
                ];
            }

            Log::error("[MoMo] API Sandbox trả lỗi", [
                'order_code' => $orderCode,
                'result_code' => $response['resultCode'] ?? 'N/A',
                'message' => $response['message'] ?? 'Unknown',
            ]);

            return $this->mockPaymentResponse($orderCode, (int) $amount);

        } catch (\Exception $e) {
            Log::error(
                "[MoMo] Lỗi kết nối Sandbox: " . $e->getMessage()
            );

            return $this->mockPaymentResponse($orderCode, (int) $amount);
        }
    }

    /**
     * Xác thực IPN Callback từ MoMo.
     */
    public function verifyIpnCallback(array $ipnData): array
    {
        $partnerCode = $ipnData['partnerCode'] ?? '';
        $orderId = $ipnData['orderId'] ?? '';
        $requestId = $ipnData['requestId'] ?? '';
        $amount = $ipnData['amount'] ?? 0;
        $orderInfo = $ipnData['orderInfo'] ?? '';
        $orderType = $ipnData['orderType'] ?? '';
        $transId = $ipnData['transId'] ?? '';
        $resultCode = $ipnData['resultCode'] ?? -1;
        $message = $ipnData['message'] ?? '';
        $payType = $ipnData['payType'] ?? '';
        $responseTime = $ipnData['responseTime'] ?? '';
        $extraData = $ipnData['extraData'] ?? '';
        $receivedSig = $ipnData['signature'] ?? '';

        // Tái tạo chuỗi hash để xác thực chữ ký.
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

        // So sánh chữ ký.
        $isValid = hash_equals($expectedSig, $receivedSig);

        if (!$isValid) {
            Log::warning("[MoMo IPN] Chữ ký không hợp lệ: {$orderId}");
        }

        $isPaid = $isValid && ((int) $resultCode === 0);

        Log::info("[MoMo IPN] Callback", [
            'order_code' => $orderId,
            'trans_id' => $transId,
            'result_code' => $resultCode,
            'is_valid' => $isValid,
            'is_paid' => $isPaid,
        ]);

        return [
            'is_valid' => $isValid,
            'is_paid' => $isPaid,
            'order_code' => $orderId,
            'trans_id' => (string) $transId,
            'message' => $message,
        ];
    }

    /**
     * Mock URL khi chưa cấu hình Sandbox hoặc Sandbox gặp lỗi.
     */
    private function mockPaymentResponse(string $orderCode, int $amount): array
    {
        return [
            'status' => 'success',
            'order_code' => $orderCode,
            'amount' => $amount,
            'pay_url' => 'http://localhost:8000/api/v1/momo-mock-checkout?order_code='
                . urlencode($orderCode),
            'qr_code_url' => 'https://api.qrserver.com/v1/create-qr-code/?data=MOMO-'
                . urlencode($orderCode)
                . '&size=200x200',
            'request_id' => $orderCode . '_mock',
            'message' => 'Khoi tao thanh toan MoMo thanh cong',
        ];
    }
}
