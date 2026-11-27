<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Services\MediaUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function __construct(
        protected MediaUploadService $mediaUploadService
    ) {}

    /**
     * GET /api/v1/auth/profile
     * Lấy thông tin hồ sơ cá nhân của tài khoản đang đăng nhập.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        return response()->json([
            'status' => 'success',
            'data'   => [
                'user' => $user,
            ],
        ], 200);
    }

    /**
     * PUT /api/v1/auth/profile
     * Cập nhật thông tin cá nhân (chỉ Customer được phép chỉnh sửa avatar_url).
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        $validated = $request->validate([
            'full_name'  => ['required', 'string', 'max:150'],
            'phone'      => [
                'required',
                'string',
                'regex:/^(0[3|5|7|8|9])+([0-9]{8})$/',
                Rule::unique('users', 'phone')->ignore($user->id),
            ],
            'address'    => ['nullable', 'string', 'max:1000'],
            'latitude'   => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'  => ['nullable', 'numeric', 'between:-180,180'],
            'avatar_url' => [
                'nullable',
                'string',
                'max:500',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if ($value === null || $value === '') {
                        return;
                    }
                    $isHttp = filter_var($value, FILTER_VALIDATE_URL) !== false
                        && preg_match('/^https?:\/\//i', $value) === 1;
                    $isLocalUpload = str_starts_with($value, '/uploads/')
                        || str_starts_with($value, '/storage/');
                    if (!$isHttp && !$isLocalUpload) {
                        $fail('Link ảnh đại diện phải bắt đầu bằng http://, https:// hoặc đường dẫn hợp lệ.');
                    }
                },
            ],
        ], [
            'full_name.required' => 'Họ và tên không được để trống.',
            'phone.required'     => 'Số điện thoại không được để trống.',
            'phone.regex'        => 'Số điện thoại không đúng định dạng Việt Nam (10 chữ số).',
            'phone.unique'       => 'Số điện thoại này đã được sử dụng bởi tài khoản khác.',
        ]);

        $user->full_name = trim($validated['full_name']);
        $user->phone     = trim($validated['phone']);
        $user->address   = isset($validated['address']) ? trim((string) $validated['address']) : null;

        if (array_key_exists('latitude', $validated)) {
            $user->latitude = $validated['latitude'];
        }
        if (array_key_exists('longitude', $validated)) {
            $user->longitude = $validated['longitude'];
        }

        // Chỉ khách hàng (customer) mới chỉnh sửa hình đại diện
        if ($user->hasRole(Role::CUSTOMER) && array_key_exists('avatar_url', $validated)) {
            $avatarUrl = trim((string) ($validated['avatar_url'] ?? ''));
            $user->avatar_url = $avatarUrl !== '' ? $avatarUrl : null;
        }

        $user->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Cập nhật thông tin cá nhân thành công.',
            'data'    => [
                'user' => $user->fresh('role'),
            ],
        ], 200);
    }

    /**
     * POST /api/v1/auth/profile/avatar
     * Tải ảnh đại diện từ máy lên (dành riêng cho Khách hàng).
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ], [
            'avatar.required' => 'Vui lòng chọn tệp hình ảnh.',
            'avatar.image'    => 'Tệp tải lên phải là hình ảnh hợp lệ.',
            'avatar.mimes'    => 'Chỉ hỗ trợ ảnh JPG, JPEG, PNG hoặc WEBP.',
            'avatar.max'      => 'Dung lượng ảnh đại diện tối đa 5MB.',
        ]);

        $user = $request->user();
        $url = $this->mediaUploadService->uploadMedia($request->file('avatar'), 'avatars');

        $user->avatar_url = $url;
        $user->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Cập nhật ảnh đại diện thành công.',
            'data'    => [
                'avatar_url' => $url,
                'user'       => $user->fresh('role'),
            ],
        ], 200);
    }

    /**
     * PUT /api/v1/auth/change-password
     * Đổi mật khẩu cho tất cả các vai trò đã đăng nhập.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'current_password.required' => 'Vui lòng nhập mật khẩu hiện tại.',
            'new_password.required'     => 'Vui lòng nhập mật khẩu mới.',
            'new_password.min'          => 'Mật khẩu mới phải có ít nhất 8 ký tự.',
            'new_password.confirmed'    => 'Mật khẩu xác nhận không khớp.',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Mật khẩu hiện tại không chính xác.',
            ], 422);
        }

        $user->password = $validated['new_password'];
        $user->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Đổi mật khẩu thành công.',
        ], 200);
    }
}
