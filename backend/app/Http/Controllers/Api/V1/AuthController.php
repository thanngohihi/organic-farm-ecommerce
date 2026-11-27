<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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

    //3b. Quên mật khẩu nhanh theo Số điện thoại hoặc Email (Customer, Farm Staff, Sales)
    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string', 'max:150'],
        ], [
            'identifier.required' => 'Vui lòng nhập Số điện thoại hoặc Email.',
        ]);

        $identifier = trim((string) $validated['identifier']);

        $user = User::query()
            ->with('role')
            ->where(function ($q) use ($identifier) {
                $q->where('email', $identifier)
                    ->orWhere('phone', $identifier);
            })
            ->first();

        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy tài khoản nào khớp với Số điện thoại hoặc Email này.',
            ], 404);
        }

        $roleName = $user->role?->name;
        if (!in_array($roleName, [Role::CUSTOMER, Role::FARM_STAFF, Role::SALES], true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tính năng lấy lại mật khẩu nhanh chỉ áp dụng cho Khách hàng, Farm Staff và Sales.',
            ], 403);
        }

        if (!$user->is_active) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tài khoản này đang bị vô hiệu hóa. Vui lòng liên hệ Quản trị viên.',
            ], 403);
        }

        // Mật khẩu trong DB được băm Bcrypt một chiều nên cấp mới mật khẩu ngẫu nhiên và hiển thị ngay
        $newPassword = 'Farm' . random_int(1000, 9999) . Str::upper(Str::random(2));
        $user->password = $newPassword;
        $user->tokens()->delete();
        $user->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã cấp lại mật khẩu mới thành công!',
            'data'    => [
                'full_name'    => $user->full_name,
                'email'        => $user->email,
                'phone'        => $user->phone,
                'role'         => $roleName,
                'role_label'   => $user->role?->display_name ?? $roleName,
                'new_password' => $newPassword,
            ],
        ], 200);
    }

    //4. [Admin Only] Danh sách, Tạo & Xóa tài khoản nhân viên nội bộ (Farm Staff hoặc Sales)
    public function staffAccounts(): JsonResponse
    {
        $staff = User::query()
            ->with('role:id,name,display_name')
            ->whereHas('role', fn ($q) => $q->whereIn('name', [Role::FARM_STAFF, Role::SALES]))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (User $u) => [
                'id'         => $u->id,
                'full_name'  => $u->full_name,
                'email'      => $u->email,
                'phone'      => $u->phone,
                'address'    => $u->address,
                'role'       => $u->role?->name,
                'is_active'  => (bool) $u->is_active,
                'is_default' => in_array($u->email, ['staff@organicfarm.vn', 'sales@organicfarm.vn'], true),
                'created_at' => $u->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => $staff,
        ], 200);
    }

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

    public function destroyStaffAccount(Request $request, int $id): JsonResponse
    {
        return $this->deleteManagedUser($request, $id, [Role::FARM_STAFF, Role::SALES]);
    }

    // 4b. [Admin Only] Danh sách Khách hàng, Khóa/Mở khóa & Xóa tài khoản
    public function customerAccounts(): JsonResponse
    {
        $customers = User::query()
            ->with('role:id,name,display_name')
            ->withCount(['orders', 'subscriptions'])
            ->whereHas('role', fn ($q) => $q->where('name', Role::CUSTOMER))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (User $u) => [
                'id'                  => $u->id,
                'full_name'           => $u->full_name,
                'email'               => $u->email,
                'phone'               => $u->phone,
                'address'             => $u->address,
                'role'                => $u->role?->name ?? Role::CUSTOMER,
                'loyalty_points'      => (int) $u->loyalty_points,
                'orders_count'        => (int) ($u->orders_count ?? 0),
                'subscriptions_count' => (int) ($u->subscriptions_count ?? 0),
                'is_active'           => (bool) $u->is_active,
                'is_default'          => false,
                'created_at'          => $u->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => $customers,
        ], 200);
    }

    public function toggleAccountActive(Request $request, int $id): JsonResponse
    {
        $target = User::query()->with('role')->find($id);
        if (!$target) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy tài khoản.',
            ], 404);
        }

        if ($target->id === $request->user()->id || $target->role?->name === Role::ADMIN || in_array($target->email, ['staff@organicfarm.vn', 'sales@organicfarm.vn', 'admin@organicfarm.vn'], true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không thể khóa tài khoản quản trị hoặc tài khoản mặc định của hệ thống.',
            ], 422);
        }

        $target->is_active = !$target->is_active;
        $target->save();

        if (!$target->is_active) {
            $target->tokens()->delete();
        }

        return response()->json([
            'status'  => 'success',
            'message' => $target->is_active
                ? "Đã mở khóa tài khoản \"{$target->full_name}\"."
                : "Đã khóa tài khoản \"{$target->full_name}\".",
            'data'    => [
                'id'        => $target->id,
                'is_active' => (bool) $target->is_active,
            ],
        ], 200);
    }

    public function destroyAccount(Request $request, int $id): JsonResponse
    {
        return $this->deleteManagedUser($request, $id, [Role::CUSTOMER, Role::FARM_STAFF, Role::SALES]);
    }

    private function deleteManagedUser(Request $request, int $id, array $allowedRoles): JsonResponse
    {
        $target = User::query()->with('role')->find($id);
        if (!$target) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy tài khoản.',
            ], 404);
        }

        if ($target->id === $request->user()->id || in_array($target->email, ['staff@organicfarm.vn', 'sales@organicfarm.vn', 'admin@organicfarm.vn'], true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không thể xóa tài khoản quản trị hoặc tài khoản mặc định của hệ thống.',
            ], 422);
        }

        if (!in_array($target->role?->name, $allowedRoles, true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không được phép xóa tài khoản có vai trò này.',
            ], 422);
        }

        try {
            $target->tokens()->delete();
            $target->delete();
        } catch (QueryException $e) {
            $msg = $target->role?->name === Role::CUSTOMER
                ? 'Tài khoản khách hàng này đã có đơn hàng trong lịch sử nên không thể xóa vĩnh viễn. Vui lòng dùng nút Khóa tài khoản để vô hiệu hóa!'
                : 'Tài khoản nhân viên này đã tạo dữ liệu lô hàng, nhật ký hoặc hao hụt nên không thể xóa vĩnh viễn. Vui lòng dùng nút Khóa tài khoản để vô hiệu hóa!';

            return response()->json([
                'status'  => 'error',
                'message' => $msg,
            ], 422);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã xóa tài khoản khỏi hệ thống thành công.',
        ], 200);
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