<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    //1. [Role 1: Guest] Trả về cấu hình quyền hạn cho Khách vãng lai chưa đăng nhập
    public function guestSession(): JsonResponse
    {
        return response()->json([
            'status'  => 'success',
            'message' => 'Phiên truy cập dành cho Khách vãng lai (Guest).',
            'data'    => [
                'role' => [
                    'id'           => 1,
                    'name'         => Role::GUEST,
                    'display_name' => 'Khách vãng lai',
                ],
                'permissions'        => $this->getPermissionsByRole(Role::GUEST),
                'restricted_actions' => [
                    'place_order',
                    'subscribe_package',
                    'loyalty_points',
                    'submit_complaint',
                ],
            ],
        ], 200);
    }

    //2. [Role 2: Customer] Đăng ký tài khoản Khách hàng mới (Mã hóa mật khẩu Bcrypt)
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $customerRole = Role::where('name', Role::CUSTOMER)->firstOrFail();

        $user = User::create([
            'role_id'        => $customerRole->id,
            'full_name'      => $validated['full_name'],
            'email'          => $validated['email'],
            'phone'          => $validated['phone'],
            'password'       => $validated['password'], // Tự động mã hóa qua cast 'hashed' của User model
            'address'        => $validated['address'] ?? null,
            'latitude'       => $validated['latitude'] ?? null,
            'longitude'      => $validated['longitude'] ?? null,
            'loyalty_points' => 0,
            'is_active'      => true,
        ]);

        $user->load('role');

        // Tạo Sanctum Token đính kèm Ability của Customer
        $token = $user->createToken('organic_farm_token', ['role:' . Role::CUSTOMER])->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Đăng ký tài khoản khách hàng thành công.',
            'data'    => [
                'access_token' => $token,
                'token_type'   => 'Bearer',
                'redirect_to'  => $this->getRedirectPathByRole(Role::CUSTOMER),
                'user'         => $user,
                'permissions'  => $this->getPermissionsByRole(Role::CUSTOMER),
            ],
        ], 201);
    }

    //3. Đăng nhập & Kiểm tra quyền hạn cho 4 Roles (Customer, Farm Staff, Sales, Admin)
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::with('role')->where('email', $request->email)->first();

        // Kiểm tra email & mật khẩu đã mã hóa bằng Hash::check()
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Email hoặc mật khẩu không chính xác.',
            ], 401);
        }

        // Kiểm tra trạng thái hoạt động của tài khoản
        if (!$user->is_active) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên nông trại.',
            ], 403);
        }

        $roleName = $user->role->name;

        // Xóa các token cũ trên cùng thiết bị (tránh rác DB) và cấp Token mới theo Role
        $user->tokens()->delete();
        $token = $user->createToken('organic_farm_token', ["role:{$roleName}"])->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Đăng nhập thành công.',
            'data'    => [
                'access_token' => $token,
                'token_type'   => 'Bearer',
                'redirect_to'  => $this->getRedirectPathByRole($roleName),
                'user'         => $user,
                'permissions'  => $this->getPermissionsByRole($roleName),
            ],
        ], 200);
    }

    //4. [Admin Only] Tạo tài khoản cho nhân viên nội bộ (Farm Staff hoặc Sales)
    public function createStaffAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role_name' => ['required', 'in:farm_staff,sales'],
            'full_name' => ['required', 'string', 'max:150'],
            'email'     => ['required', 'email', 'unique:users,email'],
            'phone'     => ['required', 'string', 'max:20', 'unique:users,phone'],
            'password'  => ['required', 'string', 'min:8'],
            'address'   => ['nullable', 'string'],
        ]);

        $role = Role::where('name', $validated['role_name'])->firstOrFail();

        $staff = User::create([
            'role_id'        => $role->id,
            'full_name'      => $validated['full_name'],
            'email'          => $validated['email'],
            'phone'          => $validated['phone'],
            'password'       => $validated['password'],
            'address'        => $validated['address'] ?? 'Nông trại Organic',
            'loyalty_points' => 0,
            'is_active'      => true,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã khởi tạo tài khoản nhân viên nội bộ thành công.',
            'data'    => $staff->load('role'),
        ], 201);
    }

    //5. Lấy thông tin User đang đăng nhập (Me)
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        return response()->json([
            'status' => 'success',
            'data'   => [
                'user'        => $user,
                'permissions' => $this->getPermissionsByRole($user->role->name),
            ],
        ], 200);
    }

    //6. Đăng xuất (Thu hồi Token hiện tại)
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã đăng xuất và hủy phiên làm việc thành công.',
        ], 200);
    }

    //Phân tách quyền hạn chi tiết của từng Role theo đúng Đề bài
    private function getPermissionsByRole(string $roleName): array
    {
        return match ($roleName) {
            Role::ADMIN => [
                'full_system_access',
                'manage_staff_accounts',
                'manage_categories_and_products',
                'view_revenue_and_waste_analytics',
                'manage_batches',
                'manage_orders',
                'resolve_complaints',
            ],
            Role::FARM_STAFF => [
                // Chỉ truy cập mùa vụ, nhật ký, lô hàng, QR. KHÔNG có quyền xem doanh thu/khách hàng
                'manage_batches',
                'manage_farming_logs',
                'generate_qr_code',
                'record_waste',
                'upload_certification_docs',
            ],
            Role::SALES => [
                // Xử lý đơn hàng, điều phối giao nhận, giải quyết khiếu nại đổi trả
                'manage_orders',
                'dispatch_express_delivery',
                'configure_flash_sale',
                'resolve_complaints',
                'approve_refund_or_compensate',
                'record_waste',
            ],
            Role::CUSTOMER => [
                'view_products',
                'scan_qr_traceability',
                'place_single_order',
                'register_subscription',
                'use_loyalty_points',
                'submit_complaint',
            ],
            default => [ // Role::GUEST
                'view_products',
                'view_brand_story',
                'scan_qr_traceability',
                'view_farming_logs',
            ],
        };
    }

    //Gợi ý đường dẫn điều hướng màn hình trên React cho Người 4 & Người 5
    private function getRedirectPathByRole(string $roleName): string
    {
        return match ($roleName) {
            Role::ADMIN      => '/dashboard/admin/analytics',
            Role::FARM_STAFF => '/dashboard/farm-staff/batches',
            Role::SALES      => '/dashboard/sales/orders',
            Role::CUSTOMER   => '/customer/home',
            default          => '/',
        };
    }
}