<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\DB;

class EnsureResourceOwnership
{
    /**
     * Kiểm tra quyền sở hữu dữ liệu đơn hàng / khiếu nại của Khách hàng:
     * - Admin & Sales: Được phép xem và xử lý toàn bộ đơn hàng / khiếu nại.
     * - Farm Staff: KHÔNG ĐƯỢC PHÉP xem thông tin đơn hàng / khách hàng (Bảo mật theo đề bài).
     * - Customer: CHỈ ĐƯỢC PHÉP xem và thao tác trên đơn hàng / khiếu nại do chính mình tạo ra.
     *
     * Cách dùng trong routes/api.php: ->middleware('ownership:order') hoặc ->middleware('ownership:complaint')
     */
    public function handle(Request $request, Closure $next, string $resourceType = 'order'): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Bạn cần đăng nhập để thực hiện thao tác này (Unauthenticated).',
            ], 401);
        }

        $user->loadMissing('role');
        $roleName = $user->role?->name;

        // 1. Chặn tuyệt đối Farm Staff không được xem thông tin đơn hàng hoặc doanh thu
        if ($roleName === 'farm_staff') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Truy cập bị từ chối! Nhân viên Nông trại (Farm Staff) không được phép truy cập dữ liệu đơn hàng và khách hàng.',
            ], 403);
        }

        // 2. Admin và Sales có toàn quyền xem và điều phối đơn hàng / khiếu nại
        if (in_array($roleName, ['admin', 'sales'], true)) {
            return $next($request);
        }

        // 3. Nếu là Khách hàng (Customer), kiểm tra quyền sở hữu
        if ($roleName === 'customer') {
            // Lấy ID đơn hàng từ Route parameter hoặc Request Body
            $resourceId = $request->route('id') 
                       ?? $request->route('order_id') 
                       ?? $request->input('order_id');

            if ($resourceId) {
                if ($resourceType === 'order') {
                    $order = DB::table('orders')->where('id', $resourceId)->first();
                    if ($order && (int)$order->customer_id !== (int)$user->id) {
                        return response()->json([
                            'status'  => 'error',
                            'message' => 'Truy cập bị từ chối! Bạn không có quyền truy cập hoặc xem đơn hàng của khách hàng khác.',
                        ], 403);
                    }
                } elseif ($resourceType === 'complaint') {
                    $complaint = DB::table('complaints')->where('id', $resourceId)->first();
                    if ($complaint && (int)$complaint->customer_id !== (int)$user->id) {
                        return response()->json([
                            'status'  => 'error',
                            'message' => 'Truy cập bị từ chối! Bạn không có quyền xem hoặc can thiệp khiếu nại của khách hàng khác.',
                        ], 403);
                    }
                }
            }
        }

        return $next($request);
    }
}
