<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Kiểm tra xem User đang đăng nhập có nằm trong danh sách các Role được phép hay không.
     * Cách dùng trong routes/api.php: ->middleware('role:admin,farm_staff')
     */
    public function handle(Request $request, Closure $next, string ...$allowedRoles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Bạn cần đăng nhập để thực hiện thao tác này (Unauthenticated).',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tài khoản của bạn đã bị khóa.',
            ], 403);
        }

        $user->loadMissing('role');
        $currentRoleName    = $user->role?->name;
        $currentRoleDisplay = $user->role?->display_name ?? 'Không xác định';

        if (!in_array($currentRoleName, $allowedRoles, true)) {
            return response()->json([
                'status'  => 'error',
                'message' => "Truy cập bị từ chối! Vai trò [{$currentRoleDisplay}] không được phép truy cập vào chức năng này. Quyền yêu cầu: [" . implode(', ', $allowedRoles) . "].",
            ], 403);
        }

        return $next($request);
    }
}