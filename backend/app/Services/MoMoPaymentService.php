<?php

namespace App\Services;

class MoMoPaymentService
{
    public function createPaymentLink(string $orderCode, float $amount): array
    {
        return [
            'status' => 'success',
            'order_code' => $orderCode,
            'amount' => $amount,
            'pay_url' => 'http://localhost:8000/api/v1/momo-mock-checkout',
            'message' => 'Khoi tao thanh toan MoMo thanh cong'
        ];
    }
}
