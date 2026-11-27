<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\CustomerVoucher;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\MediaUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CustomerAccountController extends Controller
{
    private const VOUCHERS = [
        1 => [
            'id'              => 1,
            'name'            => 'Voucher Miễn Phí Vận Chuyển 20k',
            'cost'            => 200,
            'type'            => 'free_ship',
            'discount_amount' => 20000,
            'prefix'          => 'SHIP',
            'desc'            => 'Áp dụng cho đơn hàng nông sản từ 150.000đ',
        ],
        2 => [
            'id'              => 2,
            'name'            => 'Voucher Giảm 10% Tổng Đơn Hàng',
            'cost'            => 300,
            'type'            => 'percent_discount',
            'discount_amount' => 0,
            'prefix'          => 'SALE',
            'desc'            => 'Giảm tối đa 50.000đ cho đơn hàng rau củ sạch',
        ],
        3 => [
            'id'              => 3,
            'name'            => 'Voucher Tặng 1kg Cà Chua Cherry VietGAP',
            'cost'            => 400,
            'type'            => 'free_gift',
            'discount_amount' => 0,
            'prefix'          => 'GIFT',
            'desc'            => 'Đổi điểm nhận quà nông sản tươi sạch tại vườn',
        ],
    ];

    public function __construct(
        protected MediaUploadService $mediaUploadService
    ) {}

    /**
     * GET /api/v1/customer/transactions
     * Lấy lịch sử đơn hàng, giao dịch thanh toán, gói định kỳ và trạng thái khiếu nại.
     */
    public function transactions(Request $request): JsonResponse
    {
        $user = $request->user();

        $orders = Order::query()
            ->with([
                'items.product:id,name,sku,unit,thumbnail_url',
                'items.batch:id,batch_code,expiry_date',
                'complaints' => fn ($q) => $q->orderByDesc('created_at'),
            ])
            ->where('customer_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        $subscriptions = DB::table('subscriptions')
            ->where('customer_id', $user->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($sub) {
                if (isset($sub->delivery_days) && is_string($sub->delivery_days)) {
                    $decoded = json_decode($sub->delivery_days, true);
                    $sub->delivery_days = is_array($decoded) ? $decoded : [];
                }
                return $sub;
            });

        $paidTotal = (float) $orders
            ->filter(fn (Order $o) => $o->payment_status === 'da_thanh_toan' || $o->order_status === 'hoan_thanh')
            ->sum('total_amount');

        $complaintCount = Complaint::query()
            ->where('customer_id', $user->id)
            ->count();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'summary' => [
                    'total_orders'    => $orders->count(),
                    'paid_orders'     => $orders->where('payment_status', 'da_thanh_toan')->count(),
                    'total_spent'     => $paidTotal,
                    'complaint_count' => $complaintCount,
                    'loyalty_points'  => (int) $user->loyalty_points,
                ],
                'orders'        => $orders,
                'subscriptions' => $subscriptions,
            ],
        ], 200);
    }

    /**
     * GET /api/v1/customer/complaints
     * Lấy danh sách khiếu nại đã gửi của khách hàng.
     */
    public function myComplaints(Request $request): JsonResponse
    {
        $complaints = Complaint::query()
            ->with('order:id,order_code,total_amount,order_status,created_at')
            ->where('customer_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $complaints,
        ], 200);
    }

    /**
     * POST /api/v1/complaints (và alias /api/v1/customer/complaints)
     * Lưu khiếu nại kèm ảnh/video bằng chứng vào bảng complaints.
     */
    public function storeComplaint(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_code'  => ['required', 'string', 'max:50'],
            'reason'      => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'media'       => ['required', 'array', 'min:1', 'max:5'],
            'media.*'     => ['file', 'mimes:jpg,jpeg,png', 'max:5120'],
        ], [
            'order_code.required' => 'Vui lòng cung cấp mã đơn hàng cần khiếu nại.',
            'reason.required'     => 'Vui lòng chọn lý do khiếu nại.',
            'media.required'      => 'Bắt buộc phải tải lên ít nhất 1 hình ảnh minh chứng (.jpg, .png).',
            'media.min'           => 'Bắt buộc phải tải lên ít nhất 1 hình ảnh minh chứng (.jpg, .png).',
            'media.max'           => 'Tối đa 5 hình ảnh minh chứng.',
            'media.*.mimes'       => 'Chỉ hỗ trợ hình ảnh định dạng .jpg hoặc .png.',
            'media.*.max'         => 'Mỗi hình ảnh minh chứng phải nhỏ hơn 5MB.',
        ]);

        $user = $request->user();

        $order = Order::query()
            ->where('order_code', trim($validated['order_code']))
            ->where('customer_id', $user->id)
            ->first();

        if (!$order) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy đơn hàng "' . trim($validated['order_code']) . '" thuộc tài khoản của bạn.',
            ], 404);
        }

        if (!in_array($order->order_status, ['hoan_thanh', 'da_giao_bu'], true)) {
            $msg = $order->order_status === 'da_huy'
                ? 'Đơn hàng đã bị hủy, không thể tạo yêu cầu khiếu nại.'
                : 'Chỉ có thể gửi khiếu nại sau khi đơn hàng đã giao tới nơi và bạn đã nhấn "Đã nhận hàng".';

            return response()->json([
                'status'  => 'error',
                'message' => $msg,
            ], 422);
        }

        if ($order->order_status === 'hoan_thanh' && $order->updated_at && $order->updated_at->lt(now()->subHours(24))) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Đã quá thời hạn 24 giờ kể từ lúc hoàn thành đơn hàng nông sản tươi, hệ thống tự động từ chối yêu cầu đổi trả.',
            ], 422);
        }

        $evidenceUrls = [];
        if ($request->hasFile('media')) {
            $evidenceUrls = $this->mediaUploadService->uploadMultiple(
                $request->file('media'),
                'complaints'
            );
        }

        $description = trim((string) ($validated['description'] ?? ''));
        $fullReason = $description !== ''
            ? trim($validated['reason']) . ' — ' . $description
            : trim($validated['reason']);

        $complaint = Complaint::query()->create([
            'order_id'            => $order->id,
            'customer_id'         => $user->id,
            'reason'              => $fullReason,
            'evidence_media_urls' => $evidenceUrls,
            'resolution_type'     => 'cho_xu_ly',
            'refund_amount'       => 0,
            'status'              => 'cho_tiep_nhan',
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Gửi khiếu nại thành công! Bộ phận CSKH sẽ sớm phản hồi.',
            'data'    => $complaint->load('order:id,order_code,total_amount,order_status,created_at'),
        ], 201);
    }

    /**
     * GET /api/v1/customer/loyalty
     * Trả về thông tin điểm thưởng Loyalty thực tế từ MySQL.
     */
    public function loyalty(Request $request): JsonResponse
    {
        $user = $request->user();
        $points = (int) $user->loyalty_points;

        $paidOrders = Order::query()
            ->where('customer_id', $user->id)
            ->where(function ($q) {
                $q->where('payment_status', 'da_thanh_toan')
                  ->orWhere('order_status', 'hoan_thanh');
            })
            ->get();

        $lifetimeEarnedPoints = (int) $paidOrders->sum(
            fn (Order $order) => (int) floor((float) $order->total_amount / 10000)
        );

        // Xét hạng thành viên dựa trên mức cao nhất giữa điểm hiện có và tổng điểm đã tích lũy
        // để khách mua nhiều luôn lên hạng và không bị tụt hạng khi đổi voucher
        $tierPoints = max($points, $lifetimeEarnedPoints);
        [$tier, $nextTier, $pointsNeeded] = $this->resolveLoyaltyTier($tierPoints);

        $orders = Order::query()
            ->where('customer_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $myVouchers = CustomerVoucher::query()
            ->with(['giftProduct:id,name,unit', 'order:id,order_code'])
            ->where('customer_id', $user->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $history = [];
        foreach ($orders as $order) {
            $ts = $order->created_at?->timestamp ?? 0;
            if ((float) $order->loyalty_discount > 0) {
                $usedPoints = (int) round((float) $order->loyalty_discount / 1000);
                if ($usedPoints > 0) {
                    $history[] = [
                        'id'      => 'use-' . $order->id,
                        'type'    => 'redeem',
                        'title'   => "Áp dụng ưu đãi/điểm trên đơn #{$order->order_code}",
                        'date'    => $order->created_at?->format('d/m/Y H:i') ?? '',
                        'points'  => '-' . $usedPoints,
                        'sort_ts' => $ts,
                    ];
                }
            }
            if ($order->payment_status === 'da_thanh_toan' || $order->order_status === 'hoan_thanh') {
                $earned = (int) floor((float) $order->total_amount / 10000);
                if ($earned > 0) {
                    $history[] = [
                        'id'      => 'earn-' . $order->id,
                        'type'    => 'earn',
                        'title'   => "Tích điểm từ đơn #{$order->order_code}",
                        'date'    => $order->created_at?->format('d/m/Y H:i') ?? '',
                        'points'  => '+' . $earned,
                        'sort_ts' => $ts,
                    ];
                }
            }
        }

        foreach ($myVouchers as $voucher) {
            $history[] = [
                'id'      => 'voucher-' . $voucher->id,
                'type'    => 'redeem',
                'title'   => "Đổi {$voucher->voucher_name} (Mã: {$voucher->voucher_code})",
                'date'    => $voucher->created_at?->format('d/m/Y H:i') ?? '',
                'points'  => '-' . (int) $voucher->points_cost,
                'sort_ts' => $voucher->created_at?->timestamp ?? 0,
            ];
        }

        usort($history, fn (array $a, array $b) => ($b['sort_ts'] ?? 0) <=> ($a['sort_ts'] ?? 0));
        $history = array_map(function (array $item) {
            unset($item['sort_ts']);
            return $item;
        }, $history);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'member_tier'             => $tier,
                'total_points'            => $points,
                'lifetime_points'         => $tierPoints,
                'point_value_vnd'         => $points * 100,
                'next_tier'               => $nextTier,
                'points_needed_next_tier' => $pointsNeeded,
                'vouchers'                => array_values(self::VOUCHERS),
                'my_vouchers'             => $myVouchers,
                'redeemed_voucher_ids'    => [],
                'history'                 => $history,
            ],
        ], 200);
    }

    /**
     * POST /api/v1/customer/loyalty/redeem
     * Đổi điểm thưởng lấy voucher và lưu thật vào bảng customer_vouchers.
     */
    public function redeemLoyalty(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'voucher_id' => ['required', 'integer'],
        ]);

        $voucherTemplate = self::VOUCHERS[$validated['voucher_id']] ?? null;
        if (!$voucherTemplate) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Voucher không tồn tại.',
            ], 404);
        }

        $result = DB::transaction(function () use ($request, $voucherTemplate) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);

            if ((int) $user->loyalty_points < $voucherTemplate['cost']) {
                return null;
            }

            $user->loyalty_points = (int) $user->loyalty_points - $voucherTemplate['cost'];
            $user->save();

            $giftProduct = null;
            if ($voucherTemplate['type'] === 'free_gift') {
                $giftProduct = Product::query()
                    ->where('is_active', true)
                    ->where('name', 'like', '%Cà Chua%')
                    ->first()
                    ?? Product::query()->where('is_active', true)->first();
            }

            $voucherCode = $voucherTemplate['prefix'] . '-' . strtoupper(Str::random(6));

            $createdVoucher = CustomerVoucher::query()->create([
                'customer_id'         => $user->id,
                'voucher_template_id' => $voucherTemplate['id'],
                'voucher_code'        => $voucherCode,
                'voucher_name'        => $voucherTemplate['name'],
                'voucher_type'        => $voucherTemplate['type'],
                'points_cost'         => $voucherTemplate['cost'],
                'discount_amount'     => $voucherTemplate['discount_amount'],
                'gift_product_id'     => $giftProduct?->id,
                'status'              => 'chua_dung',
            ]);

            $createdVoucher->load('giftProduct:id,name,unit');

            return [
                'voucher_code'     => $voucherCode,
                'voucher_name'     => $voucherTemplate['name'],
                'voucher_type'     => $voucherTemplate['type'],
                'remaining_points' => (int) $user->loyalty_points,
                'voucher'          => $createdVoucher,
                'message'          => "Đổi thành công \"{$voucherTemplate['name']}\"! Mã voucher: {$voucherCode} (đã lưu vào Túi Voucher để áp dụng khi đặt hàng).",
            ];
        });

        if (!$result) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Điểm tích lũy hiện tại không đủ để đổi voucher này.',
            ], 422);
        }

        return response()->json([
            'status'  => 'success',
            'message' => $result['message'],
            'data'    => $result,
        ], 200);
    }

    private function resolveLoyaltyTier(int $points): array
    {
        if ($points >= 3000) {
            return ['Kim Cương', 'Kim Cương (Tối đa)', 0];
        }
        if ($points >= 1500) {
            return ['Vàng', 'Kim Cương', 3000 - $points];
        }
        if ($points >= 500) {
            return ['Bạc', 'Vàng', 1500 - $points];
        }

        return ['Đồng', 'Bạc', 500 - $points];
    }
}
