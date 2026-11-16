<?php
namespace App\Http\Requests\Auth;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:150'],
            'email'     => ['required', 'string', 'email', 'max:150', 'unique:users,email'],
            'phone'     => ['required', 'string', 'regex:/^(0[3|5|7|8|9])+([0-9]{8})$/', 'unique:users,phone'],
            'password'  => ['required', 'string', 'min:8', 'confirmed'],
            'address'   => ['nullable', 'string'],
            'latitude'  => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ];
    }

    public function messages(): array
    {
        return [
            'full_name.required' => 'Họ và tên không được để trống.',
            'email.unique'       => 'Email này đã được sử dụng.',
            'phone.regex'        => 'Số điện thoại không đúng định dạng Việt Nam (10 chữ số).',
            'phone.unique'       => 'Số điện thoại này đã được đăng ký.',
            'password.min'       => 'Mật khẩu phải có ít nhất 8 ký tự.',
            'password.confirmed' => 'Mật khẩu xác nhận không khớp.',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'status'  => 'error',
            'message' => 'Dữ liệu đầu vào không hợp lệ.',
            'errors'  => $validator->errors()
        ], 422));
    }
}